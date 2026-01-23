import { db } from "@better-auth-admin/db";
import { notification } from "@better-auth-admin/db/schema/notification";
import { nanoid } from "nanoid";

type SendNotificationParams = {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
};

export async function sendNotification({ userId, title, message, type = "info", link }: SendNotificationParams) {
  await db.insert(notification).values({
    id: nanoid(),
    userId,
    title,
    message,
    type,
    link,
  });
}
