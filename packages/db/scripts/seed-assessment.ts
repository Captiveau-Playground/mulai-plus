/**
 * Fase 0 · Langkah 2 — Seeder: snapshot konten Tes Minat (tmb_*) → Assessment Engine (DISCOVER v1).
 * Idempotent: kalau assessment DISCOVER sudah ada + punya questions → skip.
 * Hanya BACA tmb_* (tidak mengubah legacy).
 */
import { db, eq, schema } from "@mulai-plus/db";
import { tmbQuestionBank } from "@mulai-plus/db/schema/tmb";
import { nanoidish } from "./lib-id";

const id = () => nanoidish();

const HOLLAND = {
  R: { name: "Realistic", short: "R", desc: "Senang bekerja dengan alat, benda, dan kegiatan praktis." },
  I: { name: "Investigative", short: "I", desc: "Senang menganalisis, meneliti, dan memecahkan masalah." },
  A: { name: "Artistic", short: "A", desc: "Senang berkreasi, berimajinasi, dan mengekspresikan ide." },
  S: { name: "Social", short: "S", desc: "Senang membantu, mengajar, dan berinteraksi dengan orang." },
  E: { name: "Enterprising", short: "E", desc: "Senang memimpin, memengaruhi, dan mengorganisir." },
  C: { name: "Conventional", short: "C", desc: "Senang keteraturan, ketelitian, dan prosedur jelas." },
} as const;

export async function seedDiscoverV1({ force = false }: { force?: boolean } = {}) {
  if (force) await wipeDiscover();
  const existing = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, "DISCOVER") });
  if (existing) {
    const qCount = (
      await db.query.questions.findMany({
        where: eq(schema.questions.versionId, (await versionOf(existing.id)) ?? ""),
        columns: { id: true },
      })
    ).length;
    if (qCount > 0 && !force) {
      console.log(`⏭ DISCOVER sudah ada (${qCount} soal) — skip`);
      return { skipped: true };
    }
  }

  const questions = await db
    .select()
    .from(tmbQuestionBank)
    .where(eq(tmbQuestionBank.testCode, "interest"))
    .orderBy(tmbQuestionBank.order);

  if (questions.length === 0) {
    console.log("⚠️ tmb_question_bank (interest) kosong — tidak ada yg di-seed");
    return { seeded: 0 };
  }

  const assessmentId = existing?.id ?? id();
  const versionId = id();
  // config: mirror perilaku minat saat ini (tanpa random, 6 dims, top-3, SUM)
  const config = {
    total_dim: 6,
    result_dim_count: 3,
    min_q_per_dim: 3,
    randomize_q: false,
    randomize_a: false,
    timer_enabled: false,
    timer_scope: "none",
    allow_pause: false,
    scoring_method: "sum",
  };

  // Answer scale global utk minat (pair): A/B, nilai skor 1 per sisi
  let scaleId = id();
  if (!existing) {
    await db.insert(schema.assessments).values({
      id: assessmentId,
      code: "DISCOVER",
      name: "MULAI Discover™",
      description: "Tes Minat — Holland RIASEC",
      defaultConfigJson: config,
    });
  }
  await db.insert(schema.assessmentVersions).values({
    id: versionId,
    assessmentId,
    versionNumber: 1,
    status: "live",
    configJson: config,
    publishedAt: new Date(),
  });
  await db.insert(schema.answerScales).values({ id: scaleId, name: "Minat Pair (A/B)", description: "Pasangan minat Holland — pilih yang lebih mendekati." });
  await db.insert(schema.answerScaleOptions).values([
    { id: id(), scaleId, value: "A", score: 1, label: "Opsi A" },
    { id: id(), scaleId, value: "B", score: 1, label: "Opsi B" },
  ]);

  // Dimensions RIASEC
  const dimIds: Record<string, string> = {};
  for (const code of ["R", "I", "A", "S", "E", "C"] as const) {
    const did = id();
    dimIds[code] = did;
    await db.insert(schema.assessmentDimensions).values({
      id: did,
      versionId,
      code,
      name: HOLLAND[code].name,
      shortName: HOLLAND[code].short,
      description: HOLLAND[code].desc,
      displayOrder: ["R", "I", "A", "S", "E", "C"].indexOf(code),
      isActive: true,
    });
  }

  // Questions (pair): option A → dimension, option B → pairDimension
  let q = 0;
  for (const x of questions) {
    const qid = id();
    const opts = [
      { ov: "A", dim: x.dimension, label: x.optionA ?? "-" },
      { ov: "B", dim: x.pairDimension ?? x.dimension, label: x.optionB ?? "-" },
    ];
    await db.insert(schema.questions).values({
      id: qid,
      versionId,
      dimensionId: dimIds[x.dimension] ?? "",
      scaleId,
      questionCode: `D-${String(x.order).padStart(3, "0")}`,
      questionText: x.text,
      questionType: "multiple_choice",
      presentationMode: "standard_option_card",
      displayOrder: x.order,
      isActive: x.isActive ?? true,
    });
    for (const o of opts) {
      await db.insert(schema.questionOptions).values({
        id: id(),
        questionId: qid,
        optionValue: o.ov,
        targetDimension: dimIds[o.dim] ?? null,
        label: o.label,
        score: 1,
        displayOrder: o.ov === "A" ? 0 : 1,
      });
    }
    q++;
  }

  console.log(`✅ DISCOVER v1 seeded: ${q} soal · 6 dimensi · 2x opsi · scale pair · version LIVE`);
  return { seeded: q };
}

