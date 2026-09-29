/**
 * Tool executor — port apps/ai-python/src/tools.py (SQL SELECT read-only).
 * Builder SQL dibuat pure (bisa di-unit-test), eksekusi lewat postgres/Hyperdrive.
 */
import type { AppContext } from "../config";
import { query } from "../db/db";

const MAX_RESULTS = 8;

// Alternatif kata kunci umum (PDDIKTI pakai nama resmi)
export const TERM_SYNONYMS: Record<string, string[]> = {
  kedokteran: ["dokter"],
  dokter: ["kedokteran"],
  keperawatan: ["nursing"],
  hukum: [],
};

const locNormalize = (expr: string) => `regexp_replace(${expr}, '[^a-zA-Z0-9]', '', 'g')`;

// ── Prisma-style builder: hasil { sql, params } dengan placeholder $1..$n ──

type BuiltQuery = { sql: string; params: unknown[] };

export function buildSearchUniversities(args: Record<string, unknown>): BuiltQuery {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const push = (cond: string, ...vals: unknown[]) => {
    conditions.push(cond);
    params.push(...vals);
  };
  let n = 1;

  if (args.query) push(`u.name ILIKE $${n++}`, `%${args.query}%`);
  if (args.city) push(`${locNormalize("u.regency")} ILIKE '%' || ${locNormalize(`$${n++}`)} || '%'`, args.city);
  if (args.province)
    push(`${locNormalize("u.province")} ILIKE '%' || ${locNormalize(`$${n++}`)} || '%'`, args.province);
  if (args.type) push(`u.type = $${n++}`, args.type);
  if (args.accreditation) push(`u.accreditation ILIKE $${n++}`, `%${args.accreditation}%`);
  if (args.ptn_category) push(`su.type = $${n++}`, args.ptn_category);
  if (args.is_ptnbh !== undefined) push(`su.is_ptnbh = $${n++}`, args.is_ptnbh ? 1 : 0);

  const where = conditions.length ? conditions.join(" AND ") : "TRUE";
  return {
    sql: `
      SELECT u.name, u.type, u.province, u.regency, u.accreditation, u.tuition_range,
             COALESCE(lc.total_lecturers, 0) as total_lecturers,
             COALESCE(pc.total_programs, 0) as total_programs,
             su.type as ptn_category, su.is_ptnbh
      FROM universities u
      LEFT JOIN (
          SELECT DISTINCT ON (um.id_sp) um.id_sp, su.type, su.is_ptnbh
          FROM university_mappings um
          JOIN snpmb_universities su ON su.id_ptn = um.id_ptn
      ) su ON su.id_sp = u.id_sp
      LEFT JOIN lecturer_counts lc ON lc.id_sp = u.id_sp
      LEFT JOIN program_counts pc ON pc.id_sp = u.id_sp
      WHERE ${where} AND u.status = 'Aktif'
      ORDER BY u.name
      LIMIT ${MAX_RESULTS}`,
    params,
  };
}

export function buildSearchPrograms(args: Record<string, unknown>): BuiltQuery {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let n = 1;

  if (args.query) {
    const terms = [String(args.query), ...(TERM_SYNONYMS[String(args.query).toLowerCase()] ?? [])];
    const conds = terms.map(() => `sp.name ILIKE $${n++}`);
    params.push(...terms.map((t) => `%${t}%`));
    conditions.push(`(${conds.join(" OR ")})`);
  }
  if (args.level) push2(conditions, params, `sp.level = $${n++}`, args.level);
  if (args.university) push2(conditions, params, `u.name ILIKE $${n++}`, `%${args.university}%`);
  if (args.accreditation) push2(conditions, params, `sp.accreditation ILIKE $${n++}`, `%${args.accreditation}%`);
  if (args.province)
    push2(
      conditions,
      params,
      `${locNormalize("u.province")} ILIKE '%' || ${locNormalize(`$${n++}`)} || '%'`,
      args.province,
    );

  const where = conditions.length ? conditions.join(" AND ") : "TRUE";
  return {
    sql: `
      SELECT sp.name, sp.level, sp.accreditation, sp.total_students, sp.total_lecturers,
             u.name as university_name, u.province
      FROM study_programs sp
      JOIN universities u ON u.id_sp = sp.id_sp
      WHERE ${where} AND sp.status = 'Aktif'
      ORDER BY sp.name
      LIMIT ${MAX_RESULTS}`,
    params,
  };
}

