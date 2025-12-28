import { count, db, eq, sql } from "@better-auth-admin/db";
import { permission, role, session, user } from "@better-auth-admin/db/schema/auth";
import type { RouterClient } from "@orpc/server";
import { z } from "zod";
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
  role: {
    list: protectedProcedure.handler(async () => {
      return await db.select().from(role);
    }),
    listPermissions: protectedProcedure.handler(async () => {
      return await db.select().from(permission);
    }),
    create: protectedProcedure
      .input(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          description: z.string().optional(),
          permissions: z.array(z.string()),
        }),
      )
      .handler(async ({ input }) => {
        await db.insert(role).values(input);
        return { success: true };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1),
          description: z.string().optional(),
          permissions: z.array(z.string()),
        }),
      )
      .handler(async ({ input }) => {
        await db
          .update(role)
          .set({
            name: input.name,
            description: input.description,
            permissions: input.permissions,
          })
          .where(eq(role.id, input.id));
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(role).where(eq(role.id, input.id));
      return { success: true };
    }),
  },
  permission: {
    list: protectedProcedure.handler(async () => {
      return await db.select().from(permission);
    }),
    create: protectedProcedure
      .input(
        z.object({
          id: z.string().min(1),
          description: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        await db.insert(permission).values(input);
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.transaction(async (tx) => {
        await tx.delete(permission).where(eq(permission.id, input.id));
        // Remove the permission from all roles
        await tx.update(role).set({
          permissions: sql`array_remove(${role.permissions}, ${input.id})`,
        });
      });
      return { success: true };
    }),
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
