import { db, desc, eq } from "@better-auth-admin/db";
import { testimonial } from "@better-auth-admin/db/schema/testimonials";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";

export const testimonialsRouter = {
  list: protectedProcedure.handler(async () => {
    const testimonials = await db.query.testimonial.findMany({
      orderBy: [desc(testimonial.createdAt)],
      with: {
        user: true,
      },
    });
    return testimonials;
  }),

  // Public list for landing page (optional but useful)
  listPublic: publicProcedure.handler(async () => {
    const testimonials = await db.query.testimonial.findMany({
      where: eq(testimonial.isVisible, true),
      orderBy: [desc(testimonial.createdAt)],
      with: {
        user: {
          columns: {
            name: true,
            image: true,
            role: true,
          },
        },
      },
    });
    return testimonials;
  }),

  create: protectedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        content: z.string().min(1),
        education: z.string().optional(),
        programName: z.string().optional(),
        rating: z.string().default("5"),
        isVisible: z.boolean().default(true),
      }),
    )
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      await db.insert(testimonial).values({
        id,
        ...input,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        userId: z.string().min(1),
        content: z.string().min(1),
        education: z.string().optional(),
        programName: z.string().optional(),
        rating: z.string().optional(),
        isVisible: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      await db.update(testimonial).set(data).where(eq(testimonial.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      await db.delete(testimonial).where(eq(testimonial.id, input.id));
      return { success: true };
    }),
};
