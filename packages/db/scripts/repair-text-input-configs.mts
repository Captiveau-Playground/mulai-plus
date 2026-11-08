/**
 * Perbaiki `text_input_configs` yang hilang pada versi TALENT (bug duplikasi versi lama:
 * createDraft tidak menyalin konfigurasi jawaban isian, sehingga 40 soal isian tidak bisa dinilai).
 *
 *   cd packages/db && bun scripts/repair-text-input-configs.mts [--dry]
 *
 * Sumber kunci: bank soal `assessment-banks.ts` (TALENT_ITEMS), dicocokkan per teks soal.
 * Aman dijalankan berulang; hanya mengisi yang kosong (tidak menimpa konfigurasi yang ada).
 */
import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });
const { db } = await import("../src");
const { eq, inArray } = await import("drizzle-orm");
const schema = await import("../src/schema");
const { TALENT_ITEMS } = await import("./assessment-banks");
const { nanoidish } = await import("./lib-id");

const DRY = process.argv.includes("--dry");

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const bank = new Map(TALENT_ITEMS.map((it) => [norm(it.teks), it]));

const EVAL: Record<string, string> = {
  persis: "exact_match",
  angka: "numeric_tolerance",
  kata: "keyword_match",
  pola: "pattern_match",
};

async function main() {
  const assessments = await db.query.assessments.findMany({});
  const talent = assessments.find((a) => a.code.toUpperCase() === "TALENT");
  if (!talent) {
    console.error("tes TALENT tidak ditemukan");
    process.exit(1);
  }
  const versions = await db.query.assessmentVersions.findMany({
    where: eq(schema.assessmentVersions.assessmentId, talent.id),
  });

  let inserted = 0;
  let already = 0;
  const unmapped: string[] = [];

  for (const v of versions) {
    const questions = await db.query.questions.findMany({
      where: eq(schema.questions.versionId, v.id),
      orderBy: [schema.questions.displayOrder],
    });
    const inputs = questions.filter((q) => q.questionType === "text_input");
    if (!inputs.length) continue;

    const cfgs = await db.query.textInputConfigs.findMany({
      where: inArray(
        schema.textInputConfigs.questionId,
        inputs.map((q) => q.id),
      ),
    });
    const have = new Set(cfgs.map((c) => c.questionId));

    for (const q of inputs) {
      if (have.has(q.id)) {
        already++;
        continue;
      }
      const src = bank.get(norm(q.questionText));
      if (!src?.kunciIsian) {
        unmapped.push(`v${v.versionNumber}: ${q.questionText.slice(0, 60)}`);
        continue;
      }
      if (!DRY) {
        await db.insert(schema.textInputConfigs).values({
          id: nanoidish(),
          questionId: q.id,
          evaluationType: (EVAL[src.caraNilai ?? "persis"] ?? "exact_match") as never,
          answerKey: src.kunciIsian,
          numericTolerance: src.caraNilai === "angka" ? (src.toleransi ?? "0.01") : null,
        });
      }
      inserted++;
    }
    console.log(
      `v${v.versionNumber} (${v.status}): ${inputs.length} soal isian · ${inputs.length - have.size} tanpa config`,
    );
  }

  console.log(`\n${DRY ? "(dry run) " : ""}config ditambahkan: ${inserted} · sudah ada: ${already}`);
  if (unmapped.length) {
    console.log(`⚠ ${unmapped.length} soal tidak ada di bank (perlu dicek manual):`);
    for (const u of unmapped.slice(0, 10)) console.log("   -", u);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("repair gagal:", e);
  process.exit(1);
});
