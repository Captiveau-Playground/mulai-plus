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
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
