import type { AppContext } from "../config";

/** Baca kuota harian dari KV (diatur via Admin UI). null = pakai env/default. */
export async function kvDailyQuota(c: AppContext): Promise<number | null> {
  const kv = (c.env as { AI_KV?: { get(key: string): Promise<string | null> } }).AI_KV;
  if (!kv) return null;
  try {
    const v = await kv.get("ai:settings:daily-quota");
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Limit efektif: KV (0/-1 = unlimited) > env > default 40. */
export async function resolveDailyQuota(c: AppContext): Promise<number> {
  const kv = await kvDailyQuota(c);
  if (kv !== null && kv <= 0) return 0; // 0/-1 = nonaktif
  if (kv !== null && kv > 0) return Math.round(kv);
  return Number((c.env as Record<string, string | undefined>).QUOTA_DAILY ?? 40);
}
