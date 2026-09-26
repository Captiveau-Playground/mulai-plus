import { createContext } from "@mulai-plus/api/context-core";
import { appRouter } from "@mulai-plus/api/routers/index";
import type { createAuth } from "@mulai-plus/auth/create-auth";
import { env } from "@mulai-plus/env/server";
import { uploadRouter } from "@mulai-plus/r2";
import { initR2Client } from "@mulai-plus/r2/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { rateLimiter } from "hono-rate-limiter";
import { kvRpcCache } from "./kv-cache";

export type CreateAppOptions = {
  /**
   * Error reporter for oRPC interceptors.
   * Bun/VPS passes `(e) => Sentry.captureException(e)`; Workers can pass a
   * `@sentry/cloudflare` capture (or nothing → console only).
   */
  captureError?: (error: unknown) => void;
  /**
   * Auth instance — REQUIRED (keeps this module pg-free).
   * Bun/VPS: `auth` from `@mulai-plus/auth`; Workers: `createWorkerAuth(db)`.
   */
  authInstance: Awaited<ReturnType<typeof createAuth>>;
};

/**
 * Build the Hono app — shared by the Bun/VPS runtime (index.ts) and the
 * Cloudflare Workers runtime (worker.ts).
 *
 * Runtime-specific concerns stay OUT of this file:
 * - Sentry init / restart endpoint / setInterval cron / server export → index.ts (Bun)
 * - Cron Trigger `scheduled` / Workers export / Hyperdrive → worker.ts
 */
