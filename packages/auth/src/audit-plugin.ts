import { db, schema } from "@mulai-plus/db";
import type { BetterAuthPlugin } from "better-auth";

export const auditPlugin = (): BetterAuthPlugin => {
  return {
    id: "audit-plugin",
    hooks: {
      after: [
        {
          matcher: (context) => {
            return ["sign-in", "sign-up", "sign-out"].some((path) => context.path.endsWith(path));
          },
          handler: async (c) => {
            const ctx = c as any;
            try {
              const { path, request } = ctx;

              let userId: string | null = null;

              // Try to extract user from response if available
              const responseData = ctx.returned;

              if (responseData && typeof responseData === "object") {
                if ("user" in responseData) {
                  userId = (responseData as any).user?.id;
                } else if ("session" in responseData) {
                  userId = (responseData as any).session?.userId;
                }
              }

              // If not in response, maybe we have a session in context (e.g. sign-out)
              if (!userId && ctx.session) {
                userId = ctx.session.user.id;
              }

              // Parse User Agent and IP
              const userAgent = request?.headers?.get("user-agent") || null;
              const ipAddress = request?.headers?.get("x-forwarded-for") || null;

              if (userId) {
                await db.insert(schema.auditLog).values({
                  action: path.split("/").pop() || path,
                  resource: "auth",
                  userId: userId,
                  details: {
                    path,
                    method: request?.method,
                  },
                  ipAddress: typeof ipAddress === "string" ? ipAddress : null,
                  userAgent: userAgent,
                });
              }
            } catch (error) {
              console.error("Audit logging failed:", error);
            }
          },
        },
      ],
    },
  };
};
