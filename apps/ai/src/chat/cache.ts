/**
 * Answer cache — port apps/ai-python/src/cache.py (exact match via hash).
 * Fuzzy match TODO (butuh threshold aman + query popular questions).
 */
import type { AppContext } from "../config";
import { queryOne, unsafe } from "../db/db";

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type CacheEntry = {
  answer: string;
  follow_ups: unknown;
  token_usage: unknown;
};

export async function exactCacheGet(c: AppContext, question: string, scope = ""): Promise<CacheEntry | null> {
  // Key = pertanyaan + scope (fingerprint konteks: profil siswa + tier model).
  // Tanpa scope: user A/B tanya persis sama → jawaban sama walau profil beda (bocor personalisasi).
  const hash = await sha256(`${question.trim().toLowerCase()}|${scope}`);
  const r = await queryOne<{ answer: string; follow_ups: unknown; token_usage: unknown }>(
    c,
    `SELECT answer, follow_ups, token_usage FROM chatbot_cache
     WHERE question_hash = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
    [hash],
  );
  return r;
}

export async function exactCachePut(
  c: AppContext,
  question: string,
  answer: string,
  followUps: string[] = [],
  tokenUsage: Record<string, unknown> = {},
  scope = "",
): Promise<void> {
  const hash = await sha256(`${question.trim().toLowerCase()}|${scope}`);
  const norm = normalizeQuestion(question);
  await unsafe(
    c,
    `INSERT INTO chatbot_cache (question_hash, question, question_normalized, answer, follow_ups, token_usage, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '30 days')
     ON CONFLICT (question_hash) DO UPDATE
       SET answer = EXCLUDED.answer,
           follow_ups = EXCLUDED.follow_ups,
           token_usage = EXCLUDED.token_usage,
           expires_at = NOW() + INTERVAL '30 days',
           hit_count = chatbot_cache.hit_count + 1,
           last_accessed_at = NOW()`,
    [hash, question, norm, answer, JSON.stringify(followUps), JSON.stringify(tokenUsage)],
  );
}
