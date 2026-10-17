// E2E SISWA (rute asli) — soal isian: keyboard mengikuti TIPE PENILAIAN soal.
//
// Regresi: dulu input isian di-hardcode angka (`inputMode="decimal"` + saringan
// `[^\d.,/-]`), sehingga jawaban alfa seperti antonim "pesimis" MUSTAHIL diketik —
// padahal server sudah bisa menilainya (exact_match).
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, publish, saveQuestion } from "../../fixtures/assessment";
import { loginAdmin } from "../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { runTag } from "../../helpers/env";

const PREFIX = "E2ETX";
const codes: string[] = [];

/** Fixture 1 dimensi + 1 soal isian, langsung dirilis. */
async function build(page: Page, label: string, questionText: string, textEval: Record<string, unknown>) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `${label} ${code}` });
  const d1 = await addDimension(page, versionId, "D1", "Dimensi Satu");
  await configUpdate(page, versionId, { total_dim: 1, result_dim_count: 1, min_q_per_dim: 1, section_mode: "none" });
  await saveQuestion(page, versionId, { dimensionId: d1, questionText, questionType: "text_input", textEval });
  const gate = await publish(page, versionId);
  expect(gate.ok, `publish fixture: ${JSON.stringify(gate.errors ?? [])}`).toBe(true);
  return { code, versionId };
}

async function tutupTutorial(page: Page) {
  const tut = page.getByRole("button", { name: /Paham, Mulai|Mulai Simulasi/i }).first();
  await tut.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
  if (await tut.isVisible()) {
    await tut.click();
    await page.waitForTimeout(600);
  }
}

/** Buka rute tes siswa (mode preview) sampai soal pertama siap. */
async function startTest(page: Page, code: string, versionId: string, soal: RegExp) {
  await page.goto(`/dashboard/student/assessment/take/${code}?preview=1&v=${versionId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("button", { name: /Mulai Tes|Mulai$/i }).first()).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("button", { name: /Mulai Tes|Mulai$/i })
    .first()
    .click();
  await tutupTutorial(page);
  const begin = page.getByRole("button", { name: /Mulai bagian/i }).first();
  await begin.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
  if (await begin.isVisible()) await begin.click();
  await tutupTutorial(page);
  await expect(page.getByText(soal)).toBeVisible({ timeout: 20000 });
}

test.describe("Siswa · jawaban isian (alfa & angka)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("jawaban alfa (antonim) bisa diketik dan dikirim", async ({ page }) => {
    test.setTimeout(240000);
    const fx = await build(page, "TX-A", "Tulis antonim dari kata OPTIMIS.", {
      evaluationType: "exact_match",
      answerKey: "pesimis",
    });
    await startTest(page, fx.code, fx.versionId, /Tulis antonim dari kata OPTIMIS/);

    // label + petunjuk menyesuaikan tipe (kata, bukan angka)
    await expect(page.locator("body")).toContainText("Tulis jawaban (kata / kalimat)");
    const input = page.locator('input[inputmode="text"]').first();
    await expect(input).toBeVisible({ timeout: 15000 });

    // huruf HARUS diterima apa adanya (dulu langsung dibuang oleh saringan angka)
    await input.fill("PESIMIS");
    await expect(input, "huruf tidak boleh disaring untuk soal non-angka").toHaveValue("PESIMIS");
    await input.fill("pesimis ");
    await expect(input).toHaveValue("pesimis ");

    await page.getByRole("button", { name: /^Jawab$/ }).click();
    await expect(page.locator("body")).toContainText(/Selesai/i, { timeout: 25000 });
  });

  test("jawaban angka tetap memakai keyboard angka (huruf ditolak)", async ({ page }) => {
    test.setTimeout(240000);
    const fx = await build(page, "TX-N", "Hitung 3/4 + 0,5 (tulis dalam desimal).", {
      evaluationType: "numeric_tolerance",
      answerKey: "1.25",
      numericTolerance: "0.01",
    });
    await startTest(page, fx.code, fx.versionId, /Hitung 3\/4/);

    await expect(page.locator("body")).toContainText("Tulis jawaban (angka / pecahan)");
    const input = page.locator('input[inputmode="decimal"]').first();
    await expect(input).toBeVisible({ timeout: 15000 });

    await input.fill("abc"); // huruf tetap dibuang untuk soal angka
    await expect(input).toHaveValue("");
    await input.fill("1,25");
    await expect(input).toHaveValue("1,25");

    await page.getByRole("button", { name: /^Jawab$/ }).click();
    await expect(page.locator("body")).toContainText(/Selesai/i, { timeout: 25000 });
  });
});
