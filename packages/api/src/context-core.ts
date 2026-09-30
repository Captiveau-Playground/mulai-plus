import type { createAuth } from "@mulai-plus/auth/create-auth";
import type { Context as HonoContext } from "hono";

export type AuthInstance = Awaited<ReturnType<typeof createAuth>>;

/**
 * `c.executionCtx` getter THROWS ("This context has no ExecutionContext") di
 * Cloudflare Workers ketika context tidak dibuat dari scheduled/fetch dgn
 * ExecutionContext — akses harus di-guard, bukan sekedar optional chaining.
 */
function safeExecutionCtx(context: unknown): { waitUntil(p: Promise<unknown>): void } | undefined {
  try {
    const c2 = context as { executionCtx?: { waitUntil(p: Promise<unknown>): void } };
    return c2.executionCtx;
  } catch {
    return undefined;
  }
}

function safeEnv(context: unknown): Record<string, unknown> | undefined {
  try {
    const c2 = context as { env?: Record<string, unknown> };
    return c2.env;
  } catch {
    return undefined;
  }
}

/**
 * DB-free core (no default auth) so it can be bundled for Cloudflare Workers.
 * The auth instance is always injected explicitly.
 */
export async function createContext({ context, auth }: { context: HonoContext; auth: AuthInstance }) {
  // HEMAT DB: tanpa cookie session tidak perlu query better-auth (churn koneksi/CPU).
  let session: Awaited<ReturnType<AuthInstance["api"]["getSession"]>> | null = null;
  const cookieHeader = context.req.raw.headers.get("cookie") ?? "";
  if (cookieHeader.includes("session_token")) {
    session = await auth.api.getSession({
      headers: context.req.raw.headers,
    });
  }
  return {
    session,
    headers: context.req.raw.headers,
    ip: context.req.header("x-forwarded-for") || context.req.header("x-real-ip"),
    userAgent: context.req.header("user-agent"),
    /** Cloudflare Workers executionCtx — dipakai utk notifikasi fire-and-forget. */
    executionCtx: safeExecutionCtx(context),
    /** Env bindings — akses webhook dsb tanpa import env/server (pg-free). */
    env: safeEnv(context),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
