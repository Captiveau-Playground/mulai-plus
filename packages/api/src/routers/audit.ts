import { and, asc, count, db, desc, eq, ilike, or } from "@mulai-plus/db";
import { auditLog } from "@mulai-plus/db/schema/audit";
import { user } from "@mulai-plus/db/schema/auth";
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
        search: z.string().optional(),
        sortBy: z.enum(["createdAt", "action", "resource"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .handler(async ({ input }) => {
      const filters = [];
      if (input.userId) filters.push(eq(auditLog.userId, input.userId));
      if (input.action) filters.push(eq(auditLog.action, input.action));
      if (input.search) {
        filters.push(
          or(
            ilike(auditLog.action, `%${input.search}%`),
            ilike(auditLog.resource, `%${input.search}%`),
            ilike(user.name, `%${input.search}%`),
            ilike(user.email, `%${input.search}%`),
          ),
        );
      }

      const orderBy = input.sortOrder === "asc" ? asc(auditLog[input.sortBy]) : desc(auditLog[input.sortBy]);

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
        .orderBy(orderBy);

      const [total] = await db
        .select({ count: count() })
        .from(auditLog)
        .leftJoin(user, eq(auditLog.userId, user.id))
        .where(and(...filters));

      return {
        items,
        total: total?.count || 0,
      };
    }),
};