function push2(conditions: string[], params: unknown[], cond: string, ...vals: unknown[]) {
  conditions.push(cond);
  params.push(...vals);
}

export function findPrograms(programName: string, universityName: string | undefined): BuiltQuery {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let n = 1;
  conditions.push(`pm.pddikti_program_name ILIKE $${n++}`);
  params.push(`%${programName}%`);
  if (universityName) {
    conditions.push(`u.name ILIKE $${n++}`);
    params.push(`%${universityName}%`);
  }
  return {
    sql: `
      SELECT DISTINCT pm.snpmb_program_id, pm.snpmb_program_name, pm.level, u.name as university_name
      FROM program_mappings pm
      JOIN universities u ON u.id_sp = pm.id_sp
      WHERE ${conditions.join(" AND ")}
      LIMIT 5`,
    params,
  };
}

export function passingGradeSql(): string {
  return `
    SELECT 'SNBP' as jalur, year, capacity, applicants, accepted,
           ROUND(accepted::numeric / NULLIF(applicants, 0) * 100, 2) as passing_grade
    FROM snbp_capacity_history
    WHERE id_prodi = $1 AND ($2::int IS NULL OR year = $2)
    UNION ALL
    SELECT 'SNBT' as jalur, year, capacity, applicants, accepted,
           ROUND(accepted::numeric / NULLIF(applicants, 0) * 100, 2) as passing_grade
    FROM snbt_capacity_history
    WHERE id_prodi = $1 AND ($2::int IS NULL OR year = $2)
    ORDER BY year DESC, jalur
    LIMIT 10`;
}

// ── Handler → format string untuk LLM ─────────────────────────────────

export async function handleSearchUniversities(c: AppContext, args: Record<string, unknown>): Promise<string> {
  const { sql, params } = buildSearchUniversities(args);
  const rows = await query(c, sql, params);
  if (!rows.length) return "Tidak ditemukan universitas dengan kriteria tersebut.";
  const lines = [`Ditemukan ${rows.length} universitas:`];
  for (const r of rows) {
    const acc = r.accreditation ? ` • Akreditasi: ${r.accreditation}` : "";
    const prog = r.total_programs ? ` • ${r.total_programs} prodi` : "";
    const badge = r.is_ptnbh ? " 🏛️PTN-BH" : "";
    lines.push(`\n🏛️ **${r.name}** (${r.type})${badge}${acc}${prog}`);
    lines.push(`   📍 ${r.regency || "-"}, ${r.province || "-"}`);
    if (r.tuition_range) lines.push(`   💰 Biaya: ${r.tuition_range}`);
    if (r.ptn_category) lines.push(`   🏷️ ${r.ptn_category}`);
  }
  return lines.join("\n");
}

export async function handleSearchPrograms(c: AppContext, args: Record<string, unknown>): Promise<string> {
  const { sql, params } = buildSearchPrograms(args);
  const rows = await query(c, sql, params);
  if (!rows.length) return "Tidak ditemukan program studi dengan kriteria tersebut.";
  const lines = [`Ditemukan ${rows.length} program studi:`];
  for (const r of rows) {
    const acc = r.accreditation ? ` • Akreditasi: ${r.accreditation}` : "";
    const stats: string[] = [];
    if (r.total_students) stats.push(`${r.total_students} mahasiswa`);
    if (r.total_lecturers) stats.push(`${r.total_lecturers} dosen`);
    const statStr = stats.length ? ` • ${stats.join(" • ")}` : "";
    lines.push(`\n📚 **${r.name}** (${r.level})${acc}${statStr}`);
    lines.push(`   🏛️ ${r.university_name} — ${r.province || "-"}`);
  }
  return lines.join("\n");
}

