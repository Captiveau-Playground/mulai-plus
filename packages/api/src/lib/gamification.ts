import { db, eq } from "@mulai-plus/db/db";
import { tmbUserStats } from "@mulai-plus/db/schema/tmb";

/**
 * XP, level, dan streak harian untuk modul assessment.
 *
 * Aturan XP (dipakai `finalizeSession`, sama dengan label di kartu test):
 *   xp = jumlah soal dijawab + 10 × bagian tuntas
 *   → minat 120 soal / 1 bagian = 130 XP · bakat 100 soal / 5 bagian = 150 XP
 *
 * Streak = jumlah HARI berturut-turut mengerjakan tes:
 *   • hari yang sama  → tidak berubah
 *   • bersambung (1 hari) → +1
 *   • bolong (>1 hari) → reset ke 1  (dulu selalu +1 walau bolong berhari-hari)
 */
export const XP_PER_SECTION = 10;
export const XP_PER_LEVEL = 150;

export function levelOf(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

/** Selisih hari kalender (bukan 24 jam) antara dua tanggal. */
function dayDiff(a: Date, b: Date): number {
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const db_ = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((da - db_) / 86_400_000);
}

export function nextStreak(prevStreak: number, lastActivityAt: Date | null, now = new Date()): number {
  if (!lastActivityAt) return 1;
  const diff = dayDiff(now, new Date(lastActivityAt));
  if (diff <= 0) return Math.max(1, prevStreak); // hari yang sama (atau jam mundur) → tetap
  if (diff === 1) return Math.max(1, prevStreak) + 1; // bersambung
  return 1; // bolong
}

export interface ProgressResult {
  xp: number;
  level: number;
  streak: number;
  testsCompleted: number;
}

/** Tambahkan XP + perbarui level/streak. Idempoten per pemanggilan (bukan per hari). */
export async function awardProgress(
  userId: string,
  xp: number,
  opts: { testsCompleted?: number } = {},
): Promise<ProgressResult> {
  const addTests = opts.testsCompleted ?? 1;
  const now = new Date();
  const existing = await db.query.tmbUserStats.findFirst({ where: eq(tmbUserStats.userId, userId) });
  const newXp = Math.max(0, Math.round((existing?.xp ?? 0) + Math.max(0, Math.round(xp))));
  const streak = nextStreak(existing?.streak ?? 0, existing?.lastActivityAt ?? null, now);
  const testsCompleted = (existing?.testsCompleted ?? 0) + addTests;
  const level = levelOf(newXp);

  await db
    .insert(tmbUserStats)
    .values({ userId, xp: newXp, level, streak, testsCompleted, lastActivityAt: now })
    .onConflictDoUpdate({
      target: tmbUserStats.userId,
      set: { xp: newXp, level, streak, testsCompleted, lastActivityAt: now },
    });

  return { xp: newXp, level, streak, testsCompleted };
}
