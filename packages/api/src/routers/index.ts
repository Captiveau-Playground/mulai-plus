import { count, db, desc, eq, sql } from "@mulai-plus/db";
import { permission, role, session, user } from "@mulai-plus/db/schema/auth";
import { program, programApplication } from "@mulai-plus/db/schema/programs";

import { systemSettings } from "@mulai-plus/db/schema/settings";
import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure } from "../index";
import { aiRouter } from "./ai";
import { auditRouter } from "./audit";
import { articlesRouter, authorsRouter, categoriesRouter, mediaRouter, newsletterRouter, tagsRouter } from "./cms";
import { emailAdminRouter } from "./email-admin";
import { esignRouter } from "./esign";
import { feedbackRouter } from "./feedback";
import { hermesRouter } from "./hermes";
import { lmsRouter } from "./lms";
import { newsletterAdminRouter } from "./newsletter-admin";
import { notificationRouter } from "./notification";
import { paymentsRouter } from "./payments";
import { pddiktiRouter } from "./pddikti";
import { programActivitiesRouter } from "./program-activities";
import { programsRouter } from "./programs";
import { settingsRouter } from "./settings";
import { shortLinksRouter } from "./short-links";
import { testimonialsRouter } from "./testimonials";
import { userRouter } from "./user";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  user: userRouter,
  settings: settingsRouter,
  features: {
    get: publicProcedure.handler(async () => {
      try {
        const setting = await db.query.systemSettings.findFirst({
          where: eq(systemSettings.key, "feature_flags"),
        });
        if (setting) {
          return setting.value as { chatbot_enabled: boolean };
        }
      } catch {
        // DB unavailable
      }
      return { chatbot_enabled: process.env.CHATBOT_ENABLED === "true" };
    }),
    set: adminProcedure
      .input(
        z.object({
          flags: z.record(z.string(), z.boolean()),
        }),
      )
      .handler(async ({ input }) => {
        const { flags } = input;
        const existing = await db.query.systemSettings.findFirst({
          where: eq(systemSettings.key, "feature_flags"),
        });
        if (existing) {
          await db
            .update(systemSettings)
            .set({ value: flags as any, updatedAt: new Date() })
            .where(eq(systemSettings.key, "feature_flags"));
        } else {
          await db.insert(systemSettings).values({
            key: "feature_flags",
            value: flags as any,
            description: "Runtime feature flags",
          });
        }
        return { success: true, flags };
      }),
  },
  testimonials: testimonialsRouter,
  lms: lmsRouter,
  programs: programsRouter,
  programActivities: programActivitiesRouter,
  payments: paymentsRouter,
  audit: auditRouter,
  email: emailAdminRouter,
  esign: esignRouter,
  shortLinks: shortLinksRouter,
  notification: notificationRouter,
  newsletter: newsletterAdminRouter,
  feedback: feedbackRouter,
  pddikti: pddiktiRouter,
  ai: aiRouter,
  cms: {
    articles: articlesRouter,
    categories: categoriesRouter,
    tags: tagsRouter,
    authors: authorsRouter,
    media: mediaRouter,
    newsletter: newsletterRouter,
    hermes: hermesRouter,
  },

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
