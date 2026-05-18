import { resend } from "./resend";

/**
 * Mail Provider — Resend only
 *
 * Usage:
 *   import { mail } from "@mulai-plus/api/lib/mail";
 *   await mail.send({ to: "user@example.com", subject: "...", html: "..." });
 */

export interface SendOptions {
  from?: string;
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

class MailProvider {
  async send(options: SendOptions): Promise<{ success: boolean; id?: string; provider: string; error?: unknown }> {
    if (!resend.isConfigured) {
      return { success: false, provider: "none", error: "RESEND_API_KEY is not configured" };
    }

    const result = await resend.emails.send({ ...options });
    if (result.success && result.data) {
      return { success: true, id: result.data.id, provider: "resend" };
    }

    return { success: false, provider: "resend", error: result.error };
  }

  async sendBatch(
    items: SendOptions[],
  ): Promise<{ success: boolean; results: { index: number; success: boolean; provider: string; id?: string }[] }> {
    const results: { index: number; success: boolean; provider: string; id?: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      const result = await this.send(item);
      results.push({ index: i, success: result.success, provider: result.provider, id: result.id });
    }
    return { success: results.every((r) => r.success), results };
  }

  get isReady(): boolean {
    return resend.isConfigured;
  }
}

export const mail = new MailProvider();
