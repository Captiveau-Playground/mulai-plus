import { env } from "@mulai-plus/env/server";

/**
 * Unosend API Client
 * Documentation: https://docs.unosend.co/introduction
 */

const BASE_URL = "https://www.unosend.co/api/v1";

export interface SendEmailOptions {
  from?: string;
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  replyTo?: string;
  templateId?: string;
  variables?: Record<string, unknown>;
}

export interface Template {
  id: string;
  name: string;
  subject?: string;
  html?: string;
  text?: string;
  variables?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateTemplateOptions {
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables?: string[];
}

export interface UpdateTemplateOptions {
  name?: string;
  subject?: string;
  html?: string;
  text?: string;
  variables?: string[];
}

class UnosendClient {
  private apiKey: string | undefined;
  private defaultFrom: string;

  constructor() {
    this.apiKey = env.UNOSEND_API_KEY;
    this.defaultFrom = env.UNOSEND_FROM_EMAIL || "noreply@captiveau.fun";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ success: boolean; data?: T; error?: any }> {
    if (!this.apiKey) {
      console.warn("UNOSEND_API_KEY is not set. Request skipped.");
      return { success: false, error: "Missing API Key" };
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        let errorData: any = {};
        try {
          errorData = responseText ? JSON.parse(responseText) : { raw: responseText };
        } catch {
          errorData = { raw: responseText };
        }
        console.error(`Unosend API Error [${endpoint}] Status: ${response.status} ${response.statusText}:`, errorData);
        return { success: false, error: { status: response.status, ...errorData } };
      }

      const data = await response.json();
      return { success: true, data: data as T };
    } catch (error) {
      console.error(`Unosend Exception [${endpoint}]:`, error);
      return { success: false, error };
    }
  }

  public emails = {
    send: async (options: SendEmailOptions) => {
      const payload = {
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        template_id: options.templateId,
        variables: options.variables,
      };

      // Remove undefined keys
      const cleanPayload = JSON.parse(JSON.stringify(payload));

      return this.request<{ id: string; status: string }>("/emails", {
        method: "POST",
        body: JSON.stringify(cleanPayload),
      });
    },

    /**
     * Send multiple emails in batches (Client-side implementation)
     * Useful for bulk operations
     */
    sendBatch: async (items: SendEmailOptions[], concurrency = 5) => {
      const results: {
        index: number;
        success: boolean;
        data?: any;
        error?: any;
      }[] = [];

      // Process in chunks
      for (let i = 0; i < items.length; i += concurrency) {
        const chunk = items.slice(i, i + concurrency);
        const chunkPromises = chunk.map((item, idx) =>
          this.emails.send(item).then((res) => ({
            index: i + idx,
            ...res,
          })),
        );

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      }

      return results;
    },
  };

  public templates = {
    list: async () => {
      const res = await this.request<{ items: Template[] } | Template[]>("/templates", {
        method: "GET",
      });

      if (res.success && res.data) {
        // Normalize response: if it has 'items' property, return that, otherwise assume it's an array
        const templates = "items" in res.data ? (res.data as { items: Template[] }).items : (res.data as Template[]);
        return { ...res, data: templates };
      }

      return { ...res, data: undefined };
    },

    get: async (id: string) => {
      return this.request<Template>(`/templates/${id}`, {
        method: "GET",
      });
    },

    create: async (options: CreateTemplateOptions) => {
      return this.request<Template>("/templates", {
        method: "POST",
        body: JSON.stringify(options),
      });
    },

    update: async (id: string, options: UpdateTemplateOptions) => {
      // Note: Assuming PUT or PATCH is supported. Usually PATCH for partial updates.
      // If API requires PUT with full object, this might need adjustment.
      return this.request<Template>(`/templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(options),
      });
    },

    delete: async (id: string) => {
      return this.request<{ success: boolean }>(`/templates/${id}`, {
        method: "DELETE",
      });
    },
  };

  // Backward compatibility alias
  public send = this.emails.send;
}

export const unosend = new UnosendClient();
