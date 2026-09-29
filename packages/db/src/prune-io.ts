/**
 * Prune (retensi) opsional — jalankan manual/scheduled, BUKAN di migrate.
 *
 *  - audit_log              : hapus lebih tua dari AUDIT_RETENTION_DAYS (default 180)
 *  - snbt_applicant_provinces : dataset legacy (2021-2025, tidak dipakai kode) —
 *                              hapus tahun < SNBT_PROVINCE_MIN_YEAR (default 2025)
 *
 *   AUDIT_RETENTION_DAYS=180 SNBT_PROVINCE_MIN_YEAR=2025 DATABASE_URL=... bun run prune:io
 */
import postgres from "postgres";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL belum di-set");
  process.exit(1);
}
const auditDays = Number(process.env.AUDIT_RETENTION_DAYS ?? 180);
const snbtMinYear = Number(process.env.SNBT_PROVINCE_MIN_YEAR ?? 2025);

const client = postgres(dbUrl, { max: 1, prepare: false, connect_timeout: 15 });
try {
  const a = await client.unsafe("DELETE FROM audit_log WHERE created_at < NOW() - ($1 || ' days')::interval", [
    auditDays,
  ]);
  console.log(`audit_log terhapus (> ${auditDays} hari): ${a.length} baris (length=${a.length})`);
  const s = await client.unsafe("DELETE FROM snbt_applicant_provinces WHERE year < $1", [snbtMinYear]);
  console.log(`snbt_applicant_provinces terhapus (tahun < ${snbtMinYear}): ${JSON.stringify(s)}`);
} catch (e) {
  console.error("prune error:", (e as Error).message);
  process.exitCode = 1;
} finally {
  await client.end();
}
