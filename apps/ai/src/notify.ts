/**
 * Discord notif untuk AI worker — wrapper @mulai-plus/notify dengan AppContext.
 * No-op bila DISCORD_WEBHOOK_URL belum diset.
 */
import { type NotifyEventInput, notifyDiscord } from "@mulai-plus/notify/discord";
import type { AppContext } from "./config";

export function notify(c: AppContext, input: Omit<NotifyEventInput, "webhookUrl" | "waitUntil">): void {
  notifyDiscord({
    ...input,
    webhookUrl: c.env.DISCORD_WEBHOOK_URL,
    waitUntil: (c as { executionCtx?: { waitUntil(p: Promise<unknown>): void } }).executionCtx?.waitUntil,
  });
}
