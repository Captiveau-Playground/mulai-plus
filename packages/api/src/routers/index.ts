import { count, db, eq } from "@better-auth-admin/db";
import { session, user } from "@better-auth-admin/db/schema/auth";
import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  getAdminStats: protectedProcedure.handler(async () => {
    const [totalUsers] = await db.select({ count: count() }).from(user);
    const [activeSessions] = await db.select({ count: count() }).from(session);
    const [bannedUsers] = await db.select({ count: count() }).from(user).where(eq(user.banned, true));

    return {
      totalUsers: totalUsers?.count || 0,
      activeSessions: activeSessions?.count || 0,
      bannedUsers: bannedUsers?.count || 0,
    };
  }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
