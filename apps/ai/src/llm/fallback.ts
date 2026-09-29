/**
 * Fallback chain model — KV-based switching.
 *
 * Flow: primary (qwen3-30b) → bila gagal 2× dalam 60s → switch ke fast
 * (glm-4.7-flash) selama 5 menit → sukses → reset.
 */
import type { AppContext } from "../config";

const FALLBACK_KEY = "ai:llm:fallback";
const SWITCH_AFTER_FAILS = 2;
const SWITCH_WINDOW_MS = 60_000;
const SWITCH_HOLD_MS = 300_000;

type FbState = { fails: number; failAt: number; switchedUntil: number };

export type FallbackMode = "primary" | "fast";

export async function fallbackMode(c: AppContext): Promise<FallbackMode> {
  const kv = (c.env as { AI_KV?: KVNamespace }).AI_KV;
  if (!kv) return "primary";
  try {
    const st = (await kv.get<FbState>(FALLBACK_KEY, "json")) ?? { fails: 0, failAt: 0, switchedUntil: 0 };
    if (Date.now() < st.switchedUntil) return "fast";
    if (st.fails >= SWITCH_AFTER_FAILS && Date.now() - st.failAt < SWITCH_WINDOW_MS) return "fast";
    return "primary";
  } catch {
    return "primary";
  }
}

export async function fallbackMark(c: AppContext, ok: boolean): Promise<void> {
  const kv = (c.env as { AI_KV?: KVNamespace }).AI_KV;
  if (!kv) return;
  try {
    const prev = (await kv.get<FbState>(FALLBACK_KEY, "json")) ?? { fails: 0, failAt: 0, switchedUntil: 0 };
    const next: FbState = ok
      ? { fails: 0, failAt: Date.now(), switchedUntil: 0 }
      : {
          fails: prev.fails + (Date.now() - prev.failAt < SWITCH_WINDOW_MS ? prev.fails : 0) + 1,
          failAt: Date.now(),
          switchedUntil: prev.fails + 1 >= SWITCH_AFTER_FAILS ? Date.now() + SWITCH_HOLD_MS : 0,
        };
    await kv.put(FALLBACK_KEY, JSON.stringify(next));
  } catch {
    /* non-fatal */
  }
}
