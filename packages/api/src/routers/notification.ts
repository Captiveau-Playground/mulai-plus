import { and, db, desc, eq } from "@mulai-plus/db";
import { notification } from "@mulai-plus/db/schema/notification";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const notificationRouter = {
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.number().default(0),
      }),
    )
    .handler(async ({ context, input }) => {
      const items = await db
        .select()
        .from(notification)
        .where(eq(notification.userId, context.session.user.id))
        .orderBy(desc(notification.createdAt))
        .limit(input.limit)
        .offset(input.cursor);

      return items;
    }),

  markAsRead: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
    await db
      .update(notification)
      .set({ read: true })
      .where(and(eq(notification.id, input.id), eq(notification.userId, context.session.user.id)));

    return { success: true };
  }),

  markAllAsRead: protectedProcedure.handler(async ({ context }) => {
    await db.update(notification).set({ read: true }).where(eq(notification.userId, context.session.user.id));

    return { success: true };
  }),

  getUnreadCount: protectedProcedure.handler(async ({ context }) => {
    const unread = await db
      .select({ id: notification.id })
      .from(notification)
      .where(and(eq(notification.userId, context.session.user.id), eq(notification.read, false)));
    return { count: unread.length };
  }),
};
