import { db, eq } from "@better-auth-admin/db";
import { systemSettings } from "@better-auth-admin/db/schema/settings";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { unosend } from "../lib/unosend";

export const settingsRouter = {
  get: protectedProcedure.input(z.object({ key: z.string() })).handler(async ({ input }) => {
    const setting = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, input.key),
    });
    if (!setting && input.key === "email_config") {
      return { enabled: true };
    }
    return setting?.value ?? null;
  }),

  update: protectedProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.any(), // JSON object
        description: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { key, value, description } = input;
      const existing = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, key),
      });

      if (existing) {
        await db
          .update(systemSettings)
          .set({ value, description, updatedAt: new Date() })
          .where(eq(systemSettings.key, key));
      } else {
        await db.insert(systemSettings).values({
          key,
          value,
          description,
        });
      }
      return { success: true };
    }),

  email: {
    sendTest: protectedProcedure
      .input(
        z.object({
          to: z.string().email(),
          subject: z.string().min(1),
          html: z.string().min(1),
        }),
      )
      .handler(async ({ input }) => {
        // Check if email sending is enabled globally?
        // Actually, for "Test Email", we might want to bypass the global "enabled" flag
        // or specifically check if "test mode" is allowed.
        // For now, let's just send it.

        await unosend.send({
          to: input.to,
          subject: input.subject,
          html: input.html,
        });

        return { success: true };
      }),
  },
};
