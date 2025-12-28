import { db, eq } from "@better-auth-admin/db";
import * as schema from "@better-auth-admin/db/schema/auth";
import { env } from "@better-auth-admin/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";
import { auditPlugin } from "./audit-plugin";
import { ac, getRoles } from "./permissions";

const roles = await getRoles();

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
  plugins: [
    admin({
      ac,
      defaultRole: "student",
      adminRoles: ["admin"],
      adminUserIds: ["xZe00ndF70nX03JnDfb6F5YIKBKDfb1V"],
      roles: roles,
    }),
    username(),
    nextCookies(),
    auditPlugin(),
  ],
  callbacks: {
    session: async ({ session, user }: { session: any; user: any }) => {
      const [roleData] = await db
        .select()
        .from(schema.role)
        .where(eq(schema.role.id, user.role || "student"));

      return {
        ...session,
        user: {
          ...session.user,
          permissions: roleData?.permissions || [],
        },
      };
    },
  },
});
