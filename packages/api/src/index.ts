import { db, schema } from "@better-auth-admin/db";
import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const auditMiddleware = o.middleware(async ({ context, next, path, ...rest }) => {
  const result = await next({});
  const input = (rest as { input?: unknown }).input;

  if (context.session?.user) {
    try {
      await db.insert(schema.auditLog).values({
        action: (path as string[]).join(".") || "unknown",
        resource: "api",
        userId: context.session.user.id,
        details: {
          input,
        },
        ipAddress: context.ip,
        userAgent: context.userAgent,
      });
    } catch (e) {
      console.error("Failed to log audit", e);
    }
  }

  return result;
});

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth).use(auditMiddleware);
