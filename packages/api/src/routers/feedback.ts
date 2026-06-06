import { randomUUID } from "node:crypto";
import { and, asc, db, desc, eq, gte, lte } from "@mulai-plus/db";
import { user as userSchema } from "@mulai-plus/db/schema/auth";
import { feedbackCampaign, feedbackQuestion, feedbackResponse, feedbackTemplate } from "@mulai-plus/db/schema/programs";
import { z } from "zod";
import { adminOrProgramManagerProcedure, protectedProcedure } from "../index";

export const feedbackRouter = {
  // ─── Templates (Admin/PM only) ──────────────────────────
  template: {
    list: adminOrProgramManagerProcedure.handler(async () => {
      const templates = await db.query.feedbackTemplate.findMany({
        with: { questions: { orderBy: asc(feedbackQuestion.order) } },
        orderBy: desc(feedbackTemplate.createdAt),
      });
      return templates;
    }),

    get: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const template = await db.query.feedbackTemplate.findFirst({
        where: eq(feedbackTemplate.id, input.id),
        with: { questions: { orderBy: asc(feedbackQuestion.order) } },
      });
      if (!template) throw new Error("Template not found");
      return template;
    }),

    create: adminOrProgramManagerProcedure
      .input(
        z.object({
          name: z.string().min(1),
          type: z.enum(["mentee_to_mentor", "mentee_to_platform", "mentor_to_platform"]),
          description: z.string().optional(),
          questions: z.array(
            z.object({
              question: z.string().min(1),
              order: z.number(),
              questionType: z.enum(["text", "likert"]).optional(),
              likertOptions: z.any().optional(),
            }),
          ),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();
        await db.transaction(async (tx) => {
          await tx.insert(feedbackTemplate).values({
            id,
            name: input.name,
            type: input.type,
            description: input.description,
          });
          for (const q of input.questions) {
            await tx.insert(feedbackQuestion).values({
              id: randomUUID(),
              templateId: id,
              question: q.question,
              questionType: q.questionType || "text",
              likertOptions: q.likertOptions || null,
              order: q.order,
            });
          }
        });
        return { id };
      }),

    update: adminOrProgramManagerProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
          questions: z
            .array(
              z.object({
                id: z.string().optional(),
                question: z.string().min(1),
                order: z.number(),
                questionType: z.enum(["text", "likert"]).optional(),
                likertOptions: z.any().optional(),
              }),
            )
            .optional(),
        }),
      )
      .handler(async ({ input }) => {
        await db.transaction(async (tx) => {
          if (input.name || input.description || input.isActive !== undefined) {
            await tx
              .update(feedbackTemplate)
              .set({
                ...(input.name ? { name: input.name } : {}),
                ...(input.description !== undefined ? { description: input.description } : {}),
                ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
              })
              .where(eq(feedbackTemplate.id, input.id));
          }

          if (input.questions) {
            // Delete existing questions
            await tx.delete(feedbackQuestion).where(eq(feedbackQuestion.templateId, input.id));
            // Re-insert
            for (const q of input.questions) {
              await tx.insert(feedbackQuestion).values({
                id: q.id || randomUUID(),
                templateId: input.id,
                question: q.question,
                questionType: q.questionType || "text",
                likertOptions: q.likertOptions || null,
                order: q.order,
              });
            }
          }
        });
        return { success: true };
      }),

    delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(feedbackTemplate).where(eq(feedbackTemplate.id, input.id));
      return { success: true };
    }),
  },

  // ─── Campaigns (Admin/PM only) ──────────────────────────
  campaign: {
    list: adminOrProgramManagerProcedure
      .input(z.object({ batchId: z.string().optional() }))
      .handler(async ({ input }) => {
        const where = input.batchId ? eq(feedbackCampaign.batchId, input.batchId) : undefined;
        const campaigns = await db.query.feedbackCampaign.findMany({
          where,
          with: {
            template: { with: { questions: { orderBy: asc(feedbackQuestion.order) } } },
            batch: true,
          },
          orderBy: desc(feedbackCampaign.createdAt),
        });
        return campaigns;
      }),

    create: adminOrProgramManagerProcedure
      .input(
        z.object({
          templateId: z.string(),
          batchId: z.string(),
          startDate: z.string(),
          endDate: z.string(),
        }),
      )
      .handler(async ({ input, context }) => {
        await db.insert(feedbackCampaign).values({
          id: randomUUID(),
          templateId: input.templateId,
          batchId: input.batchId,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          status: "scheduled",
          createdBy: context.session.user.id,
        });
        return { success: true };
      }),

    updateStatus: adminOrProgramManagerProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.enum(["scheduled", "open", "closed"]),
        }),
      )
      .handler(async ({ input }) => {
        await db.update(feedbackCampaign).set({ status: input.status }).where(eq(feedbackCampaign.id, input.id));
        return { success: true };
      }),

    delete: adminOrProgramManagerProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(feedbackCampaign).where(eq(feedbackCampaign.id, input.id));
      return { success: true };
    }),
  },

  // ─── Responses ──────────────────────────────────────────
  response: {
    // Get active campaigns for current user (for popup)
    myActive: protectedProcedure
      .input(z.object({ batchId: z.string().optional() }))
      .handler(async ({ input, context }) => {
        const userId = context.session.user.id;
        const now = new Date();

        // Get user role to filter campaigns by target audience
        const [currentUser] = await db
          .select({ role: userSchema.role })
          .from(userSchema)
          .where(eq(userSchema.id, userId));

        if (!currentUser) return [];

        const userRole = currentUser.role;

        const activeCampaigns = await db.query.feedbackCampaign.findMany({
          where: and(
            eq(feedbackCampaign.status, "open"),
            lte(feedbackCampaign.startDate, now),
            gte(feedbackCampaign.endDate, now),
            input.batchId ? eq(feedbackCampaign.batchId, input.batchId) : undefined,
          ),
          with: {
            template: { with: { questions: { orderBy: asc(feedbackQuestion.order) } } },
            batch: true,
          },
        });

        // Filter out campaigns user already responded to
        const userResponseCampaignIds = await db
          .select({ campaignId: feedbackResponse.campaignId })
          .from(feedbackResponse)
          .where(eq(feedbackResponse.fromUserId, userId));

        const respondedIds = new Set(userResponseCampaignIds.map((r) => r.campaignId));

        // Filter by template type based on user role:
        // - mentee_to_mentor / mentee_to_platform → only for students
        // - mentor_to_platform → only for mentors
        const roleTargetMap: Record<string, string[]> = {
          mentee_to_mentor: ["student"],
          mentee_to_platform: ["student"],
          mentor_to_platform: ["mentor"],
        };

        return activeCampaigns
          .filter((c) => {
            if (respondedIds.has(c.id)) return false;
            const allowedRoles = roleTargetMap[c.template.type];
            if (!allowedRoles) return false;
            return allowedRoles.includes(userRole);
          })
          .map((c) => ({
            id: c.id,
            type: c.template.type,
            templateName: c.template.name,
            batchName: c.batch.name,
            questions: c.template.questions.map((q) => ({
              id: q.id,
              question: q.question,
              order: q.order,
              questionType: q.questionType,
              likertOptions: q.likertOptions as string[] | null,
            })),
          }));
      }),

    // Submit responses
    submit: protectedProcedure
      .input(
        z.object({
          campaignId: z.string(),
          answers: z.array(
            z.object({
              questionId: z.string(),
              answer: z.string().min(1),
            }),
          ),
        }),
      )
      .handler(async ({ input, context }) => {
        const campaign = await db.query.feedbackCampaign.findFirst({
          where: eq(feedbackCampaign.id, input.campaignId),
          with: { template: true },
        });
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== "open") throw new Error("Campaign is not open");

        const now = new Date();
        if (now < campaign.startDate || now > campaign.endDate) throw new Error("Campaign is not within active period");

        const userId = context.session.user.id;

        await db.transaction(async (tx) => {
          let toUserId: string | null = null;

          // For mentee_to_mentor, find the mentor assigned to this user in this batch
          if (campaign.template.type === "mentee_to_mentor") {
            // Find mentor-mentee assignment
            const { mentorMentee } = await import("@mulai-plus/db/schema/programs");
            const assignment = await tx.query.mentorMentee.findFirst({
              where: and(eq(mentorMentee.studentId, userId), eq(mentorMentee.batchId, campaign.batchId)),
              with: { mentor: true },
            });
            if (assignment) {
              toUserId = assignment.mentorId;
            }
          }

          for (const answer of input.answers) {
            await tx.insert(feedbackResponse).values({
              id: randomUUID(),
              campaignId: input.campaignId,
              questionId: answer.questionId,
              fromUserId: userId,
              toUserId,
              batchId: campaign.batchId,
              answer: answer.answer,
            });
          }
        });

        return { success: true };
      }),

    // Admin/PM view responses for a campaign
    listByCampaign: adminOrProgramManagerProcedure
      .input(z.object({ campaignId: z.string() }))
      .handler(async ({ input }) => {
        const responses = await db.query.feedbackResponse.findMany({
          where: eq(feedbackResponse.campaignId, input.campaignId),
          with: {
            question: true,
            fromUser: { columns: { id: true, name: true, email: true } },
            toUser: { columns: { id: true, name: true } },
          },
          orderBy: asc(feedbackResponse.createdAt),
        });
        return responses;
      }),
  },
};
