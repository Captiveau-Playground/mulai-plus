import { env } from "@mulai-plus/env/server";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { adminProcedure, publicProcedure } from "../index";

// ─── Helpers ────────────────────────────────────────────────────────────────────

const AI_URL = (env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");

/** Base headers: semua call ke AI service otomatis pake Bearer token. */
const baseHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  ...(env.AI_API_KEY ? { Authorization: `Bearer ${env.AI_API_KEY}` } : {}),
};

/** Headers untuk public endpoint (forward user context buat rate limit). */
function sessionHeaders(context: any): Record<string, string> {
  const h: Record<string, string> = {};
  if (context.session?.user?.id) h["x-user-id"] = context.session.user.id;
  const sid = context.headers?.get?.("x-session-id");
  if (sid) h["x-session-id"] = sid;
  return h;
}

/** Wrapper fetch — otomatis Bearer + error handling. */
async function aiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${AI_URL}${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: { ...baseHeaders, ...(options.headers as Record<string, string>) },
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new ORPCError("BAD_GATEWAY", {
      message: `AI service error: ${resp.status}`,
      data: { url, status: resp.status, body },
    });
  }
  return resp.json();
}

// ─── Schemas ─────────────────────────────────────────────────────────────────────

const chatSchema = z.object({ message: z.string().min(1) });
const historySchema = z.object({ session_id: z.string() });
const feedbackSchema = z.object({ message_id: z.number(), feedback: z.enum(["up", "down"]).nullable() });
const trackLoginSchema = z.object({ session_id: z.string() });
const listSessionsSchema = z.object({
  page: z.number().default(0),
  per_page: z.number().default(20),
  search: z.string().optional(),
  banned_only: z.boolean().default(false),
});
const sessionIdSchema = z.object({ session_id: z.string() });
const updateCreditSchema = z.object({ session_id: z.string(), credit_limit: z.number().nullable() });
const toggleBanSchema = z.object({ session_id: z.string(), banned: z.boolean(), reason: z.string().nullable() });
const updateNotesSchema = z.object({ session_id: z.string(), notes: z.string().nullable() });

// ─── Router ──────────────────────────────────────────────────────────────────────

export const aiRouter = {
  // ── Public (chatbot widget) ────────────────────────────────

  /** Send a chat message and get streaming/non-streaming response. */
  chat: publicProcedure.input(chatSchema).handler(async ({ input, context }) => {
    return aiFetch("/api/chat", {
      method: "POST",
      headers: sessionHeaders(context),
      body: JSON.stringify({ message: input.message }),
    });
  }),

  /** Get remaining chat quota for current session. */
  quota: publicProcedure.handler(async ({ context }) => {
    return aiFetch("/api/quota", { headers: sessionHeaders(context) });
  }),

  /** Get chat history for a session. */
  history: publicProcedure.input(historySchema).handler(async ({ input }) => {
    return aiFetch(`/api/history?session_id=${encodeURIComponent(input.session_id)}`);
  }),

  /** Submit thumbs up/down feedback for a message. */
  feedback: publicProcedure.input(feedbackSchema).handler(async ({ input }) => {
    return aiFetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }),

  /** Track guest → login click for funnel analytics. */
  trackLoginClick: publicProcedure.input(trackLoginSchema).handler(async ({ input }) => {
    return aiFetch("/api/track/login-click", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }),

  // ── Admin ─────────────────────────────────────────────────

  admin: {
    /** Overall chatbot stats (sessions, messages, etc.). */
    stats: adminProcedure.handler(async () => {
      return aiFetch("/api/admin/stats");
    }),

    /** Chatbot → login conversion funnel. */
    funnel: adminProcedure.handler(async () => {
      return aiFetch("/api/admin/funnel");
    }),

    sessions: {
      /** List all chatbot sessions with pagination & search. */
      list: adminProcedure.input(listSessionsSchema).handler(async ({ input }) => {
        const params = new URLSearchParams({
          page: String(input.page),
          per_page: String(input.per_page),
          banned_only: String(input.banned_only),
        });
        if (input.search) params.set("search", input.search);
        return aiFetch(`/api/admin/sessions?${params}`);
      }),

      /** Get full session detail with all messages. */
      get: adminProcedure.input(sessionIdSchema).handler(async ({ input }) => {
        return aiFetch(`/api/admin/sessions/${encodeURIComponent(input.session_id)}`);
      }),

      /** Set custom credit limit for a session. */
      updateCredit: adminProcedure.input(updateCreditSchema).handler(async ({ input }) => {
        return aiFetch(`/api/admin/sessions/${encodeURIComponent(input.session_id)}/credit`, {
          method: "PUT",
          body: JSON.stringify({ credit_limit: input.credit_limit }),
        });
      }),

      /** Ban or unban a session. */
      toggleBan: adminProcedure.input(toggleBanSchema).handler(async ({ input }) => {
        return aiFetch(`/api/admin/sessions/${encodeURIComponent(input.session_id)}/ban`, {
          method: "PUT",
          body: JSON.stringify({ banned: input.banned, reason: input.reason }),
        });
      }),

      /** Set admin notes for a session. */
      updateNotes: adminProcedure.input(updateNotesSchema).handler(async ({ input }) => {
        return aiFetch(`/api/admin/sessions/${encodeURIComponent(input.session_id)}/notes`, {
          method: "PUT",
          body: JSON.stringify({ notes: input.notes }),
        });
      }),

      /** Reset message_count to 0 for a session. */
      resetUsage: adminProcedure.input(sessionIdSchema).handler(async ({ input }) => {
        return aiFetch(`/api/admin/sessions/${encodeURIComponent(input.session_id)}/reset-usage`, {
          method: "PUT",
          body: JSON.stringify({ message_count: 0 }),
        });
      }),
    },
  },
};
