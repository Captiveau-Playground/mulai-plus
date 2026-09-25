/**
 * Project 3 — Rate limit DURABLE OBJECT (single-writer, anti-race).
 *
 * Menggantikan tabel `chatbot_rate_limits` (Postgres) untuk window 1 menit:
 * - satu DO per entity key (user:u:xxx / session:s:xxx)
 * - counter + bucket disimpan di state storage SQLite DO
 * - `check()` atomic karena DO single-writer
 *
 * Fallback: kalau binding RATE_LIMIT_DO tidak ada (dev/local), route pakai
 * tabel DB lama (policies/rate-limit.ts).
 */
import { DurableObject } from "cloudflare:workers";

type Bucket = { m: number; c: number };

export class RateLimitDO extends DurableObject {
  /** true jika masih ≤ limit (slot dikonsumsi). */
  async check(key: string, limit: number): Promise<boolean> {
    const nowBucket = Math.floor(Date.now() / 60_000);
    const cur = (await this.ctx.storage.get<Bucket>(key)) ?? { m: nowBucket, c: 0 };
    if (cur.m !== nowBucket) {
      cur.m = nowBucket;
      cur.c = 0;
    }
    if (cur.c >= limit) return false;
    cur.c += 1;
    await this.ctx.storage.put(key, cur);
    return true;
  }
}

/** Buat/stabilkan stub untuk test: DO perlu `env` binding stub. */
export { DurableObject };
