// E2E ADMIN — #5 preview mengikuti perubahan & #4 error gate bisa diklik (deep-link).
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, contentOf, createAssessment, saveQuestion } from "../../../fixtures/assessment";
import { loginAdmin, openEditor } from "../../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EPG";
const codes: string[] = [];

async function build(page: Page, questions: Parameters<typeof saveQuestion>[2][]) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `Prev ${code}` });
  await openEditor(page, code);
  const dim = await addDimension(page, versionId, "D1", "Dimensi Satu");
  await configUpdate(page, versionId, {
    total_dim: 1,
    result_dim_count: 1,
    min_q_per_dim: 1,
    section_mode: "none",
    timer_enabled: false,
  });
  for (const q of questions) await saveQuestion(page, versionId, { ...q, dimensionId: dim } as any);
  return { code, versionId, dim };
}

/** Buka preview (toolbar) → mainkan sampai soal pertama → kembalikan teks soal. */
async function teksSoalDiPreview(page: Page): Promise<string> {
  await page.getByTestId("q-preview").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 20000 });
  const inner = page.frameLocator('[data-testid="preview-frame"]');
  await inner
    .getByRole("button", { name: /Mulai Tes|Mulai$/i })
    .first()
    .click();
  const tut = inner.getByRole("button", { name: /Paham, Mulai|Mulai Simulasi/i }).first();
  await tut.waitFor({ state: "visible", timeout: 10000 }).catch(() => undefined);
  if (await tut.isVisible()) await tut.click();
  const text = await inner.getByTestId("question-text").innerText({ timeout: 30000 });
  const closeBtn = dialog.getByRole("button", { name: /close|tutup/i }).first();
  if (await closeBtn.count()) await closeBtn.click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
  return text;
}

test.describe("Admin · preview & gate", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("#5 preview memuat ulang & menampilkan perubahan soal", async ({ page }) => {
    test.setTimeout(300000);
    const fx = await build(page, [
      {
        questionText: "Teks LAMA untuk preview",
        questionType: "multiple_choice",
        options: [
          { optionValue: "A", label: "Benar", score: 1 },
          { optionValue: "B", label: "Salah", score: 0 },
        ],
      },
    ]);
    await page.reload();
    await page.waitForTimeout(2500);

    expect(await teksSoalDiPreview(page)).toContain("Teks LAMA");

    // Ubah teks soal lewat panel editor
    await page.getByTestId("q-edit-0").click();
    await page.getByTestId("q-text").fill("Teks BARU untuk preview");
    await page.getByTestId("q-save").click();
    await page.waitForTimeout(2000);

    // Preview dibuka lagi → harus menampilkan teks BARU (bukan cache)
    expect(await teksSoalDiPreview(page)).toContain("Teks BARU");
    // url preview memakai nonce (cache-busting)
    await page.getByTestId("q-preview").click();
    const src = await page.locator('[data-testid="preview-frame"]').getAttribute("src");
    expect(src, "preview harus membawa nonce t=").toMatch(/[?&]t=\d+/);
    void fx;
  });

  test("#4 error gate bisa diklik untuk membuka soal yang bermasalah", async ({ page }) => {
    test.setTimeout(240000);
    // Likert dengan 1 titik skala → gate error (persis kasus draf DISCOVER v5)
    const fx = await build(page, [
      {
        questionText: "Skala rusak (1 titik)",
        questionType: "likert",
        options: [
          { optionValue: "A", label: "Sangat tidak suka", imageCaption: "Sangat tidak suka", icon: "😡", score: 1 },
        ],
      },
    ]);
    await page.reload();
    await page.waitForTimeout(2500);

    // Blok error gate muncul & menyebut soal
    await expect(page.locator("body")).toContainText(/titik skala/i, { timeout: 20000 });
    // Klik item error → panel soal terbuka dengan teks soal tersebut
    await page
      .getByRole("button", { name: /Skala Likert pada soal/i })
      .first()
      .click();
    await expect(page.getByTestId("q-text")).toHaveValue("Skala rusak (1 titik)", { timeout: 15000 });
    void fx;
  });
});
