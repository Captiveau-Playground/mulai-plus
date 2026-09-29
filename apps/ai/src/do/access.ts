/**
 * Project 3 — akses rate limit: DO jika tersedia, fallback ke DB.
 */
import type { AppContext } from "../config";
import { acquireRateLimitSlot } from "../policies/rate-limit";

export type RateLimitStub = {
  check(key: string, limit: number): Promise<boolean>;
};

function stubFor(c: AppContext, entityKey: string): RateLimitStub | null {
  const binding = (c.env as { RATE_LIMIT_DO?: DurableObjectNamespace }).RATE_LIMIT_DO;
  if (!binding) return null;
  return binding.get(binding.idFromName(entityKey)) as unknown as RateLimitStub;
}

/** true = boleh lanjut (≤ limit). Menangani fallback & error internal. */
export async function allowRequest(c: AppContext, entityKey: string, limit: number, dbKey: string): Promise<boolean> {
  const stub = stubFor(c, entityKey);
  if (stub) {
    try {
      return await stub.check(entityKey, limit);
    } catch (e) {
      console.error("[rl-do] error:", (e as Error).message);
      // jatuh ke DB — pastikan tidak jadi 500
    }
  }
  return acquireRateLimitSlot(c, dbKey, limit);
}
