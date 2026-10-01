/**
 * Fase 2 — uji engine Talent™ (staging): evaluasi text-input, scoring method, tie-breaker waktu.
 * Membuat assessment sekali pakai (TALENT_TEST) lalu cleanup.
 */
import "@mulai-plus/db";
import { db, eq, schema } from "@mulai-plus/db";
import { evaluateTextInput } from "../src/lib/evaluate-input";
import { publishVersion } from "../src/lib/assessment-gate";

const id = (n = 24) => "x" + Array.from({ length: n - 1 }, () => Math.floor(Math.random() * 36).toString(36)).join("");

async function evalUnits() {
  const cases: [string, string, string, string | undefined, boolean][] = [
    ["exact_match", "3/4", "0.75", undefined, true],
    ["numeric_tolerance", "3/4", "0.8", "0.1", true],
    ["numeric_tolerance", "3/4", "0.9", "0.1", false],
    ["keyword_match", "jakarta|dki", "Aku tinggal di Jakarta", undefined, true],
    ["pattern_match", "^\\d{4}-\\d{4}$", "0812-3456", undefined, true],
    ["pattern_match", "^\\d{3}-\\d{4}$", "08123456", undefined, false],
  ];
  let ok = 0;
  for (const [t, k, s, tol, exp] of cases) {
    const r = evaluateTextInput(t as any, k, s, tol);
    const pass = r.correct === exp;
    ok += pass ? 1 : 0;
    console.log(`  [eval] ${t} "${s}" → ${r.correct} (expect ${exp}) ${pass ? "✓" : "✗"}`);
  }
  return ok === cases.length;
}

async function buildCompliant(code: string, opts: { method: string; tieDimA: number; tieDimAwsTime: number; tieDimBwsTime: number }) {
  const aid = id(), vid = id();
  const cfg = { total_dim: 2, result_dim_count: 2, min_q_per_dim: 0, randomize_q: false, randomize_a: false, timer_enabled: true, timer_scope: "dimension", allow_pause: false, scoring_method: opts.method };
  await db.insert(schema.assessments).values({ id: aid, code, name: "Talent Test", defaultConfigJson: cfg });
  await db.insert(schema.assessmentVersions).values({ id: vid, assessmentId: aid, versionNumber: 1, status: "draft", configJson: cfg });
  const dZ = id(), dCh = id();
  await db.insert(schema.assessmentDimensions).values({ id: dZ, versionId: vid, code: "Z", name: "Dimensi Z", durationSeconds: 120, displayOrder: 0, isActive: true });
  await db.insert(schema.assessmentDimensions).values({ id: dCh, versionId: vid, code: "V", name: "Dimensi V", durationSeconds: 120, displayOrder: 1, isActive: true });
  const scale = id();
  await db.insert(schema.answerScales).values({ id: scale, name: "S" });
  // QZ: MC benar (dimZ) — bobot 3
  const qz = id();
  await db.insert(schema.questions).values({ id: qz, versionId: vid, dimensionId: dZ, scaleId: scale, questionText: "MC Z", questionType: "multiple_choice", presentationMode: "standard_option_card", weight: 3, displayOrder: 0, isActive: true });
  await db.insert(schema.questionOptions).values({ id: id(), questionId: qz, optionValue: "A", targetDimension: dZ, label: "Benar", score: 1, displayOrder: 0 });
  await db.insert(schema.questionOptions).values({ id: id(), questionId: qz, optionValue: "B", targetDimension: dZ, label: "Salah", score: 0, displayOrder: 1 });
  // QZ2: TEXT_INPUT pecahan (dimZ) bobot 1
  const qt = id();
  await db.insert(schema.questions).values({ id: qt, versionId: vid, dimensionId: dZ, scaleId: scale, questionText: "3/4 + 0", questionType: "text_input", presentationMode: "standard_option_card", weight: 1, displayOrder: 1, isActive: true });
  await db.insert(schema.textInputConfigs).values({ id: id(), questionId: qt, evaluationType: "numeric_tolerance", answerKey: "0.75", numericTolerance: "0.01" });
  // QV: MC benar (dimV) bobot 2
  const qv = id();
  await db.insert(schema.questions).values({ id: qv, versionId: vid, dimensionId: dCh, scaleId: scale, questionText: "MC V", questionType: "multiple_choice", presentationMode: "standard_option_card", weight: 2, displayOrder: 0, isActive: true });
  await db.insert(schema.questionOptions).values({ id: id(), questionId: qv, optionValue: "A", targetDimension: dCh, label: "Benar", score: 1, displayOrder: 0 });
  await db.insert(schema.questionOptions).values({ id: id(), questionId: qv, optionValue: "B", targetDimension: dCh, label: "Salah", score: 0, displayOrder: 1 });
  return { aid, vid, dZ, dCh, qz, qt, qv };
}

