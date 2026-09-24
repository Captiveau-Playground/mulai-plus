/**
 * Analytics events — satu tabel ringan untuk "signal" chatbot.
 *
 * Events yang direkam (funnel & kualitas):
 *  - chat_start            : request valid masuk
 *  - cache_hit / cache_miss
 *  - quota_exhausted       : guest kena batas 3
 *  - rate_limited          : kena 15/mnt (auth) atau 5/mnt (guest)
 *  - guardrail_blocked     : input ditolak
 *  - reply_ok              : jawaban LLM sukses
 *  - reply_fallback        : LLM gagal → fallback
 *  - tool_called           : payload {tool, args}
 *  - feedback (up/down)
 *  - login_click
 *
 * Tanpa jenis event lain → admin/stats bisa agregate dari sini (dashboard RAG dsb).
 */
import type { AppContext } from "../config";
import { unsafe } from "../db/db";

export type ChatEvent =
  | "chat_start"
  | "cache_hit"
  | "cache_miss"
  | "quota_exhausted"
  | "rate_limited"
  | "guardrail_blocked"
  | "reply_ok"
  | "reply_fallback"
  | "tool_called"
  | "feedback"
  | "login_click";

export async function ensureEventsTable(c: AppContext): Promise<void> {
  await unsafe(
    c,
    `CREATE TABLE IF NOT EXISTS chatbot_events (
       id SERIAL PRIMARY KEY,
       session_id TEXT,
       user_id TEXT,
       event TEXT NOT NULL,
       payload JSONB,
       created_at TIMESTAMPTZ DEFAULT NOW()
     );
     CREATE INDEX IF NOT EXISTS idx_chatbot_events_created ON chatbot_events(created_at);
     CREATE INDEX IF NOT EXISTS idx_chatbot_events_event ON chatbot_events(event);`,
  ).catch(() => {});
}

/** Fire-and-forget recorder (tidak pernah bikin request gagal). */
export function record(
  c: AppContext,
  payload: { sessionId?: string; userId?: string | null; event: ChatEvent; data?: Record<string, unknown> },
): void {
  unsafe(c, "INSERT INTO chatbot_events (session_id, user_id, event, payload) VALUES ($1, $2, $3, $4)", [
    payload.sessionId ?? null,
    payload.userId ?? null,
    payload.event,
    JSON.stringify(payload.data ?? {}),
  ]).catch(() => {});
}
