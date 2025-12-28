import { randomUUID } from "node:crypto";
import { asc, db, desc, eq, or } from "@better-auth-admin/db";
import { user } from "@better-auth-admin/db/schema/auth";
import { category, course, courseLesson, courseSection, courseTag, tag } from "@better-auth-admin/db/schema/lms";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const lmsRouter = {
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
            orderBy: asc(courseSection.order),
            with: {
              lessons: {
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
      await db.delete(courseSection).where(eq(courseSection.id, input.id));
      return { success: true };
    }),
  },
  lesson: {
    create: protectedProcedure
      .input(
        z.object({
          sectionId: z.string(),
          title: z.string().min(1),
          videoUrl: z.string().url(),
          order: z.number().int().default(0),
          duration: z.number().int().optional(),
        }),
      )
      .handler(async ({ input }) => {
        await db.insert(courseLesson).values({
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
          videoUrl: z.string().url(),
          order: z.number().int().optional(),
          duration: z.number().int().optional(),
        }),
      )
      .handler(async ({ input }) => {
        await db
          .update(courseLesson)
          .set({
            title: input.title,
            videoUrl: input.videoUrl,
            order: input.order,
            duration: input.duration,
          })
          .where(eq(courseLesson.id, input.id));
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(courseLesson).where(eq(courseLesson.id, input.id));
      return { success: true };
    }),
  },
};
