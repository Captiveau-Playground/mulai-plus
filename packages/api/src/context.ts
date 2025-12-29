import { auth } from "@better-auth-admin/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
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
