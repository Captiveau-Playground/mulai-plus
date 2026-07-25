import { db, schema as dbSchema, eq } from "@mulai-plus/db";
import * as schema from "@mulai-plus/db/schema/auth";
import { env } from "@mulai-plus/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";
import { auditPlugin } from "./audit-plugin";
import { ac, getAdminUserIds, getRoles } from "./permissions";

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

const roles = await getRoles();
const adminUserIds = await getAdminUserIds();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
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
        await db.insert(dbSchema.auditLog).values({
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
    auditPlugin(),
  ],
  callbacks: {
    session: async ({ session, user }: { session: unknown; user: unknown }) => {
      // @ts-expect-error - session and user types are inferred
      const userRole = user.role || "student";
      const [roleData] = await db.select().from(schema.role).where(eq(schema.role.id, userRole));

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
