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

const client = postgres(dbUrl, { max: 1, prepare: false, connect_timeout: 15 });
try {
  console.log("→ Menjalankan index optimization...");
  await client.unsafe(sql);
  console.log("✅ selesai (pg_trgm + GIN indexes aktif).");
} finally {
  await client.end();
}
