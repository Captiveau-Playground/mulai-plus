/**
 * UserContext — konteks siswa untuk asisten (join lintas tabel oleh user_id).
 * Kolerasi data yang sudah ada: student_detail + tmb_profiles + student_reco_profile
 * + program_application. Fail-safe: erreur → null (asisten tetap jalan generik).
 */
import type { AppContext } from "../config";
import { query, queryOne } from "../db/db";

export type UserContext = {
  school?: string;
  level?: string;
  /** Kode RIASEC dari hasil tes (mis. "I") atau label "Inquisitif". */
  riasecPrimary?: string;
  riasecCode?: string;
  hollandScores?: Record<string, number>;
  abilityScores?: Record<string, unknown>;
  isTmbTested?: boolean;
  goals?: string[];
  prefs?: Record<string, unknown>;
  applications?: { programId: string; status: string }[];
};

const RIASEC_LABELS: Record<string, string> = {
  R: "Realistis",
  I: "Inquisitif",
  A: "Artistik",
  S: "Sosial",
  E: "Enterprising",
  C: "Conventional",
};

export async function buildUserContext(c: AppContext, userId: string | null): Promise<UserContext | null> {
  if (!userId) return null;
  // Semua sumber bersifat OPSIONAL: tabel sekunder yang belum ada/hilang
  // tidak boleh membuat seluruh konteks gagal (fail-fast tiap bagian).
  const safeGet = async <T = Record<string, any>>(sqlText: string, params: unknown[]): Promise<T | null> => {
    try {
      return await queryOne<T>(c, sqlText, params);
    } catch {
      return null;
    }
  };
  try {
    const detail = await safeGet<{ school: string | null; education_level: string | null }>(
      "SELECT school, education_level FROM student_detail WHERE user_id = $1",
      [userId],
    );
    const tmb = await safeGet<{ education_level: string | null; school_name: string | null }>(
      "SELECT education_level, school_name FROM tmb_profiles WHERE user_id = $1",
      [userId],
    );
    const reco = await safeGet<{ riasec_primary: string | null; goals: unknown; prefs: unknown }>(
      "SELECT riasec_primary, goals, prefs FROM student_reco_profile WHERE user_id = $1",
      [userId],
    );
    // SUMBER KEBENARAN hasil tes: tmb_assessment_results (holland_code/scores)
    const tmbRes = await safeGet<{ holland_code: string | null; holland_scores: unknown; ability_scores: unknown }>(
      `SELECT holland_code, holland_scores, ability_scores
       FROM tmb_assessment_results
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    const hollandCode = tmbRes?.holland_code?.toUpperCase() ?? null;
    const primaryCode = hollandCode?.[0] ?? null;
    const scores = (tmbRes?.holland_scores ?? {}) as Record<string, number>;
    const apps = await query(
      c,
      "SELECT program_id, status FROM program_application WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
      [userId],
    );

    return {
      school: (detail?.school || tmb?.school_name || undefined) ?? undefined,
      level: (detail?.education_level || tmb?.education_level || undefined) ?? undefined,
      riasecPrimary:
        reco?.riasec_primary ??
        (primaryCode ? `${primaryCode} · ${RIASEC_LABELS[primaryCode] ?? primaryCode}` : undefined),
      riasecCode: primaryCode ?? undefined,
      hollandScores: Object.keys(scores).length ? scores : undefined,
      abilityScores: (tmbRes?.ability_scores as Record<string, unknown> | undefined) ?? undefined,
      isTmbTested: !!tmbRes || !!reco?.riasec_primary,
      goals: Array.isArray(reco?.goals) ? (reco.goals as string[]) : undefined,
      prefs: reco?.prefs as Record<string, unknown> | undefined,
      applications: (apps ?? []).map((a) => ({ programId: a.program_id, status: a.status })),
    };
  } catch {
    return null;
  }
}

/** Teks konteks yang disuntikkan ke prompt (hanya data relevan, tanpa privasi berlebih). */
export function contextPrompt(ctx: UserContext | null): string | null {
  if (!ctx) return null;
  const parts: string[] = ["KONTEKS SISWA (gunakan untuk personalisasi, jangan sebutkan ID):"];
  if (ctx.school) parts.push(`- Sekolah: ${ctx.school}`);
  if (ctx.level) parts.push(`- Jenjang: ${ctx.level}`);
  if (ctx.riasecPrimary) parts.push(`- Tipe minat utama (RIASEC): ${ctx.riasecPrimary}`);
  if (ctx.riasecCode || ctx.hollandScores) {
    const order = [...(ctx.hollandScores ? Object.entries(ctx.hollandScores) : [])]
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    parts.push(`- Profil minat: ${ctx.riasecCode ?? ""}${order ? ` (skor RIASEC: ${order})` : ""}`);
  }
  if (ctx.goals?.length) parts.push(`- Tujuan karir/minat: ${ctx.goals.slice(0, 5).join(", ")}`);
  if (ctx.prefs?.targetMajor && Array.isArray(ctx.prefs.targetMajor)) {
    parts.push(`- Minat jurusan: ${(ctx.prefs.targetMajor as string[]).slice(0, 5).join(", ")}`);
  }
  if (ctx.applications?.length) {
    const active = ctx.applications.filter(
      (a) => a.status === "open" || a.status === "verified" || a.status === "selected",
    );
    if (active.length) parts.push(`- Program aktif: ${active.map((a) => a.programId).join(", ")}`);
  }
  return parts.length > 1 ? parts.join("\n") : null;
}