export async function handlePassingGrade(c: AppContext, args: Record<string, unknown>): Promise<string> {
  const programName = String(args.program_name ?? "");
  const universityName = args.university_name ? String(args.university_name) : undefined;
  const year = typeof args.year === "number" ? args.year : undefined;

  const found = await query(
    c,
    findPrograms(programName, universityName).sql,
    findPrograms(programName, universityName).params,
  );
  if (!found.length) return `Tidak ditemukan data passing grade untuk program '${programName}'.`;

  const results: string[] = [];
  for (const row of found) {
    const pgRows = await query(c, passingGradeSql(), [row.snpmb_program_id, year ?? null]);
    if (pgRows.length) {
      results.push(`\n📊 **${row.snpmb_program_name}** (${row.level || ""}) — ${row.university_name}`);
      for (const pg of pgRows) {
        const pgStr = pg.passing_grade != null ? `${Number(pg.passing_grade).toFixed(1)}%` : "-";
        results.push(`   ${pg.jalur} ${pg.year}: ${pgStr} (daya tampung: ${pg.capacity}, peminat: ${pg.applicants})`);
      }
    }
  }
  return results.length ? results.join("\n") : `Data passing grade untuk '${programName}' belum tersedia.`;
}

// ── Resolve nama tool (alias + fuzzy) & dispatcher ────────────────────

const HANDLERS: Record<string, (c: AppContext, a: Record<string, unknown>) => Promise<string>> = {
  search_universities: handleSearchUniversities,
  search_programs: handleSearchPrograms,
  get_passing_grade: handlePassingGrade,
};

const TOOL_ALIASES: Record<string, string> = {
  search_universitas: "search_universities",
  search_university: "search_universities",
  search_uni: "search_universities",
  search_program: "search_programs",
  search_program_studi: "search_programs",
  get_passinggrade: "get_passing_grade",
  get_passing_grades: "get_passing_grade",
  get_passing_grade_data: "get_passing_grade",
};

const normalizeTool = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Similarity sederhana (0..1) — pengganti SequenceMatcher. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / max;
}

function levenshtein(a: string, b: string): number {
  const at = (arr: number[], i: number): number => arr[i] as number;
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = at(dp, 0);
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = at(dp, j);
      const left = at(dp, j - 1);
      dp[j] = Math.min(cur + 1, left + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return at(dp, b.length);
}

export function resolveToolName(name: string): string | null {
  if (HANDLERS[name]) return name;
  if (TOOL_ALIASES[name]) return TOOL_ALIASES[name];
  const normalized = normalizeTool(name);
  const known = Object.fromEntries(Object.keys(HANDLERS).map((k) => [normalizeTool(k), k]));
  if (known[normalized]) return known[normalized];
  let best: [number, string] = [0, ""];
  for (const [normKey, real] of Object.entries(known)) {
    const score = similarity(normalized, normKey);
    if (score > best[0]) best = [score, real];
  }
  return best[0] >= 0.72 ? best[1] : null;
}

export async function handleToolCall(c: AppContext, name: string, args: Record<string, unknown>): Promise<string> {
  const resolved = resolveToolName(name);
  if (!resolved) return `Error: tool '${name}' tidak dikenal.`;
  const handler = HANDLERS[resolved];
  if (!handler) return `Error: tool '${name}' belum punya handler.`;
  try {
    return await handler(c, args);
  } catch (e) {
    console.error(`[tools] ${resolved} error:`, (e as Error).message);
    return `Maaf, terjadi kesalahan saat mengambil data: ${(e as Error).message.slice(0, 200)}`;
  }
}
