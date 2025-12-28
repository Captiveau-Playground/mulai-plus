import { randomUUID } from "node:crypto";
import { asc, db, desc, eq } from "@better-auth-admin/db";
import { category, course, courseLesson, courseSection } from "@better-auth-admin/db/schema/lms";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const lmsRouter = {
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
        await db.insert(category).values({
          id: randomUUID(),
          ...input,
        });
        return { success: true };
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
        },
        orderBy: desc(course.createdAt),
      });
    }),
    get: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const result = await db.query.course.findFirst({
        where: eq(course.id, input.id),
        with: {
          category: true,
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
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();
        await db.insert(course).values({
          id,
          ...input,
        });
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
          })
          .where(eq(course.id, input.id));
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
