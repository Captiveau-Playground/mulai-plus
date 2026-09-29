/**
 * Rate limiting — DB-backed sliding minute bucket.
 *
 * Kebijakan chatbot:
 *  - GUEST (non-auth): quota 3 msg/session (lihat quota.ts), plus rate limit ringan 5 req/mnt
 *  - AUTH: kuota "unlimited", tapi rate limit 15 req/menit/user
 *
 * kenapa DB (Hyperdrive) bukan in-memory? Isolate Workers tidak ter-share,
 * jadi counter in-memory per-request/islate tidak akurat. Pakai baris atomik
 * di Postgres — persis pola `reserveMessageSlot` (anti-race).
 */
import type { AppContext } from "../config";
import { unsafe } from "../db/db";

export const AUTH_RATE_LIMIT_PER_MIN = 15;
export const GUEST_RATE_LIMIT_PER_MIN = 5;

/** Menit berjalan (epoch detik / 60) → bucket key. */
export function currentBucket(now: number = Date.now()): number {
  return Math.floor(now / 60_000);
}

/**
 * Reserve 1 slot rate limit. Return TRUE jika diperbolehkan (≤ limit).
 * Konsumsi slot terjadi di sini; > limit → ditolak (request berikutnya juga
 * ditolak sampai jendela 1 menit berganti).
 */
export async function acquireRateLimitSlot(
  c: AppContext,
  key: string,
  limit: number,
  now: number = Date.now(),
): Promise<boolean> {
  const bucket = currentBucket(now);
  const row = await unsafe(
    c,
    `INSERT INTO chatbot_rate_limits (key, bucket, count) VALUES ($1, $2, 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN chatbot_rate_limits.bucket = $2 THEN chatbot_rate_limits.count + 1 ELSE 1 END,
       bucket = $2,
       updated_at = NOW()
     RETURNING count`,
    [key, bucket],
  );
  const count = Number(row[0]?.count ?? 1);
  return count <= limit;
}

/** Bersihkan baris rate limit lama (dipanggil admin/maintenance opsional). */
export async function cleanupRateLimits(c: AppContext, maxAgeMinutes = 15): Promise<void> {
  await unsafe(c, "DELETE FROM chatbot_rate_limits WHERE updated_at < NOW() - ($1 || ' minutes')::interval", [
    maxAgeMinutes,
  ]).catch(() => {});
}
