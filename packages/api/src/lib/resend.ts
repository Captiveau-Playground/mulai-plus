import { env } from "@mulai-plus/env/server";

/**
 * Resend API Client
 * Documentation: https://resend.com/docs
 *
 * Mirrors the Unosend interface for drop-in compatibility.
 */

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

  constructor() {
    this.apiKey = env.RESEND_API_KEY;
    this.defaultFrom = env.RESEND_FROM_EMAIL || env.UNOSEND_FROM_EMAIL || "noreply@captiveau.fun";
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey?.startsWith("re_"));
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<{ success: boolean; data?: T; error?: unknown }> {
    if (!this.apiKey) {
      return { success: false, error: "RESEND_API_KEY is not configured" };
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(`Resend API Error [${endpoint}] Status: ${response.status}:`, result);
        return { success: false, error: result };
      }

      return { success: true, data: result as T };
    } catch (error) {
      console.error(`Resend Exception [${endpoint}]:`, error);
      return { success: false, error };
    }
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
      // Resend supports sending to multiple recipients in one call,
      // but for batch we iterate to match Unosend's interface
      const results: { index: number; success: boolean; data?: SendResult; error?: unknown }[] = [];

      for (let i = 0; i < items.length; i++) {
        const result = await this.emails.send(items[i]);
        results.push({ index: i, ...result });
      }

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