export function createApp(options: CreateAppOptions) {
  const captureError = options.captureError ?? ((error: unknown) => console.error(error));
  const authInstance = options.authInstance;

  // Initialize R2 client
  initR2Client();

  const app = new Hono();

  // Mount R2 upload routes FIRST (before middleware catches all)
  app.route("/api/upload", uploadRouter);

  // Force reload for api router changes
  app.use(logger());

  // Rate limiter untuk API publik (pddikti)
  const limiter = rateLimiter({
    windowMs: 60 * 1000, // 1 menit
    limit: 60, // 60 request per menit per IP
    standardHeaders: "draft-6",
    keyGenerator: (c) => c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
    message: { status: 429, message: "Too many requests. Please slow down." },
  });

  // Apply rate limiter hanya ke endpoint publik pddikti
  app.use("/rpc/pddikti/public*", limiter);

  app.use(
    "/*",
    cors({
      origin: env.CORS_ORIGIN,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-session-id", "x-api-key", "x-user-id"],
      credentials: true,
    }),
  );

  app.on(["POST", "GET"], "/api/auth/*", (c) => authInstance.handler(c.req.raw));

  const apiHandler = new OpenAPIHandler(appRouter, {
    plugins: [
      new OpenAPIReferencePlugin({
        schemaConverters: [new ZodToJsonSchemaConverter()],
      }),
    ],
    interceptors: [
      onError((error) => {
        console.error(error);
        captureError(error);
      }),
    ],
  });

  const rpcHandler = new RPCHandler(appRouter, {
    interceptors: [
      onError((error) => {
        console.error(error);
        captureError(error);
      }),
    ],
  });

  // ── Proxy: AI Service ───────────────────────────────────────
  //   /ai/*          → proxied to AI service at /api/*
  //   /ai/admin/*    → requires admin role, then proxied to /api/admin/*
  //   /ai/chat       → proxied with user context for rate limiting
  if (env.AI_SERVICE_URL) {
    const requireAdmin = async (c: any, next: any) => {
      try {
        const session = await authInstance.api.getSession({
          headers: c.req.raw.headers,
        });
        if (!session?.user || session.user.role !== "admin") {
          return c.json({ error: "Forbidden. Admin access required." }, 403);
        }
      } catch {
        return c.json({ error: "Unauthorized. Please log in." }, 401);
      }
      await next();
    };

    const fetchWithTimeout = (target: string, init: RequestInit, ms: number) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      return fetch(target, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
    };

    // Plan A: panggilan AI via SERVICE BINDING (internal, tanpa key) bila ada;
    // fallback URL (local dev / VPS). Tetap diberi timeout.
    const aiFetch = (c: any, target: string, init: RequestInit, ms: number) => {
      const svc = c.env?.AI_SERVICE as
        | { fetch?(input: string | URL, init?: RequestInit): Promise<Response> }
        | undefined;
      if (svc?.fetch) {
        return svc.fetch(target, { ...init, signal: AbortSignal.timeout(ms) });
      }
      return fetchWithTimeout(target, init, ms);
    };

    // Bungkus call AI: connect-refused/timeout → JSON 503 yang jelas (bukan crash).
    const safeAi = async (c: any, fn: () => Promise<Response>, hint?: string) => {
      try {
        return await fn();
      } catch (err) {
        const cause = (err as Error).message || "koneksi ditolak";
        console.error("[ai-proxy] AI service unreachable:", cause);
        return c.json(
          {
            error: `Layanan AI tidak dapat dijangkau. Mulai worker AI lokal: cd apps/ai && bun run dev:ai (atau di stack: bun dev). Detail: ${cause}`,
            hint: hint ?? "ai-offline",
          },
          503,
        );
      }
    };

    // /ai/status → status terakhir dari uptime-checker (KV_CACHE), untuk monitor/alert
    app.get("/ai/status", async (c: any) => {
      const kv = (c.env as { KV_CACHE?: { get(key: string, t: string): Promise<unknown> } }).KV_CACHE;
      if (!kv) return c.json({ enabled: false });
      try {
        const last = (await kv.get("ai:status:last", "json")) ?? null;
        return c.json({ enabled: true, last });
      } catch {
        return c.json({ enabled: true, last: null });
      }
    });

    // Forward tanpa encoding header (browser decode gagal bila header gzip + body sudah apa adanya)
    const cleanHeaders = (resp: Response): Headers => {
      const h = new Headers(resp.headers);
      h.delete("content-encoding");
      h.delete("content-length");
      return h;
    };

    // Proxy /ai/* membangun response sendiri → header CORS dari middleware hilang.
    // Gabungkan lagi (ACAO sesuai origin middleware + expose minimal).
    const proxyHeaders = (c: any, resp: Response): Record<string, string> => {
      const headers: Record<string, string> = {};
      for (const [key, val] of c.res.headers.entries()) {
        if (key.toLowerCase().startsWith("access-control-")) headers[key] = val;
      }
      const acao = resp.headers.get("access-control-allow-origin");
      if (!headers["Access-Control-Allow-Origin"] && acao) headers["Access-Control-Allow-Origin"] = acao;
      return headers;
    };

    // /ai/health → status AI worker via binding (aman, tanpa LLM)
    app.get("/ai/health", async (c: any) => {
      // Absolute URL — konsisten dgn /ai/chat (binding mengikutsertakan target internal)
      const target = `${env.AI_SERVICE_URL}/health`;
      const resp = await safeAi(
        c,
        () => aiFetch(c, target, { headers: { "Content-Type": "application/json" } }, 15_000),
        "ai-offline",
      );
      if (resp.status === 503) return resp;
      const merged: Record<string, string> = Object.fromEntries(cleanHeaders(resp));
      for (const [k, v] of Object.entries(proxyHeaders(c, resp))) if (v) merged[k] = v;
      return c.newResponse(resp.body, { status: resp.status as any, headers: merged });
    });

    // Admin-only routes: analytics, stats, admin endpoints
    app.all("/ai/admin/*", requireAdmin, async (c) => {
      const qs = new URLSearchParams(c.req.query() as Record<string, string>).toString();
      const target = `${env.AI_SERVICE_URL}${c.req.path.replace("/ai", "/api")}${qs ? `?${qs}` : ""}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (env.AI_API_KEY) {
        headers.Authorization = `Bearer ${env.AI_API_KEY}`;
      }
      // Forward session ID for audit
      const sessionId = c.req.header("x-session-id");
      if (sessionId) {
        headers["x-session-id"] = sessionId;
      }

      if (c.req.method === "GET") {
        const resp = await fetchWithTimeout(target, { headers }, 30_000);
        const merged: Record<string, string> = Object.fromEntries(cleanHeaders(resp));
        for (const [k, v] of Object.entries(proxyHeaders(c, resp))) if (v) merged[k] = v;
        return c.newResponse(resp.body, {
          status: resp.status as any,
          headers: merged,
        });
      }

      const body = await c.req.json();
      const resp = await fetchWithTimeout(
        target,
        {
          method: c.req.method,
          headers,
          body: JSON.stringify(body),
        },
        120_000,
      );
      return c.newResponse(resp.body, resp);
    });

    // Public chat & history routes — forward user context for rate limiting
    app.all("/ai/*", async (c) => {
      const qs = new URLSearchParams(c.req.query() as Record<string, string>).toString();
      const target = `${env.AI_SERVICE_URL}${c.req.path.replace("/ai", "/api")}${qs ? `?${qs}` : ""}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (env.AI_API_KEY) {
        headers.Authorization = `Bearer ${env.AI_API_KEY}`;
      }

      // Forward user info — prioritas:
      // 1. session cookie autentikasi (paling aman) → user.id
      // 2. server-to-server (Authorization = AI_API_KEY) → percaya x-user-id client
      // 3. same-site web origin → percaya x-user-id client (dev: cookie cross-port tak
      //    ikut di fetch 3001→3000; dipakai utk rate-limit/quota/session — risiko kecil)
      const clientUid = c.req.header("x-user-id");
      let uid: string | null = null;
      try {
        const session = await authInstance.api.getSession({
          headers: c.req.raw.headers,
        });
        if (session?.user?.id) uid = session.user.id;
      } catch {}
      if (!uid && clientUid) {
        const origin = c.req.header("origin") || "";
        const ae = (env.WEB_ORIGINS || "http://localhost:3001,https://mulaiplus.id,https://staging.mulaiplus.id")
          .split(",")
          .map((o: string) => o.trim())
          .filter(Boolean);
        const saHeader = c.req.header("authorization") || "";
        const sameSite = ae.includes(origin) || (!!env.AI_API_KEY && saHeader === `Bearer ${env.AI_API_KEY}`);
        if (sameSite) uid = clientUid;
      }
      if (uid) headers["x-user-id"] = uid;

      const sessionId = c.req.header("x-session-id");
      if (sessionId) {
        headers["x-session-id"] = sessionId;
      }

      if (c.req.method === "GET") {
        const resp = await safeAi(c, () => fetchWithTimeout(target, { headers }, 30_000), "ai-offline");
        if (resp.status === 503) return resp;
        const merged: Record<string, string> = Object.fromEntries(cleanHeaders(resp));
        for (const [k, v] of Object.entries(proxyHeaders(c, resp))) if (v) merged[k] = v;
        return c.newResponse(resp.body, {
          status: resp.status as any,
          headers: merged,
        });
      }

      const body = await c.req.json();
      const resp = await safeAi(
        c,
        () =>
          aiFetch(
            c,
            target,
            {
              method: c.req.method,
              headers,
              body: JSON.stringify(body),
            },
            120_000,
          ),
        "ai-offline",
      );
      if (resp.status === 503) return resp;

      // Handle SSE streaming responses
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        // Merge CORS headers from middleware with SSE headers
        const corsHeaders: Record<string, string> = {};
        for (const [key, val] of c.res.headers.entries()) {
          if (key.toLowerCase().startsWith("access-control-")) {
            corsHeaders[key] = val;
          }
        }
        return c.newResponse(resp.body, {
          status: resp.status as any,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            Connection: "keep-alive",
          },
        });
      }

      const data = await resp.json();
      return c.json(data, resp.status as Parameters<typeof c.json>[1]);
    });
  }

  app.use("/rpc/*", (c, next) => kvRpcCache(c as any, next));

  app.use("/*", async (c, next) => {
    const context = await createContext({ context: c, auth: authInstance });

    const rpcResult = await rpcHandler.handle(c.req.raw, {
      prefix: "/rpc",
      context: context,
    });

    if (rpcResult.matched) {
      return c.newResponse(rpcResult.response.body, rpcResult.response);
    }

    const apiResult = await apiHandler.handle(c.req.raw, {
      prefix: "/api-reference",
      context: context,
    });

    if (apiResult.matched) {
      return c.newResponse(apiResult.response.body, apiResult.response);
    }

    await next();
  });

  // Mount R2 upload routes
  app.get("/", (c) => {
    return c.text("OK");
  });

  return app;
}
