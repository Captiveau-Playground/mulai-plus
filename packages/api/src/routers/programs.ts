import { randomUUID } from "node:crypto";
import { and, count, db, desc, eq, isNull, ne } from "@better-auth-admin/db";
import { user } from "@better-auth-admin/db/schema/auth";
import {
  program,
  programApplication,
  programBatch,
  programBenefit,
  programFaq,
  programMentor,
  programParticipant,
  programSyllabus,
} from "@better-auth-admin/db/schema/programs";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export const programsRouter = {
  public: {
    list: publicProcedure
      .input(
        z
          .object({
            limit: z.number().default(50),
            offset: z.number().default(0),
          })
          .optional(),
      )
      .handler(async ({ input }) => {
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;

        // Show open and running programs for public
        const whereClause = and(isNull(program.deletedAt), ne(program.status, "draft"));

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

    get: publicProcedure.input(z.object({ slug: z.string() })).handler(async ({ input }) => {
      const item = await db.query.program.findFirst({
        where: eq(program.slug, input.slug),
        with: {
          syllabus: {
            orderBy: (syllabus, { asc }) => [asc(syllabus.week)],
          },
          mentors: {
            with: {
              user: true,
            },
          },
          batches: {
            where: (batch, { isNull }) => isNull(batch.deletedAt),
            orderBy: (batch, { desc }) => [desc(batch.startDate)],
          },
          faqs: {
            orderBy: (faq, { asc }) => [asc(faq.order)],
          },
          benefits: {
            orderBy: (benefit, { asc }) => [asc(benefit.order)],
          },
        },
      });

      if (!item) {
        throw new Error("Program not found");
      }

      return item;
    }),
  },

  apply: protectedProcedure
    .input(
      z.object({
        programId: z.string(),
        batchId: z.string(),
        answers: z.object({
          name: z.string().min(1),
          class: z.string().min(1),
          school: z.string().min(1),
          major: z.string().min(1),
          domicile: z.string().min(1),
          reason: z.string().min(1),
          phone: z.string().min(1),
          email: z.string().email(),
        }),
      }),
    )
    .handler(async ({ input, context }) => {
      // 1. Check if program exists
      const programItem = await db.query.program.findFirst({
        where: eq(program.id, input.programId),
      });
      if (!programItem) {
        throw new Error("Program not found");
      }

      // 2. Check if batch exists and is valid
      const batchItem = await db.query.programBatch.findFirst({
        where: eq(programBatch.id, input.batchId),
      });

      if (!batchItem) {
        throw new Error("Batch not found");
      }

      if (batchItem.programId !== input.programId) {
        throw new Error("Batch does not belong to this program");
      }

      if (batchItem.status === "closed" || batchItem.status === "completed") {
        throw new Error("Registration is closed for this batch");
      }

      const now = new Date();
      if (now < batchItem.registrationStartDate) {
        throw new Error("Registration has not started yet");
      }
      if (now > batchItem.registrationEndDate) {
        throw new Error("Registration has ended");
      }

      // 3. Check if already applied
      const existingApplication = await db.query.programApplication.findFirst({
        where: and(
          eq(programApplication.programId, input.programId),
          eq(programApplication.batchId, input.batchId),
          eq(programApplication.userId, context.session.user.id),
        ),
      });

      if (existingApplication) {
        throw new Error("You have already applied to this program batch");
      }

      // 4. Create application
      const id = randomUUID();
      await db.insert(programApplication).values({
        id,
        programId: input.programId,
        batchId: input.batchId,
        userId: context.session.user.id,
        status: "applied",
        reflectiveAnswers: input.answers,
      });

      return { success: true, id };
    }),

  student: {
    checkApplication: protectedProcedure
      .input(z.object({ programId: z.string(), batchId: z.string() }))
      .handler(async ({ input, context }) => {
        const application = await db.query.programApplication.findFirst({
          where: and(
            eq(programApplication.programId, input.programId),
            eq(programApplication.batchId, input.batchId),
            eq(programApplication.userId, context.session.user.id),
          ),
        });

        return {
          hasApplied: !!application,
          status: application?.status,
        };
      }),
  },

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
          slug: z.string().optional(),
          description: z.string().optional(),
          durationWeeks: z.number().default(0),
          status: z.enum(["draft", "open", "running", "completed"]).default("draft"),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();
        let slug = input.slug;
        if (!slug || slug.trim() === "") {
          slug = slugify(input.name);
        }
        if (!slug || slug.trim() === "") {
          slug = `program-${id}`;
        }

        await db.insert(program).values({
          id,
          name: input.name,
          description: input.description,
          durationWeeks: input.durationWeeks,
          status: input.status,
          slug,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          slug: z.string().min(1).optional(),
          description: z.string().optional(),
          durationWeeks: z.number().optional(),
          status: z.enum(["draft", "open", "running", "completed"]).optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...data } = input;

        if (data.name && !data.slug) {
          // Check if slug needs update?
          // If explicit slug is not provided, but name is changed,
          // generally we might NOT want to auto-update slug to preserve URLs.
          // But if the user wants to update it, they should send it.
          // So let's leave it as is: only update slug if explicitly provided.
        }

        await db.update(program).set(data).where(eq(program.id, id));
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      // Soft delete
      await db.update(program).set({ deletedAt: new Date() }).where(eq(program.id, input.id));
      return { success: true };
    }),

    batches: {
      list: protectedProcedure.input(z.object({ programId: z.string() })).handler(async ({ input }) => {
        return await db
          .select()
          .from(programBatch)
          .where(and(eq(programBatch.programId, input.programId), isNull(programBatch.deletedAt)))
          .orderBy(desc(programBatch.startDate));
      }),
      create: protectedProcedure
        .input(
          z.object({
            programId: z.string(),
            name: z.string().min(1),
            startDate: z.string().transform((str) => new Date(str)),
            endDate: z.string().transform((str) => new Date(str)),
            registrationStartDate: z.string().transform((str) => new Date(str)),
            registrationEndDate: z.string().transform((str) => new Date(str)),
            quota: z.number().min(0),
            status: z.enum(["upcoming", "open", "closed", "running", "completed"]).default("upcoming"),
          }),
        )
        .handler(async ({ input }) => {
          const id = randomUUID();
          await db.insert(programBatch).values({
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
            startDate: z
              .string()
              .transform((str) => new Date(str))
              .optional(),
            endDate: z
              .string()
              .transform((str) => new Date(str))
              .optional(),
            registrationStartDate: z
              .string()
              .transform((str) => new Date(str))
              .optional(),
            registrationEndDate: z
              .string()
              .transform((str) => new Date(str))
              .optional(),
            quota: z.number().min(0).optional(),
            status: z.enum(["upcoming", "open", "closed", "running", "completed"]).optional(),
          }),
        )
        .handler(async ({ input }) => {
          const { id, ...data } = input;
          await db.update(programBatch).set(data).where(eq(programBatch.id, id));
          return { success: true };
        }),
      delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
        await db.update(programBatch).set({ deletedAt: new Date() }).where(eq(programBatch.id, input.id));
        return { success: true };
      }),
    },

    faqs: {
      list: protectedProcedure.input(z.object({ programId: z.string() })).handler(async ({ input }) => {
        return await db
          .select()
          .from(programFaq)
          .where(eq(programFaq.programId, input.programId))
          .orderBy(programFaq.order);
      }),
      create: protectedProcedure
        .input(
          z.object({
            programId: z.string(),
            question: z.string().min(1),
            answer: z.string().min(1),
            order: z.number().default(0),
          }),
        )
        .handler(async ({ input }) => {
          const id = randomUUID();
          await db.insert(programFaq).values({
            id,
            ...input,
          });
          return { id };
        }),
      update: protectedProcedure
        .input(
          z.object({
            id: z.string(),
            question: z.string().min(1).optional(),
            answer: z.string().min(1).optional(),
            order: z.number().optional(),
          }),
        )
        .handler(async ({ input }) => {
          const { id, ...data } = input;
          await db.update(programFaq).set(data).where(eq(programFaq.id, id));
          return { success: true };
        }),
      delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
        await db.delete(programFaq).where(eq(programFaq.id, input.id));
        return { success: true };
      }),
    },

    benefits: {
      list: protectedProcedure.input(z.object({ programId: z.string() })).handler(async ({ input }) => {
        return await db
          .select()
          .from(programBenefit)
          .where(eq(programBenefit.programId, input.programId))
          .orderBy(programBenefit.order);
      }),
      create: protectedProcedure
        .input(
          z.object({
            programId: z.string(),
            title: z.string().min(1),
            description: z.string().optional(),
            icon: z.string().optional(),
            order: z.number().default(0),
          }),
        )
        .handler(async ({ input }) => {
          const id = randomUUID();
          await db.insert(programBenefit).values({
            id,
            ...input,
          });
          return { id };
        }),
      update: protectedProcedure
        .input(
          z.object({
            id: z.string(),
            title: z.string().min(1).optional(),
            description: z.string().optional(),
            icon: z.string().optional(),
            order: z.number().optional(),
          }),
        )
        .handler(async ({ input }) => {
          const { id, ...data } = input;
          await db.update(programBenefit).set(data).where(eq(programBenefit.id, id));
          return { success: true };
        }),
      delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
        await db.delete(programBenefit).where(eq(programBenefit.id, input.id));
        return { success: true };
      }),
    },

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
          await db.transaction(async (tx) => {
            await tx
              .update(programApplication)
              .set({ status: input.status })
              .where(eq(programApplication.id, input.id));

            if (input.status === "accepted") {
              const application = await tx.query.programApplication.findFirst({
                where: eq(programApplication.id, input.id),
              });

              if (application) {
                // Check if already a participant in this program (and batch if applicable)
                // Assuming one participant record per program-user-batch combo
                const existingParticipant = await tx.query.programParticipant.findFirst({
                  where: and(
                    eq(programParticipant.programId, application.programId),
                    eq(programParticipant.userId, application.userId),
                    application.batchId ? eq(programParticipant.batchId, application.batchId) : undefined,
                  ),
                });

                if (!existingParticipant) {
                  await tx.insert(programParticipant).values({
                    id: randomUUID(),
                    programId: application.programId,
                    batchId: application.batchId,
                    userId: application.userId,
                    status: "confirmed", // Initial status waiting for commitment
                  });
                }
              }
            }
          });

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
