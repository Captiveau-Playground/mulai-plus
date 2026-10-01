/**
 * Fase 2 — Seeder TALENT v1 (DRAFT): snapshot soal bakat existing (tmb_* ability) → engine.
 * - 1 skala global (ABILITY_MC) sebagai referensi; opsi per-soal dgn score 1 utk jawaban benar.
 * - config: scoring sum, no timer default, result_dim_count 3 (silh setting assessment team).
 * Idempotent: skip bila TALENT + soal sudah ada.
 */
import { db, eq, schema } from "@mulai-plus/db";
import { tmbQuestionBank } from "@mulai-plus/db/schema/tmb";

const id = (n = 24) => "t" + Array.from({ length: n - 1 }, () => Math.floor(Math.random() * 36).toString(36)).join("");

export async function seedTalentV1({ force = false }: { force?: boolean } = {}) {
  const existing = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, "TALENT") });
  if (existing && !force) {
    const vs = await db.query.assessmentVersions.findMany({ where: eq(schema.assessmentVersions.assessmentId, existing.id) });
    for (const v of vs) {
      const cnt = await db.query.questions.findMany({ where: eq(schema.questions.versionId, v.id), columns: { id: true } });
      if (cnt.length) { console.log("⏭ TALENT sudah ada — skip"); return { skipped: true }; }
    }
  }

  const qs = await db.query.tmbQuestionBank.findMany({ where: eq(tmbQuestionBank.testCode, "ability") }).catch(() => []);
  if (qs.length === 0) { console.log("⚠️ tmb ability kosong"); return { seeded: 0 }; }

  const dimsRaw = [...new Set(qs.map((q) => (q as any).dimension))].sort() as string[];
  const cfg = { total_dim: dimsRaw.length, result_dim_count: 3, min_q_per_dim: 1, randomize_q: false, randomize_a: false, timer_enabled: false, timer_scope: "none", allow_pause: false, scoring_method: "sum" };

  const aid = existing?.id ?? id();
  const vid = id();
  if (!existing) {
    await db.insert(schema.assessments).values({ id: aid, code: "TALENT", name: "MULAI Talent™", description: "Tes Bakat — Thurstone PMA (snapshot ability legacy)", defaultConfigJson: cfg });
  }
  await db.insert(schema.assessmentVersions).values({ id: vid, assessmentId: aid, versionNumber: 1, status: "draft", configJson: cfg });

  const scaleId = id();
  await db.insert(schema.answerScales).values({ id: scaleId, name: "Ability MC (A–D)", description: "Pilihan ganda kemampuan; 1 utk jawaban benar." });

  const dimIds: Record<string, string> = {};
  dimsRaw.forEach((d, i) => {
    dimIds[d] = id();
    void db.insert(schema.assessmentDimensions).values({ id: dimIds[d], versionId: vid, code: d.toUpperCase(), name: d, shortName: d.toUpperCase().slice(0, 4), displayOrder: i, isActive: true });
  });

  let q = 0;
  for (const x of qs) {
    const qid = id();
    const fields = ["A", "B", "C", "D"] as const;
    const opts = fields
      .map((f) => (x as any)[`option${f}`])
      .filter((t): t is string => !!t);
    if (opts.length === 0) continue;
    await db.insert(schema.questions).values({ id: qid, versionId: vid, dimensionId: dimIds[(x as any).dimension] ?? "", scaleId, questionCode: `T-${String((x as any).order ?? q + 1).padStart(3, "0")}`, questionText: x.text, questionType: "multiple_choice", presentationMode: "standard_option_card", weight: 1, displayOrder: (x as any).order ?? q, isActive: (x as any).isActive ?? true });
    opts.forEach((label, i) => {
      const correct = (x as any).answer === fields[i];
      void db.insert(schema.questionOptions).values({ id: id(), questionId: qid, optionValue: fields[i], targetDimension: dimIds[(x as any).dimension] ?? "", label, score: correct ? 1 : 0, displayOrder: i });
    });
    q++;
  }
  console.log(`✅ TALENT v1 seeded (draft): ${q} soal · ${dimsRaw.length} dims · scale ability`);
  return { seeded: q, dims: dimsRaw.length };
}

if (import.meta.main) {
  seedTalentV1({ force: process.argv.includes("--force") }).then((r) => { console.log("selesai:", r); process.exit(0); }).catch((e) => { console.error("gagal:", e); process.exit(1); });
}
