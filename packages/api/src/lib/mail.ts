import type { SendEmailOptions as ResendSendOptions } from "./resend";
import { resend } from "./resend";
import type { SendEmailOptions as UnosendSendOptions } from "./unosend";
import { unosend } from "./unosend";

/**
 * Unified Mail Provider
 *
 * Primary: Resend
 * Fallback: Unosend
 *
 * Automatically falls back to Unosend if:
 * - Resend is not configured (no API key)
 * - Resend request fails
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

function toResendOptions(opts: SendOptions): ResendSendOptions {
  return { ...opts };
}

function toUnosendOptions(opts: SendOptions): UnosendSendOptions {
  return { ...opts };
}

class MailProvider {
  private primary = resend;
  private fallback = unosend;

  /**
   * Send email via primary provider (Resend), fallback to Unosend on failure.
   */
  async send(options: SendOptions): Promise<{ success: boolean; id?: string; provider: string; error?: unknown }> {
    // Try Resend first
    if (this.primary.isConfigured) {
      const result = await this.primary.emails.send(toResendOptions(options));
      if (result.success && result.data) {
        return { success: true, id: result.data.id, provider: "resend" };
      }
      console.warn("[mail] Resend failed, falling back to Unosend:", result.error);
    }

    // Fallback to Unosend
    const fallbackResult = await this.fallback.emails.send(toUnosendOptions(options));
    if (fallbackResult.success && fallbackResult.data) {
      return {
        success: true,
        id:
          typeof fallbackResult.data === "object" && "id" in fallbackResult.data
            ? (fallbackResult.data as { id: string }).id
            : undefined,
        provider: "unosend",
      };
    }

    return { success: false, provider: "none", error: fallbackResult.error };
  }

  /**
   * Send batch emails — uses primary, falls back individually
   */
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

  /**
   * Check if any provider is configured
   */
  get isReady(): boolean {
    return this.primary.isConfigured || Boolean(this.fallback);
  }

  /**
   * Override providers at runtime (useful for testing)
   */
  setPrimary(provider: typeof resend) {
    this.primary = provider;
  }

  setFallback(provider: typeof unosend) {
    this.fallback = provider;
  }
}

export const mail = new MailProvider();
