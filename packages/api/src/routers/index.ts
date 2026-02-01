import { count, db, desc, eq, sql } from "@better-auth-admin/db";
import { permission, role, session, user } from "@better-auth-admin/db/schema/auth";
import { program, programApplication } from "@better-auth-admin/db/schema/programs";
import type { RouterClient } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";
import { auditRouter } from "./audit";
import { lmsRouter } from "./lms";
import { notificationRouter } from "./notification";
import { paymentsRouter } from "./payments";
import { programActivitiesRouter } from "./program-activities";
import { programsRouter } from "./programs";
import { settingsRouter } from "./settings";
import { testimonialsRouter } from "./testimonials";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  settings: settingsRouter,
  testimonials: testimonialsRouter,
  lms: lmsRouter,
  programs: programsRouter,
  programActivities: programActivitiesRouter,
  payments: paymentsRouter,
  audit: auditRouter,
  notification: notificationRouter,

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
    const [totalRoles] = await db.select({ count: count() }).from(role);
    const [totalPermissions] = await db.select({ count: count() }).from(permission);

    const usersByRole = await db
      .select({
        role: user.role,
        count: count(),
      })
      .from(user)
      .groupBy(user.role);

    const recentUsers = await db.select().from(user).orderBy(desc(user.createdAt)).limit(5);

    const recentApplications = await db
      .select({
        id: programApplication.id,
        user: {
          name: user.name,
          email: user.email,
          image: user.image,
        },
        program: {
          name: program.name,
        },
        status: programApplication.status,
        createdAt: programApplication.createdAt,
      })
      .from(programApplication)
      .leftJoin(user, eq(programApplication.userId, user.id))
      .leftJoin(program, eq(programApplication.programId, program.id))
      .orderBy(desc(programApplication.createdAt))
      .limit(5);

    return {
      totalUsers: totalUsers?.count ?? 0,
      activeSessions: activeSessions?.count ?? 0,
      bannedUsers: bannedUsers?.count ?? 0,
      totalRoles: totalRoles?.count ?? 0,
      totalPermissions: totalPermissions?.count ?? 0,
      usersByRole,
      recentUsers,
      recentApplications,
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
          id: z.string().min(1),
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
            updatedAt: new Date(),
          })
          .where(eq(role.id, input.id));
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(role).where(eq(role.id, input.id));
      return { success: true };
    }),
  },
  user: {
    myPermissions: protectedProcedure.handler(async ({ context }) => {
      if (!context.session?.user) return [];
      const userRole = context.session.user.role || "student";
      const [roleData] = await db.select().from(role).where(eq(role.id, userRole));
      return roleData?.permissions || [];
    }),
    listStudents: protectedProcedure.handler(async () => {
      const students = await db.query.user.findMany({
        where: eq(user.role, "student"),
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });
      return students;
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
