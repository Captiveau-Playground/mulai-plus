import { randomUUID } from "node:crypto";
import { and, count, db, desc, eq, gt } from "@better-auth-admin/db";
import {
  attachmentTypeEnum,
  programAttachment,
  programBatchMentor,
  programSession,
  sessionStatusEnum,
  sessionTypeEnum,
} from "@better-auth-admin/db/schema/programs";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const programActivitiesRouter = {
  mentor: {
    getStats: protectedProcedure.handler(async ({ context }) => {
      const userId = context.session.user.id;
      const now = new Date();

      // Total Sessions
      const [totalSessions] = await db
        .select({ count: count() })
        .from(programSession)
        .where(eq(programSession.mentorId, userId));

      // Upcoming Sessions
      const [upcomingSessions] = await db
        .select({ count: count() })
        .from(programSession)
        .where(
          and(
            eq(programSession.mentorId, userId),
            eq(programSession.status, "scheduled"),
            gt(programSession.startsAt, now),
          ),
        );

      // Completed Sessions
      const [completedSessions] = await db
        .select({ count: count() })
        .from(programSession)
        .where(and(eq(programSession.mentorId, userId), eq(programSession.status, "completed")));

      // Assigned Batches
      const [assignedBatches] = await db
        .select({ count: count() })
        .from(programBatchMentor)
        .where(eq(programBatchMentor.userId, userId));

      return {
        totalSessions: totalSessions?.count ?? 0,
        upcomingSessions: upcomingSessions?.count ?? 0,
        completedSessions: completedSessions?.count ?? 0,
        assignedBatches: assignedBatches?.count ?? 0,
      };
    }),
  },
  session: {
    list: protectedProcedure.input(z.object({ batchId: z.string() })).handler(async ({ input }) => {
      const items = await db.query.programSession.findMany({
        where: eq(programSession.batchId, input.batchId),
        with: {
          mentor: true,
          student: true,
          attachments: true,
        },
        orderBy: [desc(programSession.week), desc(programSession.startsAt)],
      });
      return items;
    }),

    mySessions: protectedProcedure
      .input(
        z.object({
          batchId: z.string().optional(),
          status: z.enum(sessionStatusEnum.enumValues).optional(),
          limit: z.number().default(50),
        }),
      )
      .handler(async ({ input, context }) => {
        const conditions = [eq(programSession.mentorId, context.session.user.id)];

        if (input.batchId) {
          conditions.push(eq(programSession.batchId, input.batchId));
        }
        if (input.status) {
          conditions.push(eq(programSession.status, input.status));
        }

        const items = await db.query.programSession.findMany({
          where: and(...conditions),
          with: {
            batch: {
              with: {
                program: true,
              },
            },
            student: true,
            attachments: true,
          },
          orderBy: [desc(programSession.startsAt)],
          limit: input.limit,
        });
        return items;
      }),

    upsert: protectedProcedure
      .input(
        z.object({
          id: z.string().optional(),
          batchId: z.string(),
          week: z.number(),
          type: z.enum(sessionTypeEnum.enumValues),
          status: z.enum(sessionStatusEnum.enumValues).default("scheduled"),
          startsAt: z.string().transform((str) => new Date(str)),
          durationMinutes: z.number().default(60),
          mentorId: z.string(),
          studentId: z.string().optional(), // Optional for group sessions
          meetingLink: z.string().optional(),
          recordingLink: z.string().optional(),
          notes: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...data } = input;

        if (id) {
          await db.update(programSession).set(data).where(eq(programSession.id, id));
          return { id };
        }
        const newId = randomUUID();
        await db.insert(programSession).values({
          id: newId,
          ...data,
        });
        return { id: newId };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(programSession).where(eq(programSession.id, input.id));
      return { success: true };
    }),
  },

  attachment: {
    list: protectedProcedure
      .input(
        z.object({
          batchId: z.string(),
          week: z.number().optional(),
          sessionId: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const conditions = [eq(programAttachment.batchId, input.batchId)];
        if (input.week !== undefined) {
          conditions.push(eq(programAttachment.week, input.week));
        }
        if (input.sessionId) {
          conditions.push(eq(programAttachment.sessionId, input.sessionId));
        }

        const items = await db.query.programAttachment.findMany({
          where: and(...conditions),
          orderBy: [desc(programAttachment.createdAt)],
        });
        return items;
      }),

    create: protectedProcedure
      .input(
        z.object({
          batchId: z.string(),
          week: z.number().optional(),
          sessionId: z.string().optional(),
          name: z.string().min(1),
          type: z.enum(attachmentTypeEnum.enumValues),
          url: z.string().url(),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();
        await db.insert(programAttachment).values({
          id,
          ...input,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          type: z.enum(attachmentTypeEnum.enumValues).optional(),
          url: z.string().url().optional(),
          week: z.number().optional(),
          sessionId: z.string().optional().nullable(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...data } = input;
        await db.update(programAttachment).set(data).where(eq(programAttachment.id, id));
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(programAttachment).where(eq(programAttachment.id, input.id));
      return { success: true };
    }),
  },
};
