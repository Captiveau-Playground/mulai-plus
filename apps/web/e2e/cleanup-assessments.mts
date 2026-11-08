// Bersihkan SEMUA assessment uji ber-prefix E2E dari DB (sisa run yang terputus).
//
//   bun e2e/cleanup-assessments.mts            # prefix default: E2E
//   bun e2e/cleanup-assessments.mts E2EED      # prefix spesifik
//
// Catatan: spec e2e sudah menghapus datanya sendiri di afterAll (per kode, aman untuk
// paralel). Script ini hanya untuk menyapu sisa kalau ada run yang dihentikan paksa.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const HERE = dirname(fileURLToPath(import.meta.url));

function findRepoRoot(): string {
  let dir = HERE;
  for (let i = 0; i < 8; i++) {
    if (existsSync(resolve(dir, "apps/server/.env"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`repo root tidak ditemukan dari ${HERE}`);
}

function databaseUrl(): string {
  if (process.env.E2E_DB_URL) return process.env.E2E_DB_URL;
  const envPath = resolve(findRepoRoot(), "apps/server/.env");
  const m = readFileSync(envPath, "utf8").match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (!m?.[1]) throw new Error(`DATABASE_URL tidak ditemukan di ${envPath}`);
  return m[1].trim();
}

const prefix = process.argv[2] ?? "E2E";
const like = `${prefix}%`;
const V = "select id from assessment_versions where assessment_id in (select id from assessments where code like $1)";
const S = `select id from assessment_sessions where version_id in (${V})`;
const Q = `select id from questions where version_id in (${V})`;
const D = `select id from assessment_dimensions where version_id in (${V})`;

const db = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
await db.connect();

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
    "delete from assessment_versions where assessment_id in (select id from assessments where code like $1)",
  ],
  ["assessments", "delete from assessments where code like $1"],
];

for (const [name, sql] of steps) {
  const r = await db.query(sql, [like]);
  console.log(`  ${name}: ${r.rowCount ?? 0} baris`);
}

const left = await db.query("select count(*)::int n from assessments where code like $1", [like]);
console.log(`Selesai — sisa assessment "${like}": ${left.rows[0].n}`);
await db.end();