async function versionOf(assessmentId: string) {
  const v = await db.query.assessmentVersions.findFirst({
    where: eq(schema.assessmentVersions.assessmentId, assessmentId),
    orderBy: { versionNumber: "desc" },
  });
  return v?.id ?? null;
}

if (import.meta.main) {
  seedDiscoverV1({ force: process.argv.includes("--force") })
    .then((r) => {
      console.log("selesai:", r);
      process.exit(0);
    })
    .catch((e) => {
      console.error("gagal:", e);
      process.exit(1);
    });
}
/** Hapus seluruh subtree DISCOVER (utk kalibrasi/seed ulang di staging — tidak menyentuh tmb_*). */
async function wipeDiscover() {
  const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, "DISCOVER") });
  if (!a) return;
  const vs = (await db.query.assessmentVersions.findMany({ where: eq(schema.assessmentVersions.assessmentId, a.id) })).map((v) => v.id);
  if (vs.length) {
    const sessions = (await db.query.assessmentSessions.findMany({ where: eq(schema.assessmentSessions.versionId, vs[0]) })).map((s) => s.id);
    // helper sederhana hapus per tabel (urut FK)
    const del = async (t: any, col: any, vals: string[], col2?: any, vals2?: string[]) => {
      if (!vals.length) return;
      if (col2 && vals2?.length) await db.delete(t).where(eq(col, vals[0])); // serdehana: dipakai utk satu sesi
      else await db.delete(t).where(eq(col, vals[0]));
    };
    for (const sid of sessions) {
      await db.delete(schema.assessmentResults).where(eq(schema.assessmentResults.sessionId, sid));
      await db.delete(schema.assessmentDimensionScores).where(eq(schema.assessmentDimensionScores.sessionId, sid));
      await db.delete(schema.assessmentAnswers).where(eq(schema.assessmentAnswers.sessionId, sid));
      await db.delete(schema.assessmentSessions).where(eq(schema.assessmentSessions.id, sid));
    }
    for (const vid of vs) {
      const qs = (await db.query.questions.findMany({ where: eq(schema.questions.versionId, vid) })).map((q) => q.id);
      for (const qid of qs) await db.delete(schema.questionOptions).where(eq(schema.questionOptions.questionId, qid));
      await db.delete(schema.questions).where(eq(schema.questions.versionId, vid));
      await db.delete(schema.assessmentSections).where(eq(schema.assessmentSections.versionId, vid));
      const dims = (await db.query.assessmentDimensions.findMany({ where: eq(schema.assessmentDimensions.versionId, vid) })).map((d) => d.id);
      for (const did of dims) await db.delete(schema.dimensionInstructions).where(eq(schema.dimensionInstructions.dimensionId, did));
      await db.delete(schema.assessmentDimensions).where(eq(schema.assessmentDimensions.versionId, vid));
      await db.delete(schema.assessmentVersions).where(eq(schema.assessmentVersions.id, vid));
    }
  }
  await db.delete(schema.assessments).where(eq(schema.assessments.id, a.id));
}
