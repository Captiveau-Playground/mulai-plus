/**
 * Persistensi chatbot — port apps/ai-python/src/chatbot_db.py.
 * Tabel sudah ada (dibuat Drizzle / service python), jadi di sini cukup operasi.
 */
import type { AppContext } from "../config";
import { query, queryOne, unsafe } from "./db";

export type ChatSession = {
  id: string;
  user_id: string | null;
  is_auth: boolean;
  message_count: number;
  credit_limit: number | null;
  banned: boolean;
  banned_reason: string | null;
};

export type ChatMessageRow = {
  id: number;
  role: string;
  content: string;
  feedback: string | null;
  created_at: string | null;
};

export async function getOrCreateSession(
  c: AppContext,
  sessionId: string,
  userId: string | null,
): Promise<ChatSession> {
  const isAuth = userId !== null;
  const row = await unsafe(
    c,
    `INSERT INTO chatbot_sessions (id, user_id, is_auth)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET last_active = NOW()
     RETURNING *`,
    [sessionId, userId, isAuth],
  );
  const r = ((row as Record<string, any>[])[0] ?? {}) as Record<string, any>;
  return { ...r, is_auth: !!r.is_auth, banned: !!r.banned } as ChatSession;
}

export async function isBanned(c: AppContext, sessionId: string): Promise<boolean> {
  const r = await queryOne<{ banned: boolean }>(c, "SELECT banned FROM chatbot_sessions WHERE id = $1", [sessionId]);
  return r?.banned ?? false;
}

/** Atomic reserve quota: increment HANYA jika masih di bawah limit. null = habis. */
export async function reserveMessageSlot(c: AppContext, sessionId: string, maxCount: number): Promise<number | null> {
  const row = await unsafe(
    c,
    `UPDATE chatbot_sessions
     SET message_count = message_count + 1, last_active = NOW()
     WHERE id = $1 AND message_count < $2
     RETURNING message_count`,
    [sessionId, maxCount],
  );
  const r = (row as Record<string, any>[])[0];
  return r ? Number(r.message_count) : null;
}

export async function saveMessage(
  c: AppContext,
  sessionId: string,
  role: string,
  content: string,
  tokens: { prompt?: number; completion?: number; cost?: number; model?: string } = {},
): Promise<{ id: number; created_at: string | null }> {
  const row = await unsafe(
    c,
    `INSERT INTO chatbot_messages (session_id, role, content, prompt_tokens, completion_tokens, model, cost)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, created_at`,
    [sessionId, role, content, tokens.prompt ?? 0, tokens.completion ?? 0, tokens.model ?? null, tokens.cost ?? 0],
  );
  const r = ((row as Record<string, any>[])[0] ?? {}) as Record<string, any>;
  return { id: Number(r.id), created_at: r.created_at ? String(r.created_at) : null };
}

/** Riwayat percakapan (terbaru dulu di DB, dibalik biar kronologis). */
export async function getHistory(c: AppContext, sessionId: string, limit = 6): Promise<ChatMessageRow[]> {
  const rows = await query(
    c,
    `SELECT id, role, content, feedback, created_at
     FROM chatbot_messages
     WHERE session_id = $1
     ORDER BY id DESC
     LIMIT $2`,
    [sessionId, limit],
  );
  return (rows as Record<string, any>[])
    .slice()
    .reverse()
    .map((m) => ({
      id: Number(m.id),
      role: m.role,
      content: m.content,
      feedback: m.feedback ?? null,
      created_at: m.created_at ? String(m.created_at) : null,
    }));
}

/** Hitung sisa kuota: limit efektif - pemakaian. */
export async function countMessages(c: AppContext, sessionId: string): Promise<number> {
  const r = await queryOne<{ n: string }>(c, "SELECT COUNT(*) as n FROM chatbot_messages WHERE session_id = $1", [
    sessionId,
  ]);
  return Number(r?.n ?? 0);
}

export async function setFeedback(c: AppContext, messageId: number, feedback: string | null): Promise<void> {
  await unsafe(c, "UPDATE chatbot_messages SET feedback = $1 WHERE id = $2", [feedback, messageId]);
}

/** Session terbaru milik user + apakah banned (untuk ban-by-user). */
export async function isUserBanned(c: AppContext, userId: string): Promise<boolean> {
  const r = await queryOne<{ banned: boolean }>(
    c,
    "SELECT banned FROM chatbot_sessions WHERE user_id = $1 ORDER BY last_active DESC LIMIT 1",
    [userId],
  );
  return r?.banned ?? false;
}
