/**
 * Project 2 — Circuit breaker LLM berbasis KV (shared antar-isolate).
 *
 * Status "LLM lagi turun / baru gagal" disimpan di KV supaya SEMUA isolate
 * AI worker serentak tahu — hemat retry & token saat provider bermasalah.
 * Fallback: tanpa binding KV (dev/local/VPS) → pola in-memory lama.
 */
import type { AppContext } from "../config";

const KEY = "ai:llm:cb";
const COUNT_AFTER = 2;
const COOLDOWN_MS = 60_000;

type CbState = { ok: boolean; failCount: number; failAt: number };

export function getKv(c: AppContext): KVNamespace | undefined {
  return (c.env as { AI_KV?: KVNamespace }).AI_KV;
}

export async function kvShortCircuit(c: AppContext): Promise<boolean | null> {
  const kv = getKv(c);
  if (!kv) return null; // pakai in-memory

  try {
    const v = (await kv.get<CbState>(KEY, "json")) ?? { ok: true, failCount: 0, failAt: 0 };
    if (v.ok) return false;
    if (Date.now() - v.failAt > COOLDOWN_MS) return false; // sudah lewat cooldown
    return v.failCount >= COUNT_AFTER;
  } catch {
    return null; // KV bermasalah → jangan blok, biar in-memory yang urus
  }
}

export async function kvMark(c: AppContext, ok: boolean): Promise<void> {
  const kv = getKv(c);
  if (!kv) return;

  try {
    const prev = (await kv.get<CbState>(KEY, "json")) ?? { ok: true, failCount: 0, failAt: 0 };
    const next: CbState = ok
      ? { ok: true, failCount: 0, failAt: Date.now() }
      : { ok: false, failCount: (prev.ok ? 0 : prev.failCount) + 1, failAt: Date.now() };
    await kv.put(KEY, JSON.stringify(next));
  } catch {
    /* non-fatal */
  }
}
