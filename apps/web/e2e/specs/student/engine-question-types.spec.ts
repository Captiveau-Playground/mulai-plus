// E2E USER — tipe soal & mode evaluasi jawaban isian lewat API publik `discover.*`
// (persis yang dipanggil UI siswa).
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, publish, saveQuestion } from "../../fixtures/assessment";
import { createAdminPage } from "../../helpers/admin-ui";
import { rpc } from "../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { runTag } from "../../helpers/env";

const PREFIX = "E2EQT";
const codes: string[] = [];
let admin: Page;
const studentId = () => `e2e-qt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function configOf(code: string, versionId: string) {
  return rpc<{ questions: any[]; dimensions: any[] }>("discover/config", { code, versionId });
}

test.describe("Engine · tipe soal & evaluasi", () => {
  test.beforeAll(async ({ browser }) => {
    admin = await createAdminPage(browser);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("pilihan ganda, skala (likert), dan isian tersimpan & dinilai dengan benar", async () => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(admin, { code, name: `Types ${code}` });
    const d1 = await addDimension(admin, versionId, "D1", "Dim Satu");
    await configUpdate(admin, versionId, {
      total_dim: 1,
      result_dim_count: 1,
      min_q_per_dim: 1,
      scoring_method: "sum",
    });

    await saveQuestion(admin, versionId, {
      dimensionId: d1,
      questionText: "MC",
      questionType: "multiple_choice",
      options: [
        { optionValue: "A", label: "Pilihan A", score: 10 },
        { optionValue: "B", label: "Pilihan B", score: 0 },
      ],
    });
    await saveQuestion(admin, versionId, {
      dimensionId: d1,
      questionText: "SKALA",
      questionType: "likert",
      options: [1, 2, 3, 4, 5].map((v) => ({ optionValue: "ABCDE"[v - 1], label: String(v), score: v })),
    });
    await saveQuestion(admin, versionId, {
      dimensionId: d1,
      questionText: "ISIAN",
      questionType: "text_input",
      textEval: { evaluationType: "numeric_tolerance", answerKey: "0.75", numericTolerance: "0.01" },
    });
    expect((await publish(admin, versionId)).ok).toBe(true);

    const cfg = await configOf(code, versionId);
    const mc = cfg.questions.find((q) => q.questionText === "MC")!;
    const skala = cfg.questions.find((q) => q.questionText === "SKALA")!;
    const isian = cfg.questions.find((q) => q.questionText === "ISIAN")!;

    expect(mc.questionType).toBe("multiple_choice");
    expect(skala.questionType).toBe("likert");
    expect(skala.opts.map((o: any) => o.score)).toEqual([1, 2, 3, 4, 5]);
    expect(isian.questionType).toBe("text_input");

    const st = await rpc<any>("discover/start", { code, studentId: studentId(), versionId });
    expect(
      (
        await rpc("discover/submit", {
          sessionId: st.sessionId,
          questionId: mc.id,
          optionId: mc.opts.find((o: any) => o.optionValue === "A")?.id,
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await rpc("discover/submit", {
          sessionId: st.sessionId,
          questionId: skala.id,
          optionId: skala.opts.find((o: any) => o.optionValue === "E")?.id,
        })
      ).ok,
    ).toBe(true);
    const textRes = await rpc<any>("discover/submitText", {
      sessionId: st.sessionId,
      questionId: isian.id,
      textAnswer: "0.75",
    });
    expect(textRes.correct, "isian 0.75 harus benar").toBe(true);

    const fin = await rpc<any>("discover/finish", { sessionId: st.sessionId });
    expect(fin.ok).toBe(true);
    expect(fin.rawScores[d1], "10 (MC) + 5 (skala) + 1 (isian)").toBe(16);
  });

  test("isian: numeric_tolerance menerima pecahan & desimal setara", async () => {
    test.setTimeout(180000);
    const { code, versionId, qId } = await buildTextQuestion("NUM", "numeric_tolerance", "0.75", "0.01");
    for (const jawab of ["0.75", "3/4", "0,75"])
      expect(await submitText(code, versionId, qId, jawab), `"${jawab}" harus benar`).toBe(true);
    for (const jawab of ["0.80", "1"])
      expect(await submitText(code, versionId, qId, jawab), `"${jawab}" harus salah`).toBe(false);
  });

  test("isian: exact_match (tanpa toleransi angka default)", async () => {
    test.setTimeout(180000);
    const { code, versionId, qId } = await buildTextQuestion("EXACT", "exact_match", "jakarta");
    for (const jawab of ["Jakarta", "  JAKARTA "])
      expect(await submitText(code, versionId, qId, jawab), `"${jawab}" harus benar`).toBe(true);
    for (const jawab of ["Bandung", "jakartaa"])
      expect(await submitText(code, versionId, qId, jawab), `"${jawab}" harus salah`).toBe(false);
  });

  test("isian: keyword_match menerima salah satu kata kunci", async () => {
    test.setTimeout(180000);
    const { code, versionId, qId } = await buildTextQuestion("KEYWORD", "keyword_match", "jakarta|bandung");
    for (const jawab of ["saya di jakarta", "BANDUNG kota"])
      expect(await submitText(code, versionId, qId, jawab), `"${jawab}" harus benar`).toBe(true);
    expect(await submitText(code, versionId, qId, "surabaya"), "surabaya harus salah").toBe(false);
  });

  test("isian: pattern_match memakai regex pada kunci", async () => {
    test.setTimeout(180000);
    const { code, versionId, qId } = await buildTextQuestion("REGEX", "pattern_match", "^[0-9]{3}$");
    expect(await submitText(code, versionId, qId, "123"), "123 harus benar").toBe(true);
    for (const jawab of ["12", "abc"])
      expect(await submitText(code, versionId, qId, jawab), `"${jawab}" harus salah`).toBe(false);
  });

  /* ── helper lokal ── */

  async function buildTextQuestion(label: string, evalType: string, key: string, tolerance?: string) {
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(admin, { code, name: `${label} ${code}` });
    const d1 = await addDimension(admin, versionId, "D1", "Dim");
    await configUpdate(admin, versionId, { total_dim: 1, result_dim_count: 1, min_q_per_dim: 1 });
    await saveQuestion(admin, versionId, {
      dimensionId: d1,
      questionText: label,
      questionType: "text_input",
      textEval: { evaluationType: evalType, answerKey: key, numericTolerance: tolerance },
    });
    expect((await publish(admin, versionId)).ok).toBe(true);
    const cfg = await configOf(code, versionId);
    return { code, versionId, qId: cfg.questions[0]?.id as string };
  }

  async function submitText(code: string, versionId: string, questionId: string, textAnswer: string) {
    const st = await rpc<any>("discover/start", { code, studentId: studentId(), versionId });
    const r = await rpc<any>("discover/submitText", { sessionId: st.sessionId, questionId, textAnswer });
    return r.correct === true;
  }
});
