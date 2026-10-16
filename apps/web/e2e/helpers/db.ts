// Akses DB langsung (pg) — dipakai untuk bootstrap admin, assertion, dan cleanup.
// Sengaja pakai driver yang sudah ada di tree supaya tidak menambah dependency.
import { Client } from "pg";
import { databaseUrl } from "./env";

let client: Client | null = null;

export async function db(): Promise<Client> {
  if (client) return client;
  client = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

const TRANSIENT = /ENOTFOUND|EADDRNOTAVAIL|ECONNRESET|ECONNREFUSED|ETIMEDOUT|terminated|Connection terminated/i;

/**
 * Query dengan retry singkat. Neon/pooler kadang menolak (DNS/port sesaat) ketika banyak
 * worker e2e terhubung bersamaan — bukan kegagalan produk, jadi cukup diulang.
 */
export async function q<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const c = await db();
      const r = await c.query(sql, params as any[]);
      return r.rows as T[];
    } catch (e) {
      lastErr = e;
      const msg = String((e as Error)?.message ?? "");
      if (!TRANSIENT.test(msg)) throw e;
      await closeDb().catch(() => undefined);
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw lastErr;
}

export async function closeDb() {
  if (!client) return;
  await client.end();
  client = null;
}

/** Naikkan role user menjadi admin (dipakai bootstrap akun e2e). */
export async function promoteToAdmin(userId: string) {
  await q(`update "user" set role = 'admin' where id = $1`, [userId]);
}

export async function userRole(userId: string): Promise<string | null> {
  const rows = await q<{ role: string | null }>(`select role from "user" where id = $1`, [userId]);
  return rows[0]?.role ?? null;
}

/**
 * Hapus assessment uji beserta seluruh anaknya (versi, soal, opsi, sesi, hasil).
 * DB tidak mengandalkan ON DELETE CASCADE, jadi anak-anak dihapus lebih dulu.
 */
export async function deleteAssessmentByCode(code: string) {
  const V = "select id from assessment_versions where assessment_id in (select id from assessments where code = $1)";
  const S = `select id from assessment_sessions where version_id in (${V})`;
  const Q = `select id from questions where version_id in (${V})`;
  const D = `select id from assessment_dimensions where version_id in (${V})`;
  const steps: [string, string][] = [
    ["assessment_answers", `delete from assessment_answers where session_id in (${S})`],
    ["assessment_dimension_scores", `delete from assessment_dimension_scores where session_id in (${S})`],
    ["assessment_results", `delete from assessment_results where session_id in (${S})`],
    ["assessment_sessions", `delete from assessment_sessions where version_id in (${V})`],
    ["question_options", `delete from question_options where question_id in (${Q})`],
    ["text_input_configs", `delete from text_input_configs where question_id in (${Q})`],
    ["questions", `delete from questions where version_id in (${V})`],
    ["assessment_sections", `delete from assessment_sections where version_id in (${V})`],
    ["dimension_instructions", `delete from dimension_instructions where dimension_id in (${D})`],
    ["assessment_dimensions", `delete from assessment_dimensions where version_id in (${V})`],
    [
      "assessment_versions",
      "delete from assessment_versions where assessment_id in (select id from assessments where code = $1)",
    ],
  ];
  for (const [name, sql] of steps) {
    await q(sql, [code]).catch((e) =>
      console.warn(`[cleanup] ${name} (${code}) gagal: ${String(e.message).slice(0, 120)}`),
    );
  }
  const removed = await q<{ id: string }>("delete from assessments where code = $1 returning id", [code]);
  return removed.length > 0;
}

const VERSIONS_OF_PREFIX =
  "select id from assessment_versions where assessment_id in (select id from assessments where code like $1)";
const SESSIONS_OF_PREFIX = `select id from assessment_sessions where version_id in (${VERSIONS_OF_PREFIX})`;
const QUESTIONS_OF_PREFIX = `select id from questions where version_id in (${VERSIONS_OF_PREFIX})`;
const DIMS_OF_PREFIX = `select id from assessment_dimensions where version_id in (${VERSIONS_OF_PREFIX})`;

/**
 * Bersihkan SEMUA assessment uji ber-prefix tertentu (mis. "E2E%").
 * Dipakai di afterAll supaya data uji dari run yang terputus pun ikut terbersihkan.
 */
export async function deleteAssessmentsByPrefix(prefix: string) {
  const like = `${prefix}%`;
  const steps: [string, string][] = [
    ["assessment_answers", `delete from assessment_answers where session_id in (${SESSIONS_OF_PREFIX})`],
    [
      "assessment_dimension_scores",
      `delete from assessment_dimension_scores where session_id in (${SESSIONS_OF_PREFIX})`,
    ],
    ["assessment_results", `delete from assessment_results where session_id in (${SESSIONS_OF_PREFIX})`],
    ["assessment_sessions", `delete from assessment_sessions where version_id in (${VERSIONS_OF_PREFIX})`],
    ["question_options", `delete from question_options where question_id in (${QUESTIONS_OF_PREFIX})`],
    ["text_input_configs", `delete from text_input_configs where question_id in (${QUESTIONS_OF_PREFIX})`],
    ["questions", `delete from questions where version_id in (${VERSIONS_OF_PREFIX})`],
    ["assessment_sections", `delete from assessment_sections where version_id in (${VERSIONS_OF_PREFIX})`],
    ["dimension_instructions", `delete from dimension_instructions where dimension_id in (${DIMS_OF_PREFIX})`],
    ["assessment_dimensions", `delete from assessment_dimensions where version_id in (${VERSIONS_OF_PREFIX})`],
    [
      "assessment_versions",
      "delete from assessment_versions where assessment_id in (select id from assessments where code like $1)",
    ],
  ];
  for (const [name, sql] of steps) {
    await q(sql, [like]).catch((e) => console.warn(`[cleanup] ${name} gagal: ${String(e.message).slice(0, 120)}`));
  }
  const removed = await q<{ id: string }>("delete from assessments where code like $1 returning id", [like]);
  return removed.length;
}
