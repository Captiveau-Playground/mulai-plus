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
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-session-id", "x-api-key"],
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
        return c.newResponse(resp.body, resp);
      }

      const body = await c.req.json();
      const resp = await fetchWithTimeout(
        target,
        {
          method: c.req.method,
          headers,
          body: JSON.stringify(body),
        },
        60_000,
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

      // Forward user info for rate limiting
      try {
        const session = await authInstance.api.getSession({
          headers: c.req.raw.headers,
        });
        if (session?.user?.id) {
          headers["x-user-id"] = session.user.id;
        }
      } catch {}

      const sessionId = c.req.header("x-session-id");
      if (sessionId) {
        headers["x-session-id"] = sessionId;
      }

      if (c.req.method === "GET") {
        const resp = await fetchWithTimeout(target, { headers }, 30_000);
        return c.newResponse(resp.body, resp);
      }

      const body = await c.req.json();
      const resp = await fetchWithTimeout(
        target,
        {
          method: c.req.method,
          headers,
          body: JSON.stringify(body),
        },
        60_000,
      );

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
          status: resp.status,
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
