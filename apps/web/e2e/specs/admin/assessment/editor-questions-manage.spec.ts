// E2E ADMIN — kelola soal: urutan, salin, hapus, edit (termasuk regresi kunci jawaban isian),
// dan nomor urut unik per dimensi (syarat gate publish).
import { expect, test } from "@playwright/test";
import { contentOf, createAssessment, saveQuestion, validate } from "../../../fixtures/assessment";
import {
  addDimensionUI,
  addQuestionUI,
  loginAdmin,
  openEditor,
  questionCount,
  questionTexts,
} from "../../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EM";
const codes: string[] = [];

async function setup(page: import("@playwright/test").Page, label: string, dims = 1) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `${label} ${code}` });
  await openEditor(page, code);
  for (let i = 0; i < dims; i++) await addDimensionUI(page, `D${i + 1}`, `Dimensi ${i + 1}`);
  return { code, versionId };
}

test.describe("Admin · Editor — kelola soal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("urut naik/turun, salin, dan hapus soal", async ({ page }) => {
    test.setTimeout(180000);
    const { versionId } = await setup(page, "Kelola");
    await addQuestionUI(page, { text: "Soal satu", options: ["A", "B"] });
    await addQuestionUI(page, { text: "Soal dua", options: ["A", "B"] });
    await expect.poll(() => questionCount(page), { timeout: 20000 }).toBe(2);

    // turunkan soal pertama → urutan berubah
    await page.locator('[data-testid="q-down-0"]').click();
    await expect
      .poll(async () => (await contentOf(page, versionId)).questions.map((q) => q.questionText), { timeout: 20000 })
      .toEqual(["Soal dua", "Soal satu"]);

    // salin soal pertama → 3 soal
    await page.locator('[data-testid="q-dup-0"]').click();
    await expect.poll(() => questionCount(page), { timeout: 20000 }).toBe(3);

    // hapus satu → 2 soal
    await page.locator('[data-testid="q-del-0"]').click();
    await expect.poll(() => questionCount(page), { timeout: 20000 }).toBe(2);
    expect((await contentOf(page, versionId)).questions).toHaveLength(2);
  });

  test("urutan daftar soal mengikuti displayOrder", async ({ page }) => {
    test.setTimeout(180000);
    const { versionId } = await setup(page, "Urut");
    await addQuestionUI(page, { text: "Pertama", options: ["A", "B"] });
    await addQuestionUI(page, { text: "Kedua", options: ["A", "B"] });
    await addQuestionUI(page, { text: "Ketiga", options: ["A", "B"] });

    await expect
      .poll(async () => (await contentOf(page, versionId)).questions.map((q) => q.questionText), { timeout: 20000 })
      .toEqual(["Pertama", "Kedua", "Ketiga"]);
    const texts = await questionTexts(page);
    expect(texts[0]).toContain("Pertama");
    expect(texts[2]).toContain("Ketiga");
  });

  test("beberapa soal di dimensi yang sama dapat nomor urut unik (lolos gate)", async ({ page }) => {
    test.setTimeout(180000);
    const { versionId } = await setup(page, "DisplayOrder");
    await addQuestionUI(page, { text: "Satu", options: ["A", "B"] });
    await addQuestionUI(page, { text: "Dua", options: ["A", "B"] });
    await addQuestionUI(page, { text: "Tiga", options: ["A", "B"] });

    const c = await contentOf(page, versionId);
    const orders = c.questions.map((q) => q.displayOrder);
    expect(new Set(orders).size, `displayOrder harus unik, dapat ${JSON.stringify(orders)}`).toBe(orders.length);

    const gate = await validate(page, versionId);
    expect(gate.errors.filter((e) => /nomor urut/i.test(e))).toEqual([]);
  });

  test("edit soal isian memuat kunci jawaban yang sudah ada & tidak menghapusnya", async ({ page }) => {
    test.setTimeout(180000);
    const { versionId } = await setup(page, "EditIsian");
    const c0 = await contentOf(page, versionId);
    await saveQuestion(page, versionId, {
      dimensionId: c0.dimensions[0]?.id,
      questionText: "Isian yang sudah punya kunci",
      questionType: "text_input",
      textEval: { evaluationType: "numeric_tolerance", answerKey: "42", numericTolerance: "0.01" },
    });

    await page.reload();
    await page.waitForTimeout(2500);
    await page.locator('[data-testid="q-edit-0"]').click();
    await expect(page.locator("#q-panel")).toBeVisible({ timeout: 15000 });

    // regresi: form harus memuat kunci yang tersimpan, bukan kosong
    await expect(page.locator('[data-testid="q-answer-key"]')).toHaveValue("42");
    await expect(page.locator('[data-testid="q-tolerance"]')).toHaveValue("0.01");
    await page.locator('[data-testid="q-save"]').click();
    await expect(page.locator("#q-panel")).toBeHidden({ timeout: 20000 });

    const c = await contentOf(page, versionId);
    const tc = c.textConfigs.find((t) => t.questionId === c.questions[0]?.id);
    expect(tc?.answerKey, "kunci jawaban harus utuh setelah edit").toBe("42");
  });

  test("mengubah dimensi soal isian tetap menyimpan konfigurasi evaluasinya", async ({ page }) => {
    test.setTimeout(180000);
    const { versionId } = await setup(page, "PindahDim", 2);
    const c0 = await contentOf(page, versionId);
    await saveQuestion(page, versionId, {
      dimensionId: c0.dimensions[0]?.id,
      questionText: "Soal pindah dimensi",
      questionType: "text_input",
      textEval: { evaluationType: "exact_match", answerKey: "jakarta" },
    });

    await page.reload();
    await page.waitForTimeout(2500);
    await page.locator('[data-testid="q-edit-0"]').click();
    await expect(page.locator("#q-panel")).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="q-dimension"]').selectOption({ index: 1 });
    await page.locator('[data-testid="q-save"]').click();
    await expect(page.locator("#q-panel")).toBeHidden({ timeout: 20000 });

    const c = await contentOf(page, versionId);
    const tc = c.textConfigs.find((t) => t.questionId === c.questions[0]?.id);
    expect(tc?.evaluationType).toBe("exact_match");
    expect(tc?.answerKey).toBe("jakarta");
    expect(c.questions[0]?.dimensionId).toBe(c.dimensions[1]?.id);
  });
});
