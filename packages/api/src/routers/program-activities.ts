import { randomUUID } from "node:crypto";
import { and, count, db, desc, eq, gt } from "@mulai-plus/db";
import { user } from "@mulai-plus/db/schema/auth";
import {
  attachmentTypeEnum,
  attendanceStatusEnum,
  programAttachment,
  programAttachmentRequest,
  programAttendance,
  programBatch,
  programBatchMentor,
  programParticipant,
  programSession,
  sessionStatusEnum,
  sessionTypeEnum,
} from "@mulai-plus/db/schema/programs";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { sendNotification } from "../lib/notification";

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

    getBatchStudents: protectedProcedure.input(z.object({ batchId: z.string() })).handler(async ({ input }) => {
      const students = await db.query.programParticipant.findMany({
        where: eq(programParticipant.batchId, input.batchId),
        with: {
          user: true,
        },
      });
      return students.map((p) => p.user);
    }),

    getBatchAttendance: protectedProcedure
      .input(z.object({ batchId: z.string() }))
      .handler(async ({ input, context }) => {
        const userId = context.session.user.id;
        // Verify mentor assignment
        const [assignment] = await db
          .select()
          .from(programBatchMentor)
          .where(and(eq(programBatchMentor.batchId, input.batchId), eq(programBatchMentor.userId, userId)));

        if (!assignment) {
          throw new Error("Unauthorized: You are not assigned to this batch");
        }

        const batch = await db.query.programBatch.findFirst({
          where: eq(programBatch.id, input.batchId),
          with: {
            program: {
              with: {
                syllabus: true,
              },
            },
          },
        });

        if (!batch) {
          throw new Error("Batch not found");
        }

        const participants = await db.query.programParticipant.findMany({
          where: eq(programParticipant.batchId, input.batchId),
          with: {
            user: true,
          },
        });

        const attendance = await db.query.programAttendance.findMany({
          where: eq(programAttendance.batchId, input.batchId),
        });

        return {
          batch,
          participants: participants.map((p) => p.user),
          attendance,
        };
      }),

    updateBatchAttendance: protectedProcedure
      .input(
        z.object({
          batchId: z.string(),
          userId: z.string(),
          week: z.number(),
          status: z.enum(attendanceStatusEnum.enumValues),
          notes: z.string().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const mentorId = context.session.user.id;
        // Verify mentor assignment
        const [assignment] = await db
          .select()
          .from(programBatchMentor)
          .where(and(eq(programBatchMentor.batchId, input.batchId), eq(programBatchMentor.userId, mentorId)));

        if (!assignment) {
          throw new Error("Unauthorized: You are not assigned to this batch");
        }

        const existing = await db.query.programAttendance.findFirst({
          where: and(
            eq(programAttendance.batchId, input.batchId),
            eq(programAttendance.userId, input.userId),
            eq(programAttendance.week, input.week),
          ),
        });

        if (existing) {
          await db
            .update(programAttendance)
            .set({
              status: input.status,
              notes: input.notes,
            })
            .where(eq(programAttendance.id, existing.id));
        } else {
          await db.insert(programAttendance).values({
            id: randomUUID(),
            batchId: input.batchId,
            userId: input.userId,
            week: input.week,
            status: input.status,
            notes: input.notes,
          });
        }

        return { success: true };
      }),

    createOneOnOne: protectedProcedure
      .input(
        z.object({
          batchId: z.string(),
          studentId: z.string(),
          week: z.number(),
          startsAt: z.string().transform((str) => new Date(str)),
          durationMinutes: z.number().default(60),
          meetingLink: z.string().optional(),
          notes: z.string().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const newId = randomUUID();
        await db.insert(programSession).values({
          id: newId,
          batchId: input.batchId,
          mentorId: context.session.user.id,
          studentId: input.studentId,
          week: input.week,
          type: "one_on_one",
          status: "scheduled",
          startsAt: input.startsAt,
          durationMinutes: input.durationMinutes,
          meetingLink: input.meetingLink,
          notes: input.notes,
        });
        return { id: newId };
      }),

    updateOneOnOne: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          startsAt: z
            .string()
            .transform((str) => new Date(str))
            .optional(),
          durationMinutes: z.number().optional(),
          meetingLink: z.string().optional(),
          recordingLink: z.string().optional(),
          notes: z.string().optional(),
          status: z.enum(sessionStatusEnum.enumValues).optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const { id, ...data } = input;

        // Verify ownership
        const [existing] = await db
          .select()
          .from(programSession)
          .where(and(eq(programSession.id, id), eq(programSession.mentorId, context.session.user.id)));

        if (!existing) {
          throw new Error("Session not found or unauthorized");
        }

        await db.update(programSession).set(data).where(eq(programSession.id, id));
        return { success: true };
      }),

    deleteOneOnOne: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
      const [existing] = await db
        .select()
        .from(programSession)
        .where(and(eq(programSession.id, input.id), eq(programSession.mentorId, context.session.user.id)));

      if (!existing) {
        throw new Error("Session not found or unauthorized");
      }

      await db.delete(programSession).where(eq(programSession.id, input.id));
      return { success: true };
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
      .handler(async ({ input, context }) => {
        const requestId = randomUUID();
        await db.insert(programAttachmentRequest).values({
          id: requestId,
          batchId: input.batchId,
          action: "create",
          data: input,
          requestedBy: context.session.user.id,
          status: "pending",
        });

        // Notify Admins
        const admins = await db.select().from(user).where(eq(user.role, "admin"));
        await Promise.all(
          admins.map((admin) =>
            sendNotification({
              userId: admin.id,
              title: "New Attachment Request",
              message: `${context.session.user.name} requested to add "${input.name}"`,
              type: "info",
              link: "/admin/programs",
            }),
          ),
        );

        return { requestId, status: "pending" };
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
      .handler(async ({ input, context }) => {
        const { id, ...data } = input;

        const existing = await db.query.programAttachment.findFirst({
          where: eq(programAttachment.id, id),
        });

        if (!existing) {
          throw new Error("Attachment not found");
        }

        const requestId = randomUUID();
        await db.insert(programAttachmentRequest).values({
          id: requestId,
          batchId: existing.batchId,
          attachmentId: id,
          action: "update",
          data: data,
          requestedBy: context.session.user.id,
          status: "pending",
        });

        // Notify Admins
        const admins = await db.select().from(user).where(eq(user.role, "admin"));
        await Promise.all(
          admins.map((admin) =>
            sendNotification({
              userId: admin.id,
              title: "Update Attachment Request",
              message: `${context.session.user.name} requested to update "${existing.name}"`,
              type: "info",
              link: "/admin/programs",
            }),
          ),
        );

        return { requestId, status: "pending" };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
      const existing = await db.query.programAttachment.findFirst({
        where: eq(programAttachment.id, input.id),
      });

      if (!existing) {
        throw new Error("Attachment not found");
      }

      const requestId = randomUUID();
      await db.insert(programAttachmentRequest).values({
        id: requestId,
        batchId: existing.batchId,
        attachmentId: input.id,
        action: "delete",
        data: {},
        requestedBy: context.session.user.id,
        status: "pending",
      });

      // Notify Admins
      const admins = await db.select().from(user).where(eq(user.role, "admin"));
      await Promise.all(
        admins.map((admin) =>
          sendNotification({
            userId: admin.id,
            title: "Delete Attachment Request",
            message: `${context.session.user.name} requested to delete "${existing.name}"`,
            type: "info",
            link: "/admin/programs",
          }),
        ),
      );

      return { requestId, status: "pending" };
    }),

    myRequests: protectedProcedure.input(z.object({ batchId: z.string() })).handler(async ({ input, context }) => {
      return await db.query.programAttachmentRequest.findMany({
        where: and(
          eq(programAttachmentRequest.batchId, input.batchId),
          eq(programAttachmentRequest.requestedBy, context.session.user.id),
        ),
        orderBy: [desc(programAttachmentRequest.createdAt)],
        with: {
          attachment: true,
        },
      });
    }),
  },
};
