import { db } from "@better-auth-admin/db";
import * as schema from "@better-auth-admin/db/schema/auth";
import { env } from "@better-auth-admin/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: "student",
      adminRole: "admin",
      adminUserIds: ["xZe00ndF70nX03JnDfb6F5YIKBKDfb1V"],
    }),
  ],
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
});
