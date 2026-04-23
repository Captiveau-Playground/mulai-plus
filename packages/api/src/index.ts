import { db, schema } from "@mulai-plus/db";
import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const auditMiddleware = o.middleware(async ({ context, next, path, ...rest }) => {
  const result = await next({});
  const input = (rest as { input?: unknown }).input;

  try {
    await db.insert(schema.auditLog).values({
      action: (path as string[]).join(".") || "unknown",
      resource: "api",
      userId: context.session?.user?.id || null,
      details: {
        input,
      },
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });
  } catch (e) {
    console.error("Failed to log audit", e);
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

const requireRole = (allowedRoles: string[]) =>
  o.middleware(async ({ context, next }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const userRole = context.session.user.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new ORPCError("FORBIDDEN", {
        message: `Role '${userRole || "unknown"}' is not allowed to access this resource. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    return next({
      context: {
        session: context.session,
      },
    });
  });

export const protectedProcedure = publicProcedure.use(requireAuth).use(auditMiddleware);

export const adminProcedure = protectedProcedure.use(requireRole(["admin"]));

export const programManagerProcedure = protectedProcedure.use(requireRole(["program_manager"]));

export const adminOrProgramManagerProcedure = protectedProcedure.use(requireRole(["admin", "program_manager"]));

export * from "./lib/email-templates";
export * from "./lib/unosend";
