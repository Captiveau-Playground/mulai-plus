// E2E ENGINE (API) — kontrak payload & urutan soal yang dilihat siswa.
//
// Regresi yang dijaga:
//  1. payload siswa tidak membocorkan kunci: opsi TANPA `score`/`targetDimension`,
//     dan soal isian menyertakan `textEval` (tipe penilaian + mode keyboard).
//  2. `randomize_a` hanya mengacak pilihan ganda — SKALA LIKERT selalu urut.
//  3. `section_mode: by_dimension` → urutan sesi dikelompokkan per dimensi walau
//     `displayOrder` soal berselang (penyebab bagian berlabel salah / "dimensi tercampur").
//  4. Sesi dari bank soal LAMA (questionOrderIds menunjuk soal yang sudah tidak ada)
//     diperbaiki otomatis saat dilanjutkan.
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, saveQuestion } from "../../fixtures/assessment";
import { createAdminPage } from "../../helpers/admin-ui";
import { rpc } from "../../helpers/api";
import { closeDb, deleteAssessmentByCode, q } from "../../helpers/db";
import { runTag } from "../../helpers/env";

const PREFIX = "E2EPL";
const codes: string[] = [];
let admin: Page;
const student = () => `e2e-pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Fixture: 2 dimensi, soal SENGAJA berselang, termasuk isian alfa/angka & skala likert. */
async function buildInterleaved(page: Page) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `Payload ${code}` });
  const a = await addDimension(page, versionId, "A", "Dimensi A");
  const b = await addDimension(page, versionId, "B", "Dimensi B");
  await configUpdate(page, versionId, {
    total_dim: 2,
    result_dim_count: 2,
    min_q_per_dim: 1,
    section_mode: "by_dimension",
    randomize_a: true, // sengaja aktif → skala likert tetap tidak boleh diacak
    randomize_q: false,
  });
  // displayOrder berselang: A, B, A, B, A, B
  await saveQuestion(page, versionId, {
    dimensionId: a,
    displayOrder: 0,
    questionText: "PG A1",
    questionType: "multiple_choice",
    options: [
      { optionValue: "A", label: "A1-a", score: 1 },
      { optionValue: "B", label: "A1-b", score: 0 },
    ],
  });
  await saveQuestion(page, versionId, {
    dimensionId: b,
    displayOrder: 1,
    questionText: "PG B1",
    questionType: "multiple_choice",
    options: [
      { optionValue: "A", label: "B1-a", score: 0 },
      { optionValue: "B", label: "B1-b", score: 1 },
    ],
  });
  await saveQuestion(page, versionId, {
    dimensionId: a,
    displayOrder: 2,
    questionText: "Tulis antonim dari kata OPTIMIS.",
    questionType: "text_input",
    textEval: { evaluationType: "exact_match", answerKey: "pesimis" },
  });
  await saveQuestion(page, versionId, {
    dimensionId: b,
    displayOrder: 3,
    questionText: "Hitung 3/4 + 0,5 (tulis dalam desimal).",
    questionType: "text_input",
    textEval: { evaluationType: "numeric_tolerance", answerKey: "1.25", numericTolerance: "0.01" },
  });
  await saveQuestion(page, versionId, {
    dimensionId: a,
    displayOrder: 4,
    questionText: "Saya suka bekerja dengan alat.",
    questionType: "likert",
    presentationMode: "emoji_option",
    options: [
      { optionValue: "A", label: "Sangat tidak suka", imageCaption: "Sangat tidak suka", icon: "😡", score: 1 },
      { optionValue: "B", label: "Tidak suka", imageCaption: "Tidak suka", icon: "🙁", score: 2 },
      { optionValue: "C", label: "Netral", imageCaption: "Netral", icon: "😐", score: 3 },
      { optionValue: "D", label: "Suka", imageCaption: "Suka", icon: "🙂", score: 4 },
      { optionValue: "E", label: "Sangat suka", imageCaption: "Sangat suka", icon: "😍", score: 5 },
    ],
  });
  await saveQuestion(page, versionId, {
    dimensionId: b,
    displayOrder: 5,
    questionText: "PG B2",
    questionType: "multiple_choice",
    options: [
      { optionValue: "A", label: "B2-a", score: 1 },
      { optionValue: "B", label: "B2-b", score: 0 },
    ],
  });
  return { code, versionId, dimA: a, dimB: b };
}

const cfgOf = (code: string, versionId: string) =>
  rpc<{ questions: any[]; runSections: any[] }>("discover/config", { code, versionId });

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
  await closeDb();
  await admin.context().close();
});

test.describe("Engine · payload siswa & urutan bagian", () => {
  test("opsi tidak membocorkan skor/dimensi, isian membawa textEval", async () => {
    test.setTimeout(180000);
    const fx = await buildInterleaved(admin);
    const cfg = await cfgOf(fx.code, fx.versionId);

    const mc = cfg.questions.find((x) => x.questionType === "multiple_choice");
    expect(Object.keys(mc.opts[0]).sort()).toEqual(
      ["displayOrder", "icon", "id", "imageCaption", "imageUrl", "label", "optionValue"].sort(),
    );
    expect(mc.opts[0]).not.toHaveProperty("score");
    expect(mc.opts[0]).not.toHaveProperty("targetDimension");

    // kunci jawaban isian tidak boleh ikut terkirim
    const alfa = cfg.questions.find((x) => x.questionText.includes("antonim"));
    expect(JSON.stringify(alfa)).not.toContain("pesimis");
    expect(alfa.textEval).toEqual({ evaluationType: "exact_match", inputMode: "text" });

    const angka = cfg.questions.find((x) => x.questionText.includes("3/4"));
    expect(angka.textEval).toEqual({ evaluationType: "numeric_tolerance", inputMode: "numeric" });

    // soal non-isian tidak punya textEval
    expect(mc.textEval).toBeNull();
  });

  test("randomize_a mengacak pilihan ganda, tetapi skala likert tetap urut", async () => {
    test.setTimeout(180000);
    const fx = await buildInterleaved(admin);
    const cfg = await cfgOf(fx.code, fx.versionId);
    const st = await rpc<any>("discover/start", { code: fx.code, studentId: student(), versionId: fx.versionId });

    const likert = cfg.questions.find((x) => x.questionType === "likert");
    expect(st.optionOrder?.[likert.id], "opsi skala likert tidak boleh diacak").toBeUndefined();

    // opsi likert di payload tetap naik sesuai displayOrder (tangga yang bermakna)
    const caps = likert.opts.map((o: any) => o.imageCaption);
    expect(caps).toEqual(["Sangat tidak suka", "Tidak suka", "Netral", "Suka", "Sangat suka"]);
  });

  test("section_mode by_dimension: soal berselang tetap dikelompokkan per dimensi", async () => {
    test.setTimeout(180000);
    const fx = await buildInterleaved(admin);
    const cfg = await cfgOf(fx.code, fx.versionId);
    const dimOf = new Map(cfg.questions.map((x) => [x.id, x.dimensionId]));

    const st = await rpc<any>("discover/start", { code: fx.code, studentId: student(), versionId: fx.versionId });
    const seq: string[] = st.orderIds.map((id: string) => dimOf.get(id) ?? "?");

    // displayOrder berselang A,B,A,B,A,B → urutan sesi harus A,A,A,B,B,B (2 blok)
    const blok = seq.filter((d, i) => i === 0 || d !== seq[i - 1]).length;
    expect(blok, `urutan sesi masih berselang: ${seq.join(",")}`).toBe(2);
    expect(seq.filter((d) => d === fx.dimA).length).toBe(3);
    expect(seq.filter((d) => d === fx.dimB).length).toBe(3);
  });

  test("sesi dari bank soal lama diperbaiki otomatis saat dilanjutkan", async () => {
    test.setTimeout(180000);
    const fx = await buildInterleaved(admin);
    const cfg = await cfgOf(fx.code, fx.versionId);
    const sid = student();
    const st = await rpc<any>("discover/start", { code: fx.code, studentId: sid, versionId: fx.versionId });
    expect(st.repaired ?? false).toBe(false);

    // tiru bank soal yang diganti: order sesi menunjuk soal yang sudah tidak ada
    await q(
      "update assessment_sessions set config_json = jsonb_set(config_json, '{questionOrderIds}', $2::jsonb) where id = $1",
      [st.sessionId, JSON.stringify(["soal-lama-1", "soal-lama-2", "soal-lama-3"])],
    );

    const again = await rpc<any>("discover/start", { code: fx.code, studentId: sid, versionId: fx.versionId });
    expect(again.sessionId).toBe(st.sessionId); // tetap sesi yang sama (lanjut, bukan mulai ulang)
    expect(again.repaired, "sesi basi harus ditandai & diperbaiki").toBe(true);
    expect(again.orderIds.length).toBe(cfg.questions.length);
    expect(new Set(again.orderIds)).toEqual(new Set(cfg.questions.map((x) => x.id)));
  });
});
