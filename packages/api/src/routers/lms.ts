import { randomUUID } from "node:crypto";
import { and, asc, db, desc, eq, isNull, or } from "@better-auth-admin/db";
import { user } from "@better-auth-admin/db/schema/auth";
import { category, course, courseLesson, courseSection, courseTag, tag } from "@better-auth-admin/db/schema/lms";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";

export const lmsRouter = {
  public: {
    categories: publicProcedure.handler(async () => {
      return await db.select().from(category).orderBy(desc(category.createdAt));
    }),
    courses: publicProcedure
      .input(
        z
          .object({
            categoryId: z.string().optional(),
          })
          .optional(),
      )
      .handler(async ({ input }) => {
        const result = await db.query.course.findMany({
          where: (fields, { and, eq }) =>
            and(eq(fields.published, true), input?.categoryId ? eq(fields.categoryId, input.categoryId) : undefined),
          with: {
            category: true,
          },
          orderBy: desc(course.createdAt),
        });
        return result;
      }),
    courseBySlug: publicProcedure
      .input(
        z.object({
          slug: z.string().min(1),
        }),
      )
      .handler(async ({ input }) => {
        const result = await db.query.course.findFirst({
          where: eq(course.slug, input.slug),
          with: {
            category: true,
            user: true,
            tags: {
              with: {
                tag: true,
              },
            },
            sections: {
              where: isNull(courseSection.deletedAt),
              orderBy: asc(courseSection.order),
              with: {
                lessons: {
                  where: and(isNull(courseLesson.deletedAt), eq(courseLesson.status, "published")),
                  orderBy: asc(courseLesson.order),
                },
              },
            },
          },
        });
        // Only return if published to ensure student-only visibility
        if (!result?.published) return null;
        return result;
      }),
  },
  mentors: {
    list: protectedProcedure.handler(async () => {
      return await db
        .select()
        .from(user)
        .where(or(eq(user.role, "admin"), eq(user.role, "mentor")));
    }),
  },
  tag: {
    list: protectedProcedure.handler(async () => {
      return await db.select().from(tag).orderBy(desc(tag.createdAt));
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          slug: z.string().min(1),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();
        await db.insert(tag).values({
          id,
          ...input,
        });
        return { success: true, id };
      }),
  },
  category: {
    list: protectedProcedure.handler(async () => {
      return await db.select().from(category).orderBy(desc(category.createdAt));
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          slug: z.string().min(1),
          description: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();
        await db.insert(category).values({
          id,
          ...input,
        });
        return { success: true, id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1),
          slug: z.string().min(1),
          description: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        await db
          .update(category)
          .set({
            name: input.name,
            slug: input.slug,
            description: input.description,
          })
          .where(eq(category.id, input.id));
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(category).where(eq(category.id, input.id));
      return { success: true };
    }),
  },
  course: {
    list: protectedProcedure.handler(async () => {
      return await db.query.course.findMany({
        with: {
          category: true,
          user: true,
          tags: {
            with: {
              tag: true,
            },
          },
        },
        orderBy: desc(course.createdAt),
      });
    }),
    get: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const result = await db.query.course.findFirst({
        where: eq(course.id, input.id),
        with: {
          category: true,
          user: true,
          tags: {
            with: {
              tag: true,
            },
          },
          sections: {
            where: isNull(courseSection.deletedAt),
            orderBy: asc(courseSection.order),
            with: {
              lessons: {
                where: isNull(courseLesson.deletedAt),
                orderBy: asc(courseLesson.order),
              },
            },
          },
        },
      });
      return result;
    }),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          slug: z.string().min(1),
          description: z.string().optional(),
          categoryId: z.string().optional(),
          thumbnailUrl: z.string().optional(),
          published: z.boolean().default(false),
          benefits: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
          userId: z.string().optional(),
          price: z.number().int().default(0),
          discountType: z.enum(["fixed", "percentage"]).default("fixed"),
          discountValue: z.number().int().default(0),
        }),
      )
      .handler(async ({ input, context }) => {
        const id = randomUUID();
        await db.insert(course).values({
          id,
          title: input.title,
          slug: input.slug,
          description: input.description,
          categoryId: input.categoryId,
          thumbnailUrl: input.thumbnailUrl,
          published: input.published,
          benefits: input.benefits,
          userId: input.userId || context.session.user.id,
          price: input.price,
          discountType: input.discountType,
          discountValue: input.discountValue,
        });

        if (input.tags && input.tags.length > 0) {
          await db.insert(courseTag).values(
            input.tags.map((tagId) => ({
              courseId: id,
              tagId,
            })),
          );
        }
        return { success: true, id };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          title: z.string().min(1),
          slug: z.string().min(1),
          description: z.string().optional(),
          categoryId: z.string().optional(),
          thumbnailUrl: z.string().optional(),
          published: z.boolean().optional(),
          benefits: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
          userId: z.string().optional(),
          price: z.number().int().optional(),
          discountType: z.enum(["fixed", "percentage"]).optional(),
          discountValue: z.number().int().optional(),
        }),
      )
      .handler(async ({ input }) => {
        await db
          .update(course)
          .set({
            title: input.title,
            slug: input.slug,
            description: input.description,
            categoryId: input.categoryId,
            thumbnailUrl: input.thumbnailUrl,
            published: input.published,
            benefits: input.benefits,
            userId: input.userId,
            price: input.price,
            discountType: input.discountType,
            discountValue: input.discountValue,
          })
          .where(eq(course.id, input.id));

        if (input.tags) {
          await db.delete(courseTag).where(eq(courseTag.courseId, input.id));
          if (input.tags.length > 0) {
            await db.insert(courseTag).values(
              input.tags.map((tagId) => ({
                courseId: input.id,
                tagId,
              })),
            );
          }
        }
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(course).where(eq(course.id, input.id));
      return { success: true };
    }),
  },
  section: {
    create: protectedProcedure
      .input(
        z.object({
          courseId: z.string(),
          title: z.string().min(1),
          order: z.number().int().default(0),
        }),
      )
      .handler(async ({ input }) => {
        await db.insert(courseSection).values({
          id: randomUUID(),
          ...input,
        });
        return { success: true };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          title: z.string().min(1),
          order: z.number().int().optional(),
        }),
      )
      .handler(async ({ input }) => {
        await db
          .update(courseSection)
          .set({
            title: input.title,
            order: input.order,
          })
          .where(eq(courseSection.id, input.id));
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db
        .update(courseSection)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(courseSection.id, input.id));
      return { success: true };
    }),
    reorder: protectedProcedure
      .input(
        z.object({
          items: z.array(
            z.object({
              id: z.string(),
              order: z.number().int(),
            }),
          ),
        }),
      )
      .handler(async ({ input }) => {
        await db.transaction(async (tx) => {
          for (const item of input.items) {
            await tx.update(courseSection).set({ order: item.order }).where(eq(courseSection.id, item.id));
          }
        });
        return { success: true };
      }),
  },
  lesson: {
    create: protectedProcedure
      .input(
        z.object({
          sectionId: z.string(),
          courseId: z.string().optional(),
          title: z.string().min(1),
          description: z.string().optional(),
          videoUrl: z.string().url().optional().or(z.literal("")),
          order: z.number().int().default(0),
          status: z.enum(["draft", "published", "archived"]).default("draft"),
          duration: z.number().int().optional(),
        }),
      )
      .handler(async ({ input }) => {
        // If courseId is not provided, fetch it from section?
        // For now relying on client to provide it or leaving it null if schema allows (it allows)
        // But better to fetch it if missing.
        let courseId: string | null = input.courseId ?? null;
        if (!courseId) {
          const section = await db.query.courseSection.findFirst({
            where: eq(courseSection.id, input.sectionId),
            columns: { courseId: true },
          });
          courseId = section?.courseId ?? null;
        }

        await db.insert(courseLesson).values({
          id: randomUUID(),
          sectionId: input.sectionId,
          courseId,
          title: input.title,
          description: input.description,
          videoUrl: input.videoUrl || null,
          order: input.order,
          status: input.status,
          duration: input.duration,
        });
        return { success: true };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          sectionId: z.string().optional(), // For moving lesson
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          videoUrl: z.string().url().optional().or(z.literal("")),
          order: z.number().int().optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
          duration: z.number().int().optional(),
        }),
      )
      .handler(async ({ input }) => {
        await db
          .update(courseLesson)
          .set({
            sectionId: input.sectionId,
            title: input.title,
            description: input.description,
            videoUrl: input.videoUrl || null,
            order: input.order,
            status: input.status,
            duration: input.duration,
          })
          .where(eq(courseLesson.id, input.id));
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db
        .update(courseLesson)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(courseLesson.id, input.id));
      return { success: true };
    }),
    reorder: protectedProcedure
      .input(
        z.object({
          items: z.array(
            z.object({
              id: z.string(),
              order: z.number().int(),
            }),
          ),
        }),
      )
      .handler(async ({ input }) => {
        await db.transaction(async (tx) => {
          for (const item of input.items) {
            await tx.update(courseLesson).set({ order: item.order }).where(eq(courseLesson.id, item.id));
          }
        });
        return { success: true };
      }),
  },
};
