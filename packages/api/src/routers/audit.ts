import { and, count, db, desc, eq } from "@better-auth-admin/db";
import { auditLog } from "@better-auth-admin/db/schema/audit";
import { user } from "@better-auth-admin/db/schema/auth";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const auditRouter = {
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        userId: z.string().optional(),
        action: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const filters = [];
      if (input.userId) filters.push(eq(auditLog.userId, input.userId));
      if (input.action) filters.push(eq(auditLog.action, input.action));

      const items = await db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          resource: auditLog.resource,
          details: auditLog.details,
          ipAddress: auditLog.ipAddress,
          userAgent: auditLog.userAgent,
          createdAt: auditLog.createdAt,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          },
        })
        .from(auditLog)
        .leftJoin(user, eq(auditLog.userId, user.id))
        .where(and(...filters))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(desc(auditLog.createdAt));

      const [total] = await db
        .select({ count: count() })
        .from(auditLog)
        .where(and(...filters));

      return {
        items,
        total: total?.count || 0,
      };
    }),
};