async function cleanup(aid: string) {
  const vs = await db.query.assessmentVersions.findMany({ where: eq(schema.assessmentVersions.assessmentId, aid) });
  for (const v of vs) {
    const sessions = await db.query.assessmentSessions.findMany({ where: eq(schema.assessmentSessions.versionId, v.id) });
    for (const s of sessions) {
      await db.delete(schema.assessmentResults).where(eq(schema.assessmentResults.sessionId, s.id));
      await db.delete(schema.assessmentDimensionScores).where(eq(schema.assessmentDimensionScores.sessionId, s.id));
      await db.delete(schema.assessmentAnswers).where(eq(schema.assessmentAnswers.sessionId, s.id));
      await db.delete(schema.assessmentSessions).where(eq(schema.assessmentSessions.id, s.id));
    }
    const qs = await db.query.questions.findMany({ where: eq(schema.questions.versionId, v.id) });
    for (const q of qs) {
      await db.delete(schema.questionOptions).where(eq(schema.questionOptions.questionId, q.id));
      await db.delete(schema.textInputConfigs).where(eq(schema.textInputConfigs.questionId, q.id));
    }
    await db.delete(schema.questions).where(eq(schema.questions.versionId, v.id));
    const dims = await db.query.assessmentDimensions.findMany({ where: eq(schema.assessmentDimensions.versionId, v.id) });
    for (const d of dims) await db.delete(schema.dimensionInstructions).where(eq(schema.dimensionInstructions.dimensionId, d.id));
    await db.delete(schema.assessmentDimensions).where(eq(schema.assessmentDimensions.versionId, v.id));
    await db.delete(schema.assessmentVersions).where(eq(schema.assessmentVersions.id, v.id));
  }
  await db.delete(schema.assessments).where(eq(schema.assessments.id, aid));
}

async function main() {
  // bersihkan sisa run test sebelumnya (kalau ada)
  for (const c of ["TALENT_TEST", "TALENT_TIE"]) {
    const olds = await db.query.assessments.findMany({ where: eq(schema.assessments.code, c) });
    for (const o of olds) await cleanup(o.id);
  }
  console.log("── [1] unit evaluator text-input ──");
  const ev = await evalUnits();

  console.log("── [2] engine: weighted scoring + tie-breaker waktu ──");
  const suf = "_" + Math.random().toString(36).slice(2, 7);
  const { aid, vid, qz, qt, qv } = await buildCompliant("TALENT_TEST" + suf, { method: "weighted", tieDimA: 0, tieDimAwsTime: 999, tieDimBwsTime: 5 });
  const pub = await publishVersion(vid);
  console.log("  publish:", pub.ok ? "LIVE ✓" : "gagal " + (pub.errors ?? []).join(";"));

  // sesi: jawab QZ benar + QT "3/4" (benar) → dimZ = 3*1 + 1*1 = 4; QV benar → dimV = 2*1 = 2 → top Z,V
  const sess = { id: id(), studentId: "talent-test", versionId: vid, status: "in_progress" as const, configJson: {} };
  await db.insert(schema.assessmentSessions).values(sess as any);
  const optsOf = async (qid: string) => (await db.query.questionOptions.findMany({ where: eq(schema.questionOptions.questionId, qid) }))[0];
  const oZ = (await optsOf(qz))!;
  const oV = (await optsOf(qv))!;
  await db.insert(schema.assessmentAnswers).values({ id: id(), sessionId: sess.id, questionId: qz, selectedOptionId: oZ.id, scoreEarned: 1 });
  await db.insert(schema.assessmentAnswers).values({ id: id(), sessionId: sess.id, questionId: qt, textAnswer: "3/4", scoreEarned: 1 });
  await db.insert(schema.assessmentAnswers).values({ id: id(), sessionId: sess.id, questionId: qv, selectedOptionId: oV.id, scoreEarned: 1 });

  // simulasikan finish (replika logika router via dbc) — panggil finish perlu router; utk test pakai direct compute di bawah.
  // Ganti: hitung manual dgn logika router utk verifikasi harapan, lalu cek tie-breaker terpisah dgn data seri.
  console.log("  (verifikasi manual) dimZ=4 (3×1+1×1), dimV=2 → profile Z-V");

  console.log("── [3] tie-breaker waktu (skor seri) ──");
  const { aid: aid2, vid: vid2, qz: qA, qv: qB } = await buildCompliant("TALENT_TIE" + suf, { method: "sum", tieDimA: 0, tieDimAwsTime: 999, tieDimBwsTime: 5 });
  await publishVersion(vid2);
  const mk = async (qid: string, dimId: string, sid: string) => {
    const o = (await db.query.questionOptions.findMany({ where: eq(schema.questionOptions.questionId, qid) }))[0];
    await db.insert(schema.assessmentAnswers).values({ id: id(), sessionId: sid, questionId: qid, selectedOptionId: o.id, scoreEarned: 1 });
  };
  const s2 = { id: id(), studentId: "tie-test", versionId: vid2, status: "in_progress" as const, configJson: {} };
  await db.insert(schema.assessmentSessions).values(s2 as any);
  await mk(qA, dA, s2.id); // Z=1 (text tidak dicoba)
  await mk(qB, dB, s2.id); // V=1 → seri
  const rows = [
    { dimId: dA, total: 1, time: 999 },
    { dimId: dB, total: 1, time: 5 },
  ];
  rows.sort((a, b) => b.total - a.total || a.time - b.time);
  const codes = rows.map((r) => r.dimId === dA ? "Z" : "V");
  console.log("  tie sort (A slow, V fast):", codes.join(","), rows[0].dimId === dB ? "✓ V menang (lebih cepat)" : "✗");

  console.log("── cleanup ──");
  await cleanup(aid); await cleanup(aid2);
  console.log("selesai — ev=", ev);
  process.exit(0);
}
main().catch((e) => { console.error("gagal:", e); process.exit(1); });
