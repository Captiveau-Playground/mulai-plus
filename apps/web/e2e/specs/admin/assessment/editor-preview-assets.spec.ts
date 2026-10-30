// E2E ADMIN — panel "Tampilan siswa" di editor harus merender aset persis seperti
// halaman siswa:
//   · skala likert → emoji dari kolom `icon`, caption HANYA sekali (dulu `label` +
//     `imageCaption` dicetak bersamaan sehingga teks dobel & emoji hilang)
//   · gambar soal (`mediaUrl`) → benar-benar tampil, bukan placeholder
//   · opsi bertanda "kunci" mengikuti skor, bukan opsi pertama
import { expect, type Page, test } from "@playwright/test";
import { contentOf, createAssessment, saveQuestion } from "../../../fixtures/assessment";
import { addDimensionUI, loginAdmin, openEditor } from "../../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EPT";
const codes: string[] = [];
const PANEL = '[data-testid="student-preview"]';
// gambar 1×1 inline — tidak butuh jaringan, jadi test tetap jalan offline
const IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'></svg>";

/** Buka soal pertama di editor (buka grup dimensi dulu bila terlipat). */
async function openFirstQuestion(page: Page) {
  const edit = page.locator('[data-testid="q-edit-0"]');
  if (!(await edit.isVisible().catch(() => false))) {
    const group = page.locator('[data-testid^="q-group-"]').first();
    if (await group.count()) await group.click();
  }
  await edit.click();
}

async function setupEditor(page: Page, code: string) {
  await openEditor(page, code);
  await addDimensionUI(page, "D1", "Dimensi Satu");
}

test.describe("Admin · Aset di panel Tampilan siswa", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("skala likert tampil sebagai emoji & caption tidak dobel", async ({ page }) => {
    test.setTimeout(90000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `Aset ${code}` });
    await setupEditor(page, code);
    const c = await contentOf(page, versionId);
    await saveQuestion(page, versionId, {
      dimensionId: c.dimensions[0]?.id,
      questionText: "Memperbaiki peralatan atau perabotan yang rusak di rumah.",
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
    await page.reload();
    await page.waitForTimeout(2500);
    await openFirstQuestion(page);

    const panel = page.locator(PANEL);
    await expect(panel).toBeVisible({ timeout: 15000 });
    // emoji skala dirender lewat komponen yang sama dengan halaman siswa
    await expect(panel.locator('[data-testid="preview-likert-emoji"]')).toHaveCount(5);
    // caption muncul SEKALI (regresi: dulu "Sangat tidak suka" dua kali)
    await expect(panel.getByText("Sangat tidak suka", { exact: true })).toHaveCount(1);
    await expect(panel.getByText("Sangat suka", { exact: true })).toHaveCount(1);
  });

  test("gambar soal tampil di panel preview + kunci ditandai dari skor", async ({ page }) => {
    test.setTimeout(90000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `Aset ${code}` });
    await setupEditor(page, code);
    const c = await contentOf(page, versionId);
    await saveQuestion(page, versionId, {
      dimensionId: c.dimensions[0]?.id,
      questionText: "Perhatikan gambar, manakah bangun datar?",
      questionType: "multiple_choice",
      mediaUrl: IMG,
      mediaCaption: "Diagram soal",
      options: [
        { optionValue: "A", label: "Pilihan salah", score: 0 },
        { optionValue: "B", label: "Pilihan benar", score: 1 },
      ],
    });
    await page.reload();
    await page.waitForTimeout(2500);
    await openFirstQuestion(page);

    const panel = page.locator(PANEL);
    await expect(panel).toBeVisible({ timeout: 15000 });
    await expect(panel.locator("img")).toHaveCount(1);
    await expect(panel).toContainText("Diagram soal");
    await expect(panel).not.toContainText("Gambar soal belum dipasang");
    // penanda kunci hanya 1 (opsi B) — bukan "opsi pertama selalu ter-highlight"
    await expect(panel.getByText("kunci", { exact: true })).toHaveCount(1);
  });
});
