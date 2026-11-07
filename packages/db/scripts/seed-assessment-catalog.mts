/**
 * Seed katalog rekomendasi TMB v2 (Pola Jurusan + Mapping Karier).
 *
 *   cd packages/db && bun scripts/seed-assessment-catalog.mts [--dry]
 *
 * Aman dijalankan berulang: pola di-upsert per `category_key`, karier di-*reset per kategori*
 * (bukan seluruh tabel), jadi data kategori lain tidak tersentuh.
 *
 * Setelah seed, skrip memverifikasi:
 *  - setiap pola cocok dengan ≥1 prodi aktif di PDDikti
 *  - setiap kategori punya ≥4 karier
 *  - setiap tipe Holland (R/I/A/S/E/C) punya ≥6 kategori
 */
import dotenv from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { CAREER_PROFILES, MAJOR_PATTERNS } from "../../api/src/lib/assessment-catalog";
import { nanoidish } from "./lib-id";

// dotenv HARUS jalan sebelum modul db diinisialisasi (env dibaca saat import)
dotenv.config({ path: "../../apps/server/.env" });
const { db } = await import("../src");
const { studyPrograms, tmbCareerMappings, tmbMajorPatterns } = await import("../src/schema");

const DRY = process.argv.includes("--dry");

async function main() {
  const prodis = await db
    .select({ name: studyPrograms.name })
    .from(studyPrograms)
    .where(eq(studyPrograms.status, "Aktif"));
  const prodiNames = prodis.map((p) => p.name);

  // 1) validasi pola terhadap data PDDikti
  const unmatched: string[] = [];
  const matches = new Map<string, number>();
  for (const pat of MAJOR_PATTERNS) {
    const re = new RegExp(pat.pattern, "i");
    const n = prodiNames.filter((name) => re.test(name)).length;
    matches.set(pat.key, n);
    if (n === 0) unmatched.push(`${pat.key} (${pat.pattern})`);
  }

  // 2) validasi karier
  const missingCareers = MAJOR_PATTERNS.filter((p) => (CAREER_PROFILES[p.key]?.length ?? 0) < 4).map((p) => p.key);
  const dupCareers: string[] = [];
  for (const pat of MAJOR_PATTERNS) {
    const list = CAREER_PROFILES[pat.key] ?? [];
    if (new Set(list).size !== list.length) dupCareers.push(pat.key);
  }

  // 3) cakupan Holland
  const perHolland: Record<string, number> = {};
  for (const p of MAJOR_PATTERNS) perHolland[p.hollandPrimary] = (perHolland[p.hollandPrimary] ?? 0) + 1;

  console.log("\n=== Katalog TMB v2 ===");
  console.log(`Pola jurusan : ${MAJOR_PATTERNS.length}`);
  console.log(
    `Karier       : ${Object.values(CAREER_PROFILES).reduce((a, b) => a + b.length, 0)} (${Object.keys(CAREER_PROFILES).length} kategori)`,
  );
  console.log("Cakupan Holland:", perHolland);
  console.log("Pola tanpa prodi cocok:", unmatched.length ? unmatched.join(", ") : "—");
  console.log("Kategori <4 karier:", missingCareers.length ? missingCareers.join(", ") : "—");
  console.log("Karier duplikat:", dupCareers.length ? dupCareers.join(", ") : "—");
  const zeroCoverage = Object.entries(perHolland).filter(([, n]) => n < 6);
  if (zeroCoverage.length) console.log("⚠ Holland <6 kategori:", zeroCoverage);

  if (DRY) {
    console.log("\n(dry run — tidak menulis ke DB)");
    process.exit(0);
  }

  // 4) upsert pola jurusan
  let inserted = 0;
  let updated = 0;
  for (const pat of MAJOR_PATTERNS) {
    const existing = await db.query.tmbMajorPatterns.findFirst({
      where: eq(tmbMajorPatterns.categoryKey, pat.key),
    });
    const values = {
      categoryKey: pat.key,
      categoryName: pat.name,
      pattern: pat.pattern,
      hollandPrimary: pat.hollandPrimary,
      hollandSecondary: pat.hollandSecondary,
      abilityWeights: pat.abilityWeights as Record<string, number>,
      isActive: true,
    };
    if (existing) {
      await db.update(tmbMajorPatterns).set(values).where(eq(tmbMajorPatterns.id, existing.id));
      updated++;
    } else {
      await db.insert(tmbMajorPatterns).values({ id: nanoidish(), ...values });
      inserted++;
    }
  }

  // 5) reset + isi karier per kategori katalog
  const keys = MAJOR_PATTERNS.map((p) => p.key);
  await db.delete(tmbCareerMappings).where(inArray(tmbCareerMappings.majorCategory, keys));
  let careers = 0;
  for (const key of keys) {
    for (const name of CAREER_PROFILES[key] ?? []) {
      await db.insert(tmbCareerMappings).values({ id: nanoidish(), majorCategory: key, careerName: name });
      careers++;
    }
  }

  // 6) matikan pola lama yang tidak ada di katalog (jangan hapus — riwayat tetap aman)
  const all = await db.query.tmbMajorPatterns.findMany({ columns: { id: true, categoryKey: true } });
  const stale = all.filter((p) => !keys.includes(p.categoryKey));
  for (const s of stale) {
    await db.update(tmbMajorPatterns).set({ isActive: false }).where(eq(tmbMajorPatterns.id, s.id));
  }

  console.log(`\n✅ Pola: ${inserted} baru, ${updated} diperbarui, ${stale.length} dinonaktifkan`);
  console.log(`✅ Karier: ${careers} baris untuk ${keys.length} kategori`);
  console.log(
    `✅ Total pola aktif: ${(await db.query.tmbMajorPatterns.findMany({ where: eq(tmbMajorPatterns.isActive, true) })).length}`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("seed katalog gagal:", e);
  process.exit(1);
});
