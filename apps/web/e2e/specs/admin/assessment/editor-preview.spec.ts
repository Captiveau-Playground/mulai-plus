// E2E ADMIN — preview di editor memakai HALAMAN SISWA ASLI (rute take), bukan halaman
// preview publik lama (/assessment/talent) yang memakai komponen engine berbeda.
import { expect, test } from "@playwright/test";
import { contentOf, createAssessment, saveQuestion } from "../../../fixtures/assessment";
import { addDimensionUI, loginAdmin, openEditor } from "../../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EPV";
const codes: string[] = [];

test.describe("Admin · Preview sebagai siswa", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("dialog preview memuat rute tes siswa yang sebenarnya (dan bisa dimainkan)", async ({ page }) => {
    test.setTimeout(240000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `Preview ${code}` });
    await openEditor(page, code);
    await addDimensionUI(page, "D1", "Dimensi Satu");
    const c = await contentOf(page, versionId);
    await saveQuestion(page, versionId, {
      dimensionId: c.dimensions[0]!.id,
      questionText: "Soal preview: 7 + 5 = ?",
      questionType: "multiple_choice",
      options: [
        { optionValue: "A", label: "11", score: 0 },
        { optionValue: "B", label: "12", score: 1 },
      ],
    });
    await page.reload();
    await page.waitForTimeout(2500);

    await page.locator('[data-testid="q-preview"]').click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 20000 });
    await expect(dialog).toContainText(/Preview sebagai siswa/i);

    // iframe menunjuk ke rute siswa (bukan /assessment/talent)
    const frame = page.locator('[data-testid="preview-frame"]');
    await expect(frame).toBeVisible();
    const src = await frame.getAttribute("src");
    expect(src, "preview harus memakai rute siswa").toContain("/dashboard/student/assessment/take/");
    expect(src).toContain("preview=1");
    expect(src).not.toContain("/assessment/talent");

    // UI siswa benar-benar termuat & bisa dimainkan di dalam iframe
    const inner = page.frameLocator('[data-testid="preview-frame"]');
    await expect(inner.getByRole("button", { name: /Mulai/i }).first()).toBeVisible({ timeout: 45000 });
    await expect(inner.locator("body")).toContainText(/1 soal/);
    await inner.getByRole("button", { name: /Mulai/i }).first().click();
    // layar instruksi bagian (kalau ada) → lanjut
    const begin = inner.getByRole("button", { name: /Mulai bagian/i }).first();
    await begin.waitFor({ state: "visible", timeout: 20000 }).catch(() => undefined);
    if (await begin.isVisible()) await begin.click();
    await expect(inner.locator("body")).toContainText("Soal preview: 7 + 5 = ?", { timeout: 30000 });

    // tutup lewat tombol close milik dialog (Escape tidak sampai ke parent saat fokus di iframe)
    const closeBtn = dialog.getByRole("button", { name: /close|tutup/i }).first();
    if (await closeBtn.count()) {
      await closeBtn.click();
      await expect(dialog).toBeHidden({ timeout: 15000 });
    }
  });
});
