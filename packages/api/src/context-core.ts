import type { createAuth } from "@mulai-plus/auth/create-auth";
import type { Context as HonoContext } from "hono";

export type AuthInstance = Awaited<ReturnType<typeof createAuth>>;

/**
 * DB-free core (no default auth) so it can be bundled for Cloudflare Workers.
 * The auth instance is always injected explicitly.
 */
export async function createContext({ context, auth }: { context: HonoContext; auth: AuthInstance }) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    session,
    headers: context.req.raw.headers,
    ip: context.req.header("x-forwarded-for") || context.req.header("x-real-ip"),
    userAgent: context.req.header("user-agent"),
    /** Cloudflare Workers executionCtx — dipakai utk notifikasi fire-and-forget. */
    executionCtx: (context as any).executionCtx as { waitUntil(p: Promise<unknown>): void } | undefined,
    /** Env bindings — akses webhook dsb tanpa import env/server (pg-free). */
    env: (context as any).env as Record<string, unknown> | undefined,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
