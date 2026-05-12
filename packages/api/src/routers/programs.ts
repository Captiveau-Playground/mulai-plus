import { randomUUID } from "node:crypto";
import { and, asc, count, db, desc, eq, gt, inArray, isNotNull, isNull, ne, or, sql } from "@mulai-plus/db";
import { auditLog } from "@mulai-plus/db/schema/audit";
import { user } from "@mulai-plus/db/schema/auth";
import {
  program,
  programApplication,
  programAttachment,
  programAttachmentRequest,
  programAttendance,
  programBatch,
  programBatchMentor,
  programBenefit,
  programFaq,
  programParticipant,
  programSession,
  programSyllabus,
  requestStatusEnum,
} from "@mulai-plus/db/schema/programs";
import { systemSettings } from "@mulai-plus/db/schema/settings";
import { z } from "zod";
import { adminOrProgramManagerProcedure, protectedProcedure, publicProcedure } from "../index";
import {
  getApplicationAcceptedHtml,
  getApplicationRejectedHtml,
  getRegistrationSuccessHtml,
} from "../lib/email-templates";
import { sendNotification } from "../lib/notification";
import { getPathFromUrl, supabase } from "../lib/supabase";
import { unosend } from "../lib/unosend";

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

        console.log("Programs list input:", { limit, offset });

        // Show open and running programs for public
        const whereClause = isNull(program.deletedAt);

        const items = await db.query.program.findMany({
          where: whereClause,
          limit,
          offset,
          orderBy: desc(program.createdAt),
          with: {
            batches: {
              where: (batch, { isNull }) => isNull(batch.deletedAt),
              orderBy: (batch, { desc }) => [desc(batch.startDate)],
              limit: 2, // Get only the latest batch
            },
            benefits: {
              orderBy: (benefit, { asc }) => [asc(benefit.order)],
              limit: 5, // Get only top 3 benefits
            },
          },
        });

        console.log("Programs found:", items.length);

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

      // Aggregate mentors from all batches
      const mentors = await db
        .selectDistinct({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(programBatchMentor)
        .innerJoin(programBatch, eq(programBatchMentor.batchId, programBatch.id))
        .innerJoin(user, eq(programBatchMentor.userId, user.id))
        .where(eq(programBatch.programId, item.id));

      return {
        ...item,
        mentors: mentors.map((m) => ({ user: m })),
      };
    }),
  },

  apply: publicProcedure
    .input(
      z.object({
        programId: z.string(),
        batchId: z.string(),
        answers: z.object({
          name: z.string().min(1),
          class: z.string().min(1),
          school: z.string().min(1),
          major: z.string().min(1),
          province: z.string().min(1),
          city: z.string().min(1),
          reason: z.string().min(1),
          phone: z.string().min(1),
          email: z.string().email(),
          reflectionIdealSelf: z.string().min(1),
          reflectionExpectation: z.string().min(1),
          reflectionFuture: z.string().min(1),
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
      const userId = context?.session?.user?.id;
      if (!userId) throw new Error("Unauthorized");

      // 3. Check if already applied
      const existingApplication = await db.query.programApplication.findFirst({
        where: and(
          eq(programApplication.programId, input.programId),
          eq(programApplication.batchId, input.batchId),
          eq(programApplication.userId, userId),
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
        userId: userId,
        status: "applied",
        reflectiveAnswers: input.answers,
      });

      // Send registration confirmation email
      try {
        const emailConfig = await db.query.systemSettings.findFirst({
          where: eq(systemSettings.key, "email_config"),
        });
        const isEmailEnabled = (emailConfig?.value as { enabled?: boolean })?.enabled ?? true;

        if (isEmailEnabled) {
          const emailHtml = getRegistrationSuccessHtml({
            name: input.answers.name,
            programName: programItem.name,
            batchName: batchItem.name,
          });

          await unosend.send({
            to: input.answers.email,
            subject: `Registration Confirmed: ${programItem.name}`,
            html: emailHtml,
          });
        }
      } catch (error) {
        console.error("Failed to send registration email:", error);
      }

      // Notify Admins
      try {
        const admins = await db.select({ id: user.id }).from(user).where(eq(user.role, "admin"));

        if (admins.length > 0) {
          await Promise.all(
            admins.map((admin) =>
              sendNotification({
                userId: admin.id,
                title: "New Program Application",
                message: `${input.answers.name} applied to ${programItem.name}`,
                type: "info",
                link: `/admin/programs/${programItem.id}`,
              }),
            ),
          );
        }
      } catch (error) {
        console.error("Failed to notify admins:", error);
      }

      return { success: true, id };
    }),

  myBatches: protectedProcedure.handler(async ({ context }) => {
    const batchMentors = await db.query.programBatchMentor.findMany({
      where: eq(programBatchMentor.userId, context.session.user.id),
      with: {
        batch: {
          with: {
            program: true,
          },
        },
      },
      orderBy: [desc(programBatchMentor.assignedAt)],
    });
    return batchMentors.map((bm) => bm.batch);
  }),

  student: {
    myApplications: protectedProcedure.handler(async ({ context }) => {
      const userId = context.session.user.id;

      const applications = await db.query.programApplication.findMany({
        where: eq(programApplication.userId, userId),
        with: {
          program: true,
          batch: true,
        },
        orderBy: [desc(programApplication.createdAt)],
      });

      return applications;
    }),

    myPrograms: publicProcedure.handler(async ({ context }) => {
      const userId = context?.session?.user?.id;
      if (!userId) throw new Error("Unauthorized");

      const participations = await db.query.programParticipant.findMany({
        where: and(eq(programParticipant.userId, userId), isNotNull(programParticipant.batchId)),
        with: {
          batch: {
            with: {
              program: true,
            },
          },
        },
        orderBy: [desc(programParticipant.createdAt)],
      });

      return participations
        .filter((p) => p.batch)
        .map((p) => ({
          ...p.batch?.program,
          batch: p.batch!,
          joinedAt: p.createdAt,
        }));
    }),

    checkApplication: publicProcedure
      .input(z.object({ programId: z.string(), batchId: z.string() }))
      .handler(async ({ input, context }) => {
        const userId = context?.session?.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const application = await db.query.programApplication.findFirst({
          where: and(
            eq(programApplication.programId, input.programId),
            eq(programApplication.batchId, input.batchId),
            eq(programApplication.userId, userId),
          ),
        });

        return {
          hasApplied: !!application,
          status: application?.status,
        };
      }),

    get: publicProcedure.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
      const userId = context?.session?.user?.id;
      if (!userId) throw new Error("Unauthorized");

      const participant = await db.query.programParticipant.findFirst({
        where: and(eq(programParticipant.userId, userId), eq(programParticipant.programId, input.id)),
        with: {
          batch: {
            with: {
              program: {
                with: {
                  syllabus: {
                    orderBy: (s, { asc }) => [asc(s.week)],
                  },
                },
              },
              mentors: {
                with: {
                  user: true,
                },
              },
            },
          },
        },
      });

      if (!participant?.batch) {
        throw new Error("Program not found or you are not enrolled");
      }

      const sessions = await db.query.programSession.findMany({
        where: and(
          eq(programSession.batchId, participant.batchId!),
          or(eq(programSession.studentId, userId), isNull(programSession.studentId)),
          ne(programSession.status, "cancelled"),
        ),
        with: {
          mentor: true,
          attachments: true,
          batch: {
            with: {
              program: true,
            },
          },
        },
        orderBy: [asc(programSession.startsAt)],
      });

      const attendance = await db.query.programAttendance.findMany({
        where: eq(programAttendance.userId, userId),
      });

      return {
        ...participant.batch.program,
        batch: participant.batch,
        participant,
        sessions,
        attendance,
        joinedAt: participant.createdAt,
      };
    }),
  },

  admin: {
    analytics: adminOrProgramManagerProcedure.handler(async () => {
      const [totalPrograms] = await db.select({ count: count() }).from(program).where(isNull(program.deletedAt));
      const [activePrograms] = await db.select({ count: count() }).from(program).where(isNull(program.deletedAt));

      const [totalBatches] = await db
        .select({ count: count() })
        .from(programBatch)
        .where(isNull(programBatch.deletedAt));
      const [activeBatches] = await db
        .select({ count: count() })
        .from(programBatch)
        .where(and(isNull(programBatch.deletedAt), eq(programBatch.status, "open")));

      const [totalApplicants] = await db.select({ count: count() }).from(programApplication);
      const [totalParticipants] = await db.select({ count: count() }).from(programParticipant);

      const recentApplications = await db.query.programApplication.findMany({
        orderBy: (app, { desc }) => [desc(app.createdAt)],
        limit: 5,
        with: {
          user: true,
          program: true,
          batch: true,
        },
      });

      const applicationsOverTime = await db
        .select({
          date: sql<string>`DATE(${programApplication.createdAt})`.as("date"),
          count: count(),
        })
        .from(programApplication)
        .groupBy(sql`DATE(${programApplication.createdAt})`)
        .orderBy(sql`DATE(${programApplication.createdAt}) desc`)
        .limit(30);

      return {
        totalPrograms: totalPrograms?.count ?? 0,
        activePrograms: activePrograms?.count ?? 0,
        totalBatches: totalBatches?.count ?? 0,
        activeBatches: activeBatches?.count ?? 0,
        totalApplicants: totalApplicants?.count ?? 0,
        totalParticipants: totalParticipants?.count ?? 0,
        recentApplications,
        applicationsOverTime: applicationsOverTime.reverse(),
      };
    }),

    list: adminOrProgramManagerProcedure
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

        const conditions = [isNull(program.deletedAt)];

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

    get: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const item = await db.query.program.findFirst({
        where: eq(program.id, input.id),
        with: {
          syllabus: {
            orderBy: (syllabus, { asc }) => [asc(syllabus.week)],
          },
        },
      });

      if (!item) {
        throw new Error("Program not found");
      }

      // Aggregate mentors from all batches
      const mentors = await db
        .selectDistinct({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(programBatchMentor)
        .innerJoin(programBatch, eq(programBatchMentor.batchId, programBatch.id))
        .innerJoin(user, eq(programBatchMentor.userId, user.id))
        .where(eq(programBatch.programId, item.id));

      return {
        ...item,
        mentors: mentors.map((m) => ({ user: m })),
      };
    }),

    create: adminOrProgramManagerProcedure
      .input(
        z.object({
          name: z.string().min(1),
          slug: z.string().optional(),
          description: z.string().optional(),
          bannerUrl: z.string().optional(),
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
          bannerUrl: input.bannerUrl,
          slug,
        });
        return { id };
      }),

    update: adminOrProgramManagerProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          slug: z.string().min(1).optional(),
          description: z.string().optional(),
          bannerUrl: z.string().optional(),
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

        // Handle Banner Cleanup
        if (data.bannerUrl !== undefined && supabase) {
          const currentProgram = await db.query.program.findFirst({
            where: eq(program.id, id),
            columns: { bannerUrl: true },
          });

          if (currentProgram?.bannerUrl && currentProgram.bannerUrl !== data.bannerUrl) {
            const oldPath = getPathFromUrl(currentProgram.bannerUrl, "banners");
            if (oldPath) {
              await supabase.storage.from("banners").remove([oldPath]);
            }
          }
        }

        await db.update(program).set(data).where(eq(program.id, id));
        return { success: true };
      }),

    delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      // Soft delete
      await db.update(program).set({ deletedAt: new Date() }).where(eq(program.id, input.id));
      return { success: true };
    }),

    batches: {
      list: adminOrProgramManagerProcedure.input(z.object({ programId: z.string() })).handler(async ({ input }) => {
        return await db
          .select()
          .from(programBatch)
          .where(and(eq(programBatch.programId, input.programId), isNull(programBatch.deletedAt)))
          .orderBy(desc(programBatch.startDate));
      }),
      create: adminOrProgramManagerProcedure
        .input(
          z.object({
            programId: z.string(),
            name: z.string().min(1),
            startDate: z.string().transform((str) => new Date(str)),
            endDate: z.string().transform((str) => new Date(str)),
            registrationStartDate: z.string().transform((str) => new Date(str)),
            registrationEndDate: z.string().transform((str) => new Date(str)),
            quota: z.number().min(0),
            durationWeeks: z.number().min(1),
            bannerUrl: z.string().optional(),
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
      update: adminOrProgramManagerProcedure
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
            verificationStartDate: z
              .string()
              .optional()
              .transform((str) => (str ? new Date(str) : undefined)),
            verificationEndDate: z
              .string()
              .optional()
              .transform((str) => (str ? new Date(str) : undefined)),
            assessmentStartDate: z
              .string()
              .optional()
              .transform((str) => (str ? new Date(str) : undefined)),
            assessmentEndDate: z
              .string()
              .optional()
              .transform((str) => (str ? new Date(str) : undefined)),
            announcementDate: z
              .string()
              .optional()
              .transform((str) => (str ? new Date(str) : undefined)),
            onboardingDate: z
              .string()
              .optional()
              .transform((str) => (str ? new Date(str) : undefined)),
            quota: z.number().min(0).optional(),
            durationWeeks: z.number().min(1).optional(),
            bannerUrl: z.string().optional(),
            communityLink: z.string().url().optional().or(z.literal("")),
            status: z.enum(["upcoming", "open", "closed", "running", "completed"]).optional(),
          }),
        )
        .handler(async ({ input }) => {
          const { id, ...data } = input;

          // Handle Banner Cleanup
          if (data.bannerUrl !== undefined && supabase) {
            const currentBatch = await db.query.programBatch.findFirst({
              where: eq(programBatch.id, id),
              columns: { bannerUrl: true },
            });

            if (currentBatch?.bannerUrl && currentBatch.bannerUrl !== data.bannerUrl) {
              const oldPath = getPathFromUrl(currentBatch.bannerUrl, "banners");
              if (oldPath) {
                await supabase.storage.from("banners").remove([oldPath]);
              }
            }
          }

          await db.update(programBatch).set(data).where(eq(programBatch.id, id));
          return { success: true };
        }),
      delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
        await db.update(programBatch).set({ deletedAt: new Date() }).where(eq(programBatch.id, input.id));
        return { success: true };
      }),

      assignMentors: adminOrProgramManagerProcedure
        .input(
          z.object({
            batchId: z.string(),
            userIds: z.array(z.string()),
          }),
        )
        .handler(async ({ input }) => {
          await db.transaction(async (tx) => {
            // Remove existing mentors for this batch
            await tx.delete(programBatchMentor).where(eq(programBatchMentor.batchId, input.batchId));

            if (input.userIds.length > 0) {
              await tx.insert(programBatchMentor).values(
                input.userIds.map((userId) => ({
                  batchId: input.batchId,
                  userId,
                })),
              );
            }
          });
          return { success: true };
        }),

      getMentors: adminOrProgramManagerProcedure.input(z.object({ batchId: z.string() })).handler(async ({ input }) => {
        const mentors = await db.query.programBatchMentor.findMany({
          where: eq(programBatchMentor.batchId, input.batchId),
          with: {
            user: true,
          },
        });
        return mentors.map((m) => m.user);
      }),

      attendance: {
        list: adminOrProgramManagerProcedure.input(z.object({ batchId: z.string() })).handler(async ({ input }) => {
          const participants = await db.query.programApplication.findMany({
            where: and(eq(programApplication.batchId, input.batchId), eq(programApplication.status, "accepted")),
            with: {
              user: true,
            },
          });

          const attendance = await db.query.programAttendance.findMany({
            where: eq(programAttendance.batchId, input.batchId),
            columns: {
              id: true,
              userId: true,
              week: true,
              status: true,
              notes: true,
              progressNote: true,
            },
          });

          return {
            participants: participants.map((p) => p.user),
            attendance,
          };
        }),

        update: adminOrProgramManagerProcedure
          .input(
            z.object({
              batchId: z.string(),
              updates: z.array(
                z.object({
                  userId: z.string(),
                  week: z.number(),
                  status: z.enum(["present", "absent", "excused"]),
                  notes: z.string().optional(),
                  progressNote: z.string().optional(),
                }),
              ),
            }),
          )
          .handler(async ({ input }) => {
            const batch = await db.query.programBatch.findFirst({
              where: eq(programBatch.id, input.batchId),
            });
            if (!batch) throw new Error("Batch not found");

            await db.transaction(async (tx) => {
              for (const update of input.updates) {
                if (update.week < 1 || update.week > batch.durationWeeks) {
                  throw new Error(`Invalid week ${update.week}. Batch duration is ${batch.durationWeeks} weeks.`);
                }

                // Upsert logic
                // Check if exists
                const existing = await tx.query.programAttendance.findFirst({
                  where: and(
                    eq(programAttendance.batchId, input.batchId),
                    eq(programAttendance.userId, update.userId),
                    eq(programAttendance.week, update.week),
                  ),
                });

                if (existing) {
                  await tx
                    .update(programAttendance)
                    .set({
                      status: update.status,
                      notes: update.notes,
                      progressNote: update.progressNote,
                    })
                    .where(eq(programAttendance.id, existing.id));
                } else {
                  await tx.insert(programAttendance).values({
                    id: randomUUID(),
                    batchId: input.batchId,
                    userId: update.userId,
                    week: update.week,
                    status: update.status,
                    notes: update.notes,
                    progressNote: update.progressNote,
                  });
                }
              }
            });
            return { success: true };
          }),
      },
    },

    faqs: {
      list: adminOrProgramManagerProcedure.input(z.object({ programId: z.string() })).handler(async ({ input }) => {
        return await db
          .select()
          .from(programFaq)
          .where(eq(programFaq.programId, input.programId))
          .orderBy(programFaq.order);
      }),
      create: adminOrProgramManagerProcedure
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
      update: adminOrProgramManagerProcedure
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
      delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
        await db.delete(programFaq).where(eq(programFaq.id, input.id));
        return { success: true };
      }),
    },

    benefits: {
      list: adminOrProgramManagerProcedure.input(z.object({ programId: z.string() })).handler(async ({ input }) => {
        return await db
          .select()
          .from(programBenefit)
          .where(eq(programBenefit.programId, input.programId))
          .orderBy(programBenefit.order);
      }),
      create: adminOrProgramManagerProcedure
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
      update: adminOrProgramManagerProcedure
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
      delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
        await db.delete(programBenefit).where(eq(programBenefit.id, input.id));
        return { success: true };
      }),
    },

    syllabus: {
      update: adminOrProgramManagerProcedure
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

      delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
        await db.delete(programSyllabus).where(eq(programSyllabus.id, input.id));
        return { success: true };
      }),
    },

    mentors: {
      assign: adminOrProgramManagerProcedure
        .input(
          z.object({
            batchId: z.string(),
            userIds: z.array(z.string()),
          }),
        )
        .handler(async ({ input }) => {
          await db.transaction(async (tx) => {
            await tx.delete(programBatchMentor).where(eq(programBatchMentor.batchId, input.batchId));

            if (input.userIds.length > 0) {
              await tx.insert(programBatchMentor).values(
                input.userIds.map((userId) => ({
                  batchId: input.batchId,
                  userId,
                })),
              );
            }
          });
          return { success: true };
        }),

      list: adminOrProgramManagerProcedure
        .input(
          z
            .object({
              programId: z.string().optional(),
              limit: z.number().default(50),
              offset: z.number().default(0),
            })
            .optional(),
        )
        .handler(async ({ input }) => {
          const limit = input?.limit ?? 50;
          const offset = input?.offset ?? 0;

          let mentors: { userId: string; name: string | null; email: string | null; image: string | null }[];
          if (input?.programId) {
            const result = await db
              .selectDistinct({
                userId: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
              })
              .from(programBatchMentor)
              .innerJoin(user, eq(programBatchMentor.userId, user.id))
              .innerJoin(programBatch, eq(programBatchMentor.batchId, programBatch.id))
              .where(and(eq(programBatch.programId, input.programId), eq(user.role, "mentor")));
            mentors = result;
          } else {
            const result = await db
              .selectDistinct({
                userId: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
              })
              .from(programBatchMentor)
              .innerJoin(user, eq(programBatchMentor.userId, user.id))
              .where(eq(user.role, "mentor"));
            mentors = result;
          }

          const userIds = mentors.map((m) => m.userId);

          if (userIds.length === 0) {
            return {
              data: [],
              pagination: { total: 0, limit, offset },
            };
          }

          const sessionCounts = await db
            .select({
              mentorId: programSession.mentorId,
              totalSessions: count(),
            })
            .from(programSession)
            .where(inArray(programSession.mentorId, userIds))
            .groupBy(programSession.mentorId);

          const batchCounts = await db
            .select({
              mentorId: programBatchMentor.userId,
              totalBatches: count(),
            })
            .from(programBatchMentor)
            .where(inArray(programBatchMentor.userId, userIds))
            .groupBy(programBatchMentor.userId);

          const sessionCountMap = Object.fromEntries(sessionCounts.map((s) => [s.mentorId, s.totalSessions]));
          const batchCountMap = Object.fromEntries(batchCounts.map((b) => [b.mentorId, b.totalBatches]));

          const mentorsWithStats = mentors.map((m) => ({
            id: m.userId,
            name: m.name,
            email: m.email,
            image: m.image,
            totalSessions: sessionCountMap[m.userId] ?? 0,
            assignedBatches: batchCountMap[m.userId] ?? 0,
          }));

          return {
            data: mentorsWithStats,
            pagination: {
              total: mentorsWithStats.length,
              limit,
              offset,
            },
          };
        }),

      get: adminOrProgramManagerProcedure.input(z.object({ mentorId: z.string() })).handler(async ({ input }) => {
        const mentor = await db.query.user.findFirst({
          where: eq(user.id, input.mentorId),
        });

        if (!mentor) {
          throw new Error("Mentor not found");
        }

        const totalSessions = await db
          .select({ count: count() })
          .from(programSession)
          .where(eq(programSession.mentorId, input.mentorId));

        const completedSessions = await db
          .select({ count: count() })
          .from(programSession)
          .where(and(eq(programSession.mentorId, input.mentorId), eq(programSession.status, "completed")));

        const upcomingSessions = await db
          .select({ count: count() })
          .from(programSession)
          .where(
            and(
              eq(programSession.mentorId, input.mentorId),
              eq(programSession.status, "scheduled"),
              gt(programSession.startsAt, new Date()),
            ),
          );

        const missedSessions = await db
          .select({ count: count() })
          .from(programSession)
          .where(and(eq(programSession.mentorId, input.mentorId), eq(programSession.status, "missed")));

        const cancelledSessions = await db
          .select({ count: count() })
          .from(programSession)
          .where(and(eq(programSession.mentorId, input.mentorId), eq(programSession.status, "cancelled")));

        const assignedBatches = await db.query.programBatchMentor.findMany({
          where: eq(programBatchMentor.userId, input.mentorId),
          with: {
            batch: {
              with: {
                program: true,
              },
            },
          },
        });

        const allSessions = await db.query.programSession.findMany({
          where: eq(programSession.mentorId, input.mentorId),
          with: {
            student: true,
            batch: {
              with: {
                program: true,
              },
            },
          },
          orderBy: [desc(programSession.startsAt)],
        });

        const studentsMap = new Map<
          string,
          {
            id: string;
            name: string;
            email: string;
            image: string | null;
            sessionCount: number;
            sessions: {
              id: string;
              week: number;
              type: string;
              status: string;
              startsAt: Date;
              durationMinutes: number;
              batchName: string;
              programName: string;
              meetingLink: string | null;
            }[];
          }
        >();

        for (const session of allSessions) {
          if (!session.studentId) continue;
          const studentId = session.studentId;

          if (!studentsMap.has(studentId)) {
            studentsMap.set(studentId, {
              id: studentId,
              name: session.student?.name || "Unknown",
              email: session.student?.email || "",
              image: session.student?.image || null,
              sessionCount: 0,
              sessions: [],
            });
          }

          const studentData = studentsMap.get(studentId);
          if (!studentData) continue;
          studentData.sessionCount++;
          studentData.sessions.push({
            id: session.id,
            week: session.week,
            type: session.type,
            status: session.status,
            startsAt: session.startsAt,
            durationMinutes: session.durationMinutes,
            batchName: session.batch?.name || "Unknown Batch",
            programName: session.batch?.program?.name || "Unknown Program",
            meetingLink: session.meetingLink,
          });
        }

        const students = Array.from(studentsMap.values()).sort((a, b) => b.sessions.length - a.sessions.length);

        const recentSessions = allSessions.slice(0, 10).map((s) => ({
          id: s.id,
          week: s.week,
          type: s.type,
          status: s.status,
          startsAt: s.startsAt,
          durationMinutes: s.durationMinutes,
          studentName: s.student?.name || null,
          studentId: s.studentId,
          batchName: s.batch?.name || "Unknown Batch",
          programName: s.batch?.program?.name || "Unknown Program",
          meetingLink: s.meetingLink,
        }));

        return {
          id: mentor.id,
          name: mentor.name,
          email: mentor.email,
          image: mentor.image,
          stats: {
            total: totalSessions[0]?.count ?? 0,
            completed: completedSessions[0]?.count ?? 0,
            upcoming: upcomingSessions[0]?.count ?? 0,
            missed: missedSessions[0]?.count ?? 0,
            cancelled: cancelledSessions[0]?.count ?? 0,
          },
          assignedBatches: assignedBatches.map((ab) => ({
            id: ab.batch.id,
            name: ab.batch.name,
            programName: ab.batch.program.name,
            assignedAt: ab.assignedAt,
          })),
          students,
          recentSessions,
        };
      }),
    },

    applications: {
      list: adminOrProgramManagerProcedure
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
              batchName: programBatch.name,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
              },
            })
            .from(programApplication)
            .leftJoin(user, eq(programApplication.userId, user.id))
            .leftJoin(programBatch, eq(programApplication.batchId, programBatch.id))
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

      recent: adminOrProgramManagerProcedure
        .input(
          z.object({
            limit: z.number().default(5),
          }),
        )
        .handler(async ({ input }) => {
          const items = await db
            .select({
              id: programApplication.id,
              programId: programApplication.programId,
              status: programApplication.status,
              createdAt: programApplication.createdAt,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
              },
              program: {
                name: program.name,
              },
            })
            .from(programApplication)
            .leftJoin(user, eq(programApplication.userId, user.id))
            .leftJoin(program, eq(programApplication.programId, program.id))
            .orderBy(desc(programApplication.createdAt))
            .limit(input.limit);

          return items;
        }),

      bulkUpdateStatus: adminOrProgramManagerProcedure
        .input(
          z.object({
            ids: z.array(z.string()),
            status: z.enum(["applied", "accepted", "rejected", "waitlisted"]),
          }),
        )
        .handler(async ({ input }) => {
          await db.transaction(async (tx) => {
            await tx
              .update(programApplication)
              .set({ status: input.status })
              .where(inArray(programApplication.id, input.ids));

            if (input.status === "accepted") {
              const applications = await tx.query.programApplication.findMany({
                where: inArray(programApplication.id, input.ids),
              });

              for (const application of applications) {
                // Check if already a participant in this program (and batch if applicable)
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

      updateStatus: adminOrProgramManagerProcedure
        .input(
          z.object({
            id: z.string(),
            status: z.enum(["applied", "accepted", "rejected", "waitlisted"]),
            rejectionReason: z.string().optional(),
          }),
        )
        .handler(async ({ input, context }) => {
          await db.transaction(async (tx) => {
            await tx
              .update(programApplication)
              .set({ status: input.status })
              .where(eq(programApplication.id, input.id));

            const application = await tx.query.programApplication.findFirst({
              where: eq(programApplication.id, input.id),
              with: {
                user: true,
                program: true,
                batch: true,
              },
            });

            if (!application) return;

            const emailConfig = await tx.query.systemSettings.findFirst({
              where: eq(systemSettings.key, "email_config"),
            });
            const isEmailEnabled = (emailConfig?.value as { enabled?: boolean })?.enabled ?? true;

            if (input.status === "accepted") {
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

              // Send Acceptance Email
              try {
                if (isEmailEnabled) {
                  const emailHtml = getApplicationAcceptedHtml({
                    firstName: application.user.name?.split(" ")[0] || "Applicant",
                    programName: application.program.name,
                    startDate: application.batch?.startDate
                      ? new Date(application.batch.startDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "TBA",
                  });

                  await unosend.send({
                    to: application.user.email,
                    subject: `Selamat! Anda Diterima di Program ${application.program.name}`,
                    html: emailHtml,
                  });

                  // Audit Log for Email
                  await tx.insert(auditLog).values({
                    id: randomUUID(),
                    userId: context.session.user.id,
                    action: "EMAIL_SENT",
                    resource: "program_application",
                    resourceId: application.id,
                    details: {
                      type: "acceptance",
                      recipient: application.user.email,
                    },
                    createdAt: new Date(),
                  });
                }

                // Send In-App Notification
                await sendNotification({
                  userId: application.userId,
                  title: "Application Accepted",
                  message: `Congratulations! Your application for ${application.program.name} has been accepted.`,
                  type: "success",
                  link: `/dashboard/programs/${application.programId}`,
                });
              } catch (error) {
                console.error("Failed to send acceptance email/notification:", error);
              }
            } else if (input.status === "rejected") {
              // Send Rejection Email
              try {
                if (isEmailEnabled) {
                  const emailHtml = getApplicationRejectedHtml({
                    firstName: application.user.name?.split(" ")[0] || "Applicant",
                    programName: application.program.name,
                    registrationId: application.id.slice(0, 8).toUpperCase(),
                    rejectionReason: input.rejectionReason || "Tidak memenuhi kriteria seleksi administrasi.",
                  });

                  await unosend.send({
                    to: application.user.email,
                    subject: `Update Status Aplikasi Program ${application.program.name}`,
                    html: emailHtml,
                  });

                  // Audit Log for Email
                  await tx.insert(auditLog).values({
                    id: randomUUID(),
                    userId: context.session.user.id,
                    action: "EMAIL_SENT",
                    resource: "program_application",
                    resourceId: application.id,
                    details: {
                      type: "rejection",
                      recipient: application.user.email,
                    },
                    createdAt: new Date(),
                  });
                }

                // Send In-App Notification
                await sendNotification({
                  userId: application.userId,
                  title: "Application Status Update",
                  message: `Your application for ${application.program.name} has been updated.`,
                  type: "info",
                  link: `/dashboard/programs/${application.programId}`,
                });
              } catch (error) {
                console.error("Failed to send rejection email/notification:", error);
              }
            }
          });

          return { success: true };
        }),
    },

    participants: {
      list: adminOrProgramManagerProcedure
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
              batchName: programBatch.name,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
              },
            })
            .from(programParticipant)
            .leftJoin(user, eq(programParticipant.userId, user.id))
            .leftJoin(programBatch, eq(programParticipant.batchId, programBatch.id))
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

    attendance: {
      list: adminOrProgramManagerProcedure
        .input(
          z.object({
            batchId: z.string(),
            week: z.number().optional(),
          }),
        )
        .handler(async ({ input }) => {
          const conditions = [eq(programAttendance.batchId, input.batchId)];
          if (input.week) {
            conditions.push(eq(programAttendance.week, input.week));
          }
          const whereClause = and(...conditions);

          const records = await db
            .select({
              id: programAttendance.id,
              userId: programAttendance.userId,
              week: programAttendance.week,
              status: programAttendance.status,
              notes: programAttendance.notes,
              progressNote: programAttendance.progressNote,
              user: {
                id: user.id,
                name: user.name,
                image: user.image,
              },
            })
            .from(programAttendance)
            .leftJoin(user, eq(programAttendance.userId, user.id))
            .where(whereClause);

          return records;
        }),

      update: adminOrProgramManagerProcedure
        .input(
          z.object({
            batchId: z.string(),
            records: z.array(
              z.object({
                userId: z.string(),
                week: z.number(),
                status: z.enum(["present", "absent", "excused"]),
                notes: z.string().optional(),
                progressNote: z.string().optional(),
              }),
            ),
          }),
        )
        .handler(async ({ input }) => {
          const batch = await db.query.programBatch.findFirst({
            where: eq(programBatch.id, input.batchId),
          });
          if (!batch) throw new Error("Batch not found");

          await db.transaction(async (tx) => {
            for (const record of input.records) {
              if (record.week < 1 || record.week > batch.durationWeeks) {
                throw new Error(`Invalid week ${record.week}. Batch duration is ${batch.durationWeeks} weeks.`);
              }

              // Check if exists
              const existing = await tx.query.programAttendance.findFirst({
                where: and(
                  eq(programAttendance.batchId, input.batchId),
                  eq(programAttendance.userId, record.userId),
                  eq(programAttendance.week, record.week),
                ),
              });

              if (existing) {
                await tx
                  .update(programAttendance)
                  .set({
                    status: record.status,
                    notes: record.notes,
                    progressNote: record.progressNote,
                  })
                  .where(eq(programAttendance.id, existing.id));
              } else {
                await tx.insert(programAttendance).values({
                  id: randomUUID(),
                  batchId: input.batchId,
                  userId: record.userId,
                  week: record.week,
                  status: record.status,
                  notes: record.notes,
                  progressNote: record.progressNote,
                });
              }
            }
          });
          return { success: true };
        }),
    },

    attachmentRequests: {
      list: adminOrProgramManagerProcedure
        .input(
          z.object({
            limit: z.number().default(50),
            offset: z.number().default(0),
            status: z.enum(requestStatusEnum.enumValues).optional(),
            batchId: z.string().optional(),
          }),
        )
        .handler(async ({ input }) => {
          const conditions = [];
          if (input.status) {
            conditions.push(eq(programAttachmentRequest.status, input.status));
          }
          if (input.batchId) {
            conditions.push(eq(programAttachmentRequest.batchId, input.batchId));
          }

          const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

          const items = await db.query.programAttachmentRequest.findMany({
            where: whereClause,
            limit: input.limit,
            offset: input.offset,
            with: {
              batch: true,
              requestedBy: true,
              reviewedBy: true,
              attachment: true,
            },
            orderBy: [desc(programAttachmentRequest.createdAt)],
          });

          const [total] = await db.select({ count: count() }).from(programAttachmentRequest).where(whereClause);

          return {
            data: items,
            pagination: {
              total: total?.count ?? 0,
              limit: input.limit,
              offset: input.offset,
            },
          };
        }),

      approve: adminOrProgramManagerProcedure
        .input(z.object({ requestId: z.string() }))
        .handler(async ({ input, context }) => {
          const request = await db.query.programAttachmentRequest.findFirst({
            where: eq(programAttachmentRequest.id, input.requestId),
          });

          if (!request) throw new Error("Request not found");
          if (request.status !== "pending") throw new Error("Request is not pending");

          await db.transaction(async (tx) => {
            const data = request.data as Record<string, unknown>;

            if (request.action === "create") {
              const typedData = data as { name: string; type: "file" | "video" | "link" | "tool"; url: string };
              await tx.insert(programAttachment).values({
                id: randomUUID(),
                batchId: request.batchId,
                name: typedData.name,
                type: typedData.type,
                url: typedData.url,
              });
            } else if (request.action === "update") {
              if (!request.attachmentId) throw new Error("Attachment ID missing for update");
              await tx.update(programAttachment).set(data).where(eq(programAttachment.id, request.attachmentId));
            } else if (request.action === "delete") {
              if (!request.attachmentId) throw new Error("Attachment ID missing for delete");
              await tx.delete(programAttachment).where(eq(programAttachment.id, request.attachmentId));
            }

            await tx
              .update(programAttachmentRequest)
              .set({
                status: "approved",
                reviewedBy: context.session.user.id,
                updatedAt: new Date(),
              })
              .where(eq(programAttachmentRequest.id, input.requestId));
          });

          // Notify Mentor
          await sendNotification({
            userId: request.requestedBy,
            title: "Attachment Request Approved",
            message: `Your request to ${request.action} attachment has been approved.`,
            type: "success",
            link: `/mentor/batches/${request.batchId}/attachments`,
          });

          return { success: true };
        }),

      reject: adminOrProgramManagerProcedure
        .input(z.object({ requestId: z.string(), reason: z.string().optional() }))
        .handler(async ({ input, context }) => {
          const request = await db.query.programAttachmentRequest.findFirst({
            where: eq(programAttachmentRequest.id, input.requestId),
          });

          if (!request) throw new Error("Request not found");

          await db
            .update(programAttachmentRequest)
            .set({
              status: "rejected",
              rejectionReason: input.reason,
              reviewedBy: context.session.user.id,
              updatedAt: new Date(),
            })
            .where(eq(programAttachmentRequest.id, input.requestId));

          // Notify Mentor
          await sendNotification({
            userId: request.requestedBy,
            title: "Attachment Request Rejected",
            message: `Your request to ${request.action} attachment has been rejected.${
              input.reason ? ` Reason: ${input.reason}` : ""
            }`,
            type: "error",
            link: `/mentor/batches/${request.batchId}/attachments`,
          });

          return { success: true };
        }),
    },
  },
};
