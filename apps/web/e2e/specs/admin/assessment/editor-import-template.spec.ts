// E2E ADMIN — template soal (CSV & Excel) bisa diimpor lewat fitur "Import Soal".
// Memakai file asli dari packages/db/templates/assessment/ supaya kontrak kolom ikut terjaga.

import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { contentOf, createAssessment } from "../../../fixtures/assessment";
import { loginAdmin, openEditor, questionCount } from "../../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2ETP";
const codes: string[] = [];
const TEMPLATES = resolve(process.cwd(), "../../packages/db/templates/assessment");

async function importTemplate(
  page: import("@playwright/test").Page,
  file: string,
  expectedRows: number,
  label: string,
) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `${label} ${code}` });
  await openEditor(page, code);

  await page.locator('[data-testid="q-import"]').click();
  await page.locator('input[type="file"]').setInputFiles(resolve(TEMPLATES, file));
  await expect(page.getByText(new RegExp(`${expectedRows} baris terbaca`))).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: new RegExp(`Impor ${expectedRows} soal`) }).click();
  await expect(page.getByText(new RegExp(`${expectedRows} soal berhasil ditambahkan`))).toBeVisible({
    timeout: 120000,
  });
  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await page.waitForTimeout(2500);
  return { code, versionId };
}

test.describe("Admin · Template soal (CSV & Excel)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("talent-items.csv: 120 soal, 5 dimensi otomatis, semua tipe & mode jawaban masuk", async ({ page }) => {
    test.setTimeout(90000);
    const { versionId } = await importTemplate(page, "talent-items.csv", 120, "Tpl CSV");
    await expect.poll(() => questionCount(page), { timeout: 30000 }).toBe(120);

    const c = await contentOf(page, versionId);
    expect(c.questions).toHaveLength(120);
    // 5 dimensi dibuat otomatis dari kolom Dimensi
    expect(c.dimensions.map((d) => d.code).sort()).toEqual(["clerical", "logical", "numerical", "spatial", "verbal"]);
    // distribusi tipe sesuai bank
    const perType = c.questions.reduce<Record<string, number>>(
      (a, q) => ({ ...a, [q.questionType]: (a[q.questionType] ?? 0) + 1 }),
      {},
    );
    expect(perType).toEqual({ multiple_choice: 60, text_input: 40, likert: 20 });
    // mode penilaian isian (4 mode) ikut terpasang
    const evals = c.textConfigs.reduce<Record<string, number>>(
      (a, t) => ({ ...a, [t.evaluationType]: (a[t.evaluationType] ?? 0) + 1 }),
      {},
    );
    expect(evals.exact_match).toBeGreaterThan(0);
    expect(evals.numeric_tolerance).toBeGreaterThan(0);
    expect(evals.keyword_match).toBeGreaterThan(0);
    expect(evals.pattern_match).toBeGreaterThan(0);
    // soal skala dapat 5 titik + emoji
    const likert = c.questions.find((q) => q.questionType === "likert")!;
    const opts = c.options.filter((o) => o.questionId === likert.id);
    expect(opts).toHaveLength(5);
    expect(opts.map((o) => o.icon)).toEqual(["😡", "🙁", "😐", "🙂", "😍"]);
    expect(opts.map((o) => o.score)).toEqual([1, 2, 3, 4, 5]);
    // mode tampilan ikut terbaca dari kolom "Tampilan"
    expect(c.questions.some((q) => (q as any).presentationMode === "emoji_option")).toBe(true);
    expect(c.questions.some((q) => (q as any).presentationMode === "visual_comparison")).toBe(true);
  });

  test("discover-items.csv: 120 soal skala dengan caption emoji", async ({ page }) => {
    test.setTimeout(90000);
    const { versionId } = await importTemplate(page, "discover-items.csv", 120, "Tpl DISC");
    await expect.poll(() => questionCount(page), { timeout: 30000 }).toBe(120);

    const c = await contentOf(page, versionId);
    expect(c.dimensions.map((d) => d.code).sort()).toEqual(["A", "C", "E", "I", "R", "S"]);
    expect(c.questions.every((q) => q.questionType === "likert")).toBe(true);
    const first = c.questions[0]!;
    const opts = c.options.filter((o) => o.questionId === first.id);
    expect(opts.map((o) => o.label)).toEqual(["Sangat tidak suka", "Tidak suka", "Netral", "Suka", "Sangat suka"]);
  });

  test("talent-items.xlsx: sheet 'Soal' terbaca dari Excel", async ({ page }) => {
    test.setTimeout(90000);
    const { versionId } = await importTemplate(page, "talent-items.xlsx", 120, "Tpl XLSX");
    const c = await contentOf(page, versionId);
    expect(c.questions).toHaveLength(120);
    expect(c.dimensions).toHaveLength(5);
  });
});
