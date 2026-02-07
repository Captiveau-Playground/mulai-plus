import { randomUUID } from "node:crypto";
import { db, eq } from "@mulai-plus/db";
import { role, studentDetail, user } from "@mulai-plus/db/schema/auth";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const userRouter = {
  getProfile: protectedProcedure.handler(async ({ context }) => {
    const userData = await db.query.user.findFirst({
      where: eq(user.id, context.session.user.id),
      with: {
        studentDetail: true,
      },
    });

    if (!userData) return null;

    return {
      ...userData,
      ...userData.studentDetail,
    };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        phoneNumber: z.string().optional(),
        school: z.string().optional(),
        educationLevel: z.string().optional(),
        socialMedia: z
          .object({
            instagram: z.string().optional(),
            tiktok: z.string().optional(),
            threads: z.string().optional(),
            linkedin: z.string().optional(),
          })
          .optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const { name, ...studentData } = input;

      if (name) {
        await db
          .update(user)
          .set({
            name,
            updatedAt: new Date(),
          })
          .where(eq(user.id, context.session.user.id));
      }

      if (Object.keys(studentData).length > 0) {
        const existing = await db.query.studentDetail.findFirst({
          where: eq(studentDetail.userId, context.session.user.id),
        });

        if (existing) {
          await db
            .update(studentDetail)
            .set({
              ...studentData,
              updatedAt: new Date(),
            })
            .where(eq(studentDetail.userId, context.session.user.id));
        } else {
          await db.insert(studentDetail).values({
            id: randomUUID(),
            userId: context.session.user.id,
            ...studentData,
          });
        }
      }

      return { success: true };
    }),

  myPermissions: protectedProcedure.handler(async ({ context }) => {
    if (!context.session?.user) return [];
    const userRole = context.session.user.role || "student";
    const [roleData] = await db.select().from(role).where(eq(role.id, userRole));
    return roleData?.permissions || [];
  }),

  listStudents: protectedProcedure.handler(async () => {
    const students = await db.query.user.findMany({
      where: eq(user.role, "student"),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });
    return students;
  }),
};
