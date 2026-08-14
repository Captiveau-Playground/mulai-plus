import type { db } from "@mulai-plus/db";
import { auditLog } from "@mulai-plus/db/schema/audit";
import * as schema from "@mulai-plus/db/schema/auth";
import { env } from "@mulai-plus/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { auditPlugin } from "./audit-plugin";
import { ac, getAdminUserIds, getRoles } from "./permissions-core";

// ─── Cookie domain ────────────────────────────────────────────────
// Session cookie harus bisa dipake bareng frontend & API di subdomain berbeda.
// Kalau env COOKIE_DOMAIN diset, pake itu. Fallback: ekstrak dari BETTER_AUTH_URL.
function resolveCookieDomain(): string | undefined {
  if (env.COOKIE_DOMAIN) return env.COOKIE_DOMAIN;
  try {
    const url = new URL(env.BETTER_AUTH_URL);
    const host = url.hostname;
    if (host === "localhost" || host === "127.0.0.1") return undefined;
    const parts = host.split(".");
    if (parts.length >= 2) return `.${parts.slice(-2).join(".")}`;
    return `.${host}`;
  } catch {
    return undefined;
  }
}

/**
 * Build the Better Auth instance bound to a specific database client.
 *
 * - Bun/VPS runtime: `createAuth(db)` (see `@mulai-plus/auth` index).
 * - Cloudflare Workers: `createAuth(workerDb)` (see `@mulai-plus/auth/worker`).
 *
 * This module is pg-free (type-only `@mulai-plus/db` import) so it can be
 * bundled for Workers without dragging in node-postgres.
 */
export async function createAuth(database: typeof db) {
  const roles = await getRoles(database);
  const adminUserIds = await getAdminUserIds(database);

  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: {
        ...schema,
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        role: schema.role,
        permission: schema.permission,
      },
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        prompt: "select_account consent",
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    advanced: {
      cookiePrefix: "mulaiplus",
      cookies: {
        session: {
          attributes: {
            domain: resolveCookieDomain(),
            sameSite: "none",
            secure: true,
          },
        },
      },
    },
    rateLimit: {
      enabled: true,
      window: 10,
      max: 100,
      storage: "memory",
    },
    logger: {
      level: "warn",
      log: async (level, message, ...args) => {
        try {
          await database.insert(auditLog).values({
            action: `system_log_${level}`,
            resource: "better-auth-system",
            details: {
              message,
              args,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (e) {
          console.error("Failed to write to audit log", e);
        }
      },
    },
    plugins: [
      admin({
        ac,
        defaultRole: "student",
        adminRoles: ["admin"],
        adminUserIds: adminUserIds,
        roles: roles,
      }),
      username(),
      nextCookies(),
      auditPlugin(database),
    ],
    callbacks: {
      session: async ({ session, user }: { session: unknown; user: unknown }) => {
        // @ts-expect-error - session and user types are inferred
        const userRole = user.role || "student";
        const [roleData] = await database.select().from(schema.role).where(eq(schema.role.id, userRole));

        return {
          // @ts-expect-error - session type
          ...session,
          user: {
            // @ts-expect-error - session.user type
            ...session.user,
            permissions: roleData?.permissions || [],
          },
        };
      },
    },
  });
}
