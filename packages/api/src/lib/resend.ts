import { env } from "@mulai-plus/env/server";

/**
 * Resend API Client
 * Documentation: https://resend.com/docs
 *
 * Mirrors the Unosend interface for drop-in compatibility.
 *
 * Rate limiting: Resend allows max 2 req/s. This client enforces a minimum
 * 600ms delay between requests and retries 429 errors with exponential backoff.
 */

const RATE_LIMIT_INTERVAL_MS = 600; // ~1.6 req/s, safe under the 2 req/s limit
const MAX_RETRIES = 3;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface SendEmailOptions {
  from?: string;
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  replyTo?: string;
  /** Resend-specific: pass React.Email component as function call */
  react?: unknown;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: { filename: string; content: Buffer | string; path?: string }[];
  tags?: { name: string; value: string }[];
  headers?: Record<string, string>;
}

export interface SendResult {
  id: string;
}

class ResendClient {
  private apiKey: string | undefined;
  private defaultFrom: string;
  private baseUrl = "https://api.resend.com";
  private lastRequestTime = 0;

  constructor() {
    this.apiKey = env.RESEND_API_KEY;
    this.defaultFrom = env.RESEND_FROM_EMAIL || env.UNOSEND_FROM_EMAIL || "noreply@captiveau.fun";
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey?.startsWith("re_"));
  }

  /** Enforce rate limit: wait until at least RATE_LIMIT_INTERVAL_MS since last request */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_INTERVAL_MS) {
      await delay(RATE_LIMIT_INTERVAL_MS - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<{ success: boolean; data?: T; error?: unknown }> {
    if (!this.apiKey) {
      return { success: false, error: "RESEND_API_KEY is not configured" };
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      await this.waitForRateLimit();

      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        // 429 Rate Limit — retry with exponential backoff
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          const backoffMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : Math.min(1000 * 2 ** attempt, 30_000);

          console.warn(`Resend rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${backoffMs}ms`);
          await delay(backoffMs);
          lastError = { status: 429, message: "Rate limited" };
          continue;
        }

        const result = await response.json();

        if (!response.ok) {
          console.error(`Resend API Error [${endpoint}] Status: ${response.status}:`, result);
          return { success: false, error: result };
        }

        return { success: true, data: result as T };
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.min(1000 * 2 ** attempt, 10_000);
          console.warn(`Resend request failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${backoffMs}ms`);
          await delay(backoffMs);
        }
      }
    }

    console.error(`Resend request failed after ${MAX_RETRIES + 1} attempts:`, lastError);
    return { success: false, error: lastError };
  }

  public emails = {
    send: async (options: SendEmailOptions): Promise<{ success: boolean; data?: SendResult; error?: unknown }> => {
      const payload: Record<string, unknown> = {
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to : [options.to],
      };

      if (options.subject) payload.subject = options.subject;
      if (options.html) payload.html = options.html;
      if (options.text) payload.text = options.text;
      if (options.replyTo) payload.reply_to = options.replyTo;
      if (options.react) payload.react = options.react;
      if (options.cc) payload.cc = options.cc;
      if (options.bcc) payload.bcc = options.bcc;
      if (options.attachments) payload.attachments = options.attachments;
      if (options.tags) payload.tags = options.tags;
      if (options.headers) payload.headers = options.headers;

      return this.request<SendResult>("/emails", payload);
    },

    sendBatch: async (
      items: SendEmailOptions[],
    ): Promise<{ success: boolean; data?: SendResult[]; error?: unknown }> => {
      const results: { index: number; success: boolean; data?: SendResult; error?: unknown }[] = [];

      console.log(`Resend batch: sending ${items.length} emails (rate limited to 1 per ${RATE_LIMIT_INTERVAL_MS}ms)`);

      for (let i = 0; i < items.length; i++) {
        const result = await this.emails.send(items[i]);
        results.push({ index: i, ...result });

        // Log progress for large batches
        if (items.length > 5 && (i + 1) % 5 === 0) {
          console.log(`Resend batch progress: ${i + 1}/${items.length}`);
        }
      }

      const successCount = results.filter((r) => r.success).length;
      console.log(`Resend batch complete: ${successCount}/${items.length} sent successfully`);

      const allOk = results.every((r) => r.success);
      return { success: allOk, data: results.filter((r) => r.success).map((r) => r.data!) };
    },
  };

  // Backward compatibility alias
  public send = (options: SendEmailOptions) => {
    return this.emails.send(options);
  };
}

export const resend = new ResendClient();
