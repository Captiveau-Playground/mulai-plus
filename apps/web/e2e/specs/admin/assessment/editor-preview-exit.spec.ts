// E2E ADMIN — Temuan 20 Okt #2: di PREVIEW, tombol "Keluar & Simpan" tidak boleh
// melempar admin ke dashboard student. Dialog preview harus yang tertutup.
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, saveQuestion } from "../../../fixtures/assessment";
import { createAdminPage, loginAdmin, openEditor } from "../../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const codes: string[] = [];
let admin: Page;

async function build(page: Page) {
  const { code } = runTag("E2EPX");
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `PrevExit ${code}` });
  await openEditor(page, code);
  const d = await addDimension(page, versionId, "D1", "Dimensi Satu");
  await configUpdate(page, versionId, {
    total_dim: 1,
    result_dim_count: 1,
    min_q_per_dim: 1,
    section_mode: "none",
    timer_enabled: false,
  });
  await saveQuestion(page, versionId, {
    dimensionId: d,
    questionText: "Soal preview exit",
    questionType: "multiple_choice",
    options: [
      { optionValue: "A", label: "A", score: 1 },
      { optionValue: "B", label: "B", score: 0 },
    ],
  });
  // sengaja TIDAK publish: versi live membuat editor read-only sehingga tombol
  // "Preview" (q-preview) tidak tampil. Preview tetap bisa memakai versi draf.
  return { code, versionId };
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
  await closeDb();
  await admin.context().close();
});

test.describe("Admin · preview tidak terlempar ke area siswa", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test("keluar dari tes di preview menutup dialog, URL admin tetap", async ({ page }) => {
    test.setTimeout(240000);
    const fx = await build(page);
    await page.reload();
    await page.waitForTimeout(2500);

    await page.getByTestId("q-preview").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 20000 });

    const inner = page.frameLocator('[data-testid="preview-frame"]');
    const cta = inner.getByRole("button", { name: /Mulai Tes|Mulai$/i }).first();
    await cta.scrollIntoViewIfNeeded().catch(() => undefined);
    await cta.click({ force: true, timeout: 30000 });
    const tut = inner.getByRole("button", { name: /Paham, Mulai|Mulai Simulasi/i }).first();
    await tut.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
    if (await tut.isVisible()) await tut.click({ force: true });
    await page.waitForTimeout(500);
    await expect(inner.getByTestId("question-text")).toBeVisible({ timeout: 20000 });

    // X → Keluar & Simpan
    await inner
      .getByRole("button", { name: /Keluar test/i })
      .first()
      .click({ force: true });
    await page.waitForTimeout(300);
    await inner
      .getByRole("button", { name: /Keluar & Simpan/i })
      .first()
      .click({ force: true });

    // dialog preview tertutup & URL admin tidak berubah
    await expect(dialog).toBeHidden({ timeout: 20000 });
    expect(page.url()).toContain(`/admin/assessment/editor/${fx.code}`);
  });
});
