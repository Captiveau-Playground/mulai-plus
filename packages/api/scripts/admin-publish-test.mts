/**
 * Fase 0 · L5a — uji admin: gatekeeper + publish (staging, assessment TEST sekali pakai, lalu di-cleanup).
 */
import "@mulai-plus/db"; // init provider
import { db, eq, schema } from "@mulai-plus/db";
import { validatePublish, publishVersion } from "../src/lib/assessment-gate";

const is = (n = 24) => "a" + Array.from({ length: n - 1 }, () => Math.floor(Math.random() * 36).toString(36)).join("");

async function main() {
  // 1) gatekeeper vs DISCOVER v1 live → seharusnya MENOLAK (min_q 3, sebagian dim <3 soal)
  const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, "DISCOVER") });
  const v = await db.query.assessmentVersions.findFirst({
    where: eq(schema.assessmentVersions.assessmentId, a!.id),
    orderBy: (t: any) => [t.versionNumber],
  });
  const g = await validatePublish(v!.id);
  console.log("[1] gate DISCOVER v1:", g.ok ? "lolos" : "DITOLAK", "| errors:", g.errors.length);
  console.log("    ", g.errors.slice(0, 4).join(" · "));

  // 2) build assessment TEST compliant → publish → harus LOLS :)
  const aid = is(), vid = is(), dimId = is();
  const cfg = { total_dim: 1, result_dim_count: 1, min_q_per_dim: 1, randomize_q: false, randomize_a: false, timer_enabled: false, timer_scope: "none", allow_pause: false, scoring_method: "sum" };
  await db.insert(schema.assessments).values({ id: aid, code: "TEST", name: "Test Engine", defaultConfigJson: cfg });
  await db.insert(schema.assessmentVersions).values({ id: vid, assessmentId: aid, versionNumber: 1, status: "draft", configJson: cfg });
  await db.insert(schema.assessmentDimensions).values({ id: dimId, versionId: vid, code: "X", name: "Dimensi X", displayOrder: 0, isActive: true });
  const scaleId = is();
  await db.insert(schema.answerScales).values({ id: scaleId, name: "XScale" });
  for (let i = 0; i < 2; i++) {
    const qid = is();
    await db.insert(schema.questions).values({ id: qid, versionId: vid, dimensionId: dimId, scaleId, questionText: `Soal ${i + 1}`, questionType: "multiple_choice", presentationMode: "standard_option_card", displayOrder: i, isActive: true });
    await db.insert(schema.questionOptions).values({ id: is(), questionId: qid, optionValue: "A", targetDimension: dimId, label: "A", score: 1, displayOrder: 0 });
    await db.insert(schema.questionOptions).values({ id: is(), questionId: qid, optionValue: "B", targetDimension: dimId, label: "B", score: 0, displayOrder: 1 });
  }
  const g2 = await validatePublish(vid);
  console.log("[2] gate TEST draft:", g2.ok ? "LOLS ✓" : "DITOLAK", g2.errors.slice(0, 2));
  const p = await publishVersion(vid);
  console.log("[3] publishVersion:", p.ok ? "LIVE ✓" : "gagal", p.errors?.slice(0, 2));
  const after = await db.query.assessmentVersions.findFirst({ where: eq(schema.assessmentVersions.id, vid) });
  console.log("[4] status:", after?.status, "| publishedAt:", !!after?.publishedAt);

  // 3) cleanup TEST (jangan tinggal sample di staging)
  const qs = await db.query.questions.findMany({ where: eq(schema.questions.versionId, vid) });
  for (const q of qs) await db.delete(schema.questionOptions).where(eq(schema.questionOptions.questionId, q.id));
  await db.delete(schema.questions).where(eq(schema.questions.versionId, vid));
  await db.delete(schema.assessmentDimensions).where(eq(schema.assessmentDimensions.versionId, vid));
  await db.delete(schema.assessmentVersions).where(eq(schema.assessmentVersions.id, vid));
  await db.delete(schema.assessments).where(eq(schema.assessments.id, aid));
  await db.delete(schema.answerScales).where(eq(schema.answerScales.id, scaleId));
  console.log("[5] cleanup TEST selesai");
  process.exit(0);
}
main().catch((e) => { console.error("gagal:", e); process.exit(1); });
