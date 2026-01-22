import { randomUUID } from "node:crypto";
import { and, count, db, desc, eq, isNull } from "@better-auth-admin/db";
import { user } from "@better-auth-admin/db/schema/auth";
import {
  program,
  programApplication,
  programMentor,
  programParticipant,
  programSyllabus,
} from "@better-auth-admin/db/schema/programs";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const programsRouter = {
  admin: {
    list: protectedProcedure
      .input(
        z
          .object({
            limit: z.number().default(50),
            offset: z.number().default(0),
            status: z.string().optional(),
          })
          .optional(),
      )
      .handler(async ({ input }) => {
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;

        const conditions = [isNull(program.deletedAt)];
        if (input?.status && input.status !== "all") {
          conditions.push(eq(program.status, input.status));
        }

        const whereClause = and(...conditions);

        const items = await db
          .select()
          .from(program)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(program.createdAt));

        const [total] = await db.select({ count: count() }).from(program).where(whereClause);

        return {
          data: items,
          pagination: {
            total: total?.count ?? 0,
            limit,
            offset,
          },
        };
      }),

    get: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const item = await db.query.program.findFirst({
        where: eq(program.id, input.id),
        with: {
          syllabus: {
            orderBy: (syllabus, { asc }) => [asc(syllabus.week)],
          },
          mentors: {
            with: {
              user: true,
            },
          },
        },
      });

      if (!item) {
        throw new Error("Program not found");
      }

      return item;
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          durationWeeks: z.number().default(0),
          quota: z.number().default(0),
          status: z.enum(["draft", "open", "running", "completed"]).default("draft"),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();
        await db.insert(program).values({
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
          description: z.string().optional(),
          durationWeeks: z.number().optional(),
          quota: z.number().optional(),
          status: z.enum(["draft", "open", "running", "completed"]).optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...data } = input;
        await db.update(program).set(data).where(eq(program.id, id));
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      // Soft delete
      await db.update(program).set({ deletedAt: new Date() }).where(eq(program.id, input.id));
      return { success: true };
    }),

    syllabus: {
      update: protectedProcedure
        .input(
          z.object({
            programId: z.string(),
            items: z.array(
              z.object({
                id: z.string().optional(),
                week: z.number(),
                title: z.string(),
                outcome: z.string().optional(),
              }),
            ),
          }),
        )
        .handler(async ({ input }) => {
          // Transaction to handle syllabus updates
          await db.transaction(async (tx) => {
            // Delete existing syllabus not in the new list (if needed, or just overwrite)
            // For simplicity in MVP: Delete all and recreate, or upsert.
            // Let's go with upsert logic or simple delete-all-insert for now to ensure consistency
            // But to be safer, let's process items.

            // Current approach: Delete all for this program and re-insert.
            // This is simple but effectively handles reordering and removals.
            // WARNING: This changes IDs if we don't preserve them.
            // Better: Upsert.

            for (const item of input.items) {
              if (item.id) {
                await tx
                  .update(programSyllabus)
                  .set({
                    week: item.week,
                    title: item.title,
                    outcome: item.outcome,
                  })
                  .where(eq(programSyllabus.id, item.id));
              } else {
                await tx.insert(programSyllabus).values({
                  id: randomUUID(),
                  programId: input.programId,
                  week: item.week,
                  title: item.title,
                  outcome: item.outcome,
                });
              }
            }
          });
          return { success: true };
        }),

      delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
        await db.delete(programSyllabus).where(eq(programSyllabus.id, input.id));
        return { success: true };
      }),
    },

    mentors: {
      assign: protectedProcedure
        .input(
          z.object({
            programId: z.string(),
            userIds: z.array(z.string()),
          }),
        )
        .handler(async ({ input }) => {
          await db.transaction(async (tx) => {
            // First remove all existing mentors for this program (full sync approach)
            // Or maybe just add new ones?
            // "Assign" usually implies setting the state.
            // Let's make it additive for now to avoid accidental removals, or provide a separate remove endpoint.
            // Actually, for "Manage Mentors" UI, it's often easier to send the full list.
            // Let's stick to: input is the list of ALL mentors.

            await tx.delete(programMentor).where(eq(programMentor.programId, input.programId));

            if (input.userIds.length > 0) {
              await tx.insert(programMentor).values(
                input.userIds.map((userId) => ({
                  programId: input.programId,
                  userId,
                })),
              );
            }
          });
          return { success: true };
        }),
    },

    applications: {
      list: protectedProcedure
        .input(
          z.object({
            programId: z.string(),
            status: z.enum(["applied", "accepted", "rejected", "waitlisted", "all"]).optional(),
            limit: z.number().default(50),
            offset: z.number().default(0),
          }),
        )
        .handler(async ({ input }) => {
          const conditions = [eq(programApplication.programId, input.programId)];
          if (input.status && input.status !== "all") {
            conditions.push(eq(programApplication.status, input.status));
          }

          const whereClause = and(...conditions);

          const items = await db
            .select({
              id: programApplication.id,
              status: programApplication.status,
              reflectiveAnswers: programApplication.reflectiveAnswers,
              createdAt: programApplication.createdAt,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
              },
            })
            .from(programApplication)
            .leftJoin(user, eq(programApplication.userId, user.id))
            .where(whereClause)
            .limit(input.limit)
            .offset(input.offset)
            .orderBy(desc(programApplication.createdAt));

          const [total] = await db.select({ count: count() }).from(programApplication).where(whereClause);

          return {
            data: items,
            pagination: {
              total: total?.count ?? 0,
              limit: input.limit,
              offset: input.offset,
            },
          };
        }),

      updateStatus: protectedProcedure
        .input(
          z.object({
            id: z.string(),
            status: z.enum(["applied", "accepted", "rejected", "waitlisted"]),
          }),
        )
        .handler(async ({ input }) => {
          await db.update(programApplication).set({ status: input.status }).where(eq(programApplication.id, input.id));

          // Logic: If accepted, maybe we should auto-create a participant record?
          // Or wait for "Commitment"?
          // Spec says: "Commitment Gate: Peserta accepted wajib setuju komitmen... Tanpa agreement -> tidak bisa active"
          // So Participant record is likely created AFTER commitment.
          // OR Participant record created with status "confirmed" (waiting for commitment) or something.
          // Spec 3.7: Participant status: confirmed | active | dropped | completed.
          // Spec 3.6: Field agreed_at.

          return { success: true };
        }),
    },

    participants: {
      list: protectedProcedure
        .input(
          z.object({
            programId: z.string(),
            status: z.enum(["confirmed", "active", "dropped", "completed", "all"]).optional(),
            limit: z.number().default(50),
            offset: z.number().default(0),
          }),
        )
        .handler(async ({ input }) => {
          const conditions = [eq(programParticipant.programId, input.programId)];
          if (input.status && input.status !== "all") {
            conditions.push(eq(programParticipant.status, input.status));
          }

          const whereClause = and(...conditions);

          const items = await db
            .select({
              id: programParticipant.id,
              status: programParticipant.status,
              agreedAt: programParticipant.agreedAt,
              createdAt: programParticipant.createdAt,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
              },
            })
            .from(programParticipant)
            .leftJoin(user, eq(programParticipant.userId, user.id))
            .where(whereClause)
            .limit(input.limit)
            .offset(input.offset)
            .orderBy(desc(programParticipant.createdAt));

          const [total] = await db.select({ count: count() }).from(programParticipant).where(whereClause);

          return {
            data: items,
            pagination: {
              total: total?.count ?? 0,
              limit: input.limit,
              offset: input.offset,
            },
          };
        }),
    },
  },
};
