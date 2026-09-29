/**
 * Runner dari packages/db/optimize-io.sql — dipanggil CI (step migrate) &
 * manual. Idempotent; butuh env DATABASE_URL.
 *
 *   bun run optimize:io
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL belum di-set");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(__dirname, "..", "optimize-io.sql"), "utf8");
// Supabase statement_timeout default terlalu ketat utk CREATE INDEX di tabel besar.
const runSql = `SET statement_timeout = 0;\n${sql}`;

const client = postgres(dbUrl, { max: 1, prepare: false, connect_timeout: 15 });
try {
  console.log("→ Menjalankan index optimization (per-statement)...");
  // Eksekusi per-statement: progres jelas + satu index lambat tak menggagalkan sisanya.
  const statements = runSql
    .split(/;\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  let ok = 0;
  let failed = 0;
  for (const st of statements) {
    const tag = st.replace(/\s+/g, " ").slice(0, 70);
    try {
      await client.unsafe(st);
      ok++;
    } catch (e) {
      failed++;
      console.error(`✘ ${tag} → ${(e as Error).message.slice(0, 140)}`);
    }
  }
  console.log(`✅ selesai: ${ok} statement ok, ${failed} gagal (index besar mungkin perlu diulang off-peak).`);
} finally {
  await client.end();
}
