// E2E ADMIN — daftar soal di editor: pengelompokan per dimensi, pencarian, buka/tutup grup.
import { expect, test } from "@playwright/test";
import { contentOf, createAssessment, saveQuestion } from "../../../fixtures/assessment";
import { addDimensionUI, loginAdmin, openEditor } from "../../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EQL";
const codes: string[] = [];

/** Fixture dengan displayOrder yang ditentukan sendiri (untuk menguji urutan ber-blok / berselang). */
async function buildWithOrder(
  page: import("@playwright/test").Page,
  label: string,
  plan: { dim: "D1" | "D2"; text: string }[],
) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `${label} ${code}` });
  await openEditor(page, code);
  await addDimensionUI(page, "D1", "Dimensi Satu");
  await addDimensionUI(page, "D2", "Dimensi Dua");
  const c = await contentOf(page, versionId);
  const dimId = Object.fromEntries(c.dimensions.map((d) => [d.code, d.id])) as { D1: string; D2: string };
  for (const [i, item] of plan.entries()) {
    await saveQuestion(page, versionId, {
      dimensionId: dimId[item.dim],
      questionText: item.text,
      questionType: "multiple_choice",
      displayOrder: i,
      options: [
        { optionValue: "A", label: "A", score: 1 },
        { optionValue: "B", label: "B", score: 0 },
      ],
    });
  }
  await page.reload();
  await page.waitForTimeout(2500);
  return { code, versionId };
}

const BLOCK_PLAN = [
  { dim: "D1" as const, text: "Satu-A" },
  { dim: "D1" as const, text: "Satu-B" },
  { dim: "D1" as const, text: "Satu-C" },
  { dim: "D2" as const, text: "Dua-A" },
  { dim: "D2" as const, text: "Dua-B" },
];

// >20 soal berselang-seling → daftar harus tetap datar + muncul penjelasan
const INTERLEAVED_PLAN = Array.from({ length: 24 }, (_, i) => ({
  dim: i % 2 === 0 ? ("D1" as const) : ("D2" as const),
  text: `Selang-${String(i + 1).padStart(2, "0")}`,
}));

test.describe("Admin · Editor — daftar soal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("dikelompokkan per dimensi saat urutan soal ber-blok", async ({ page }) => {
    test.setTimeout(90000);
    const fx = await buildWithOrder(page, "Blok", BLOCK_PLAN);

    await expect(page.locator('[data-testid="q-group-D1"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="q-group-D2"]')).toBeVisible();

    // header grup menampilkan nama dimensi + jumlah soal
    await expect(page.locator('[data-testid="q-group-trigger-D1"]')).toContainText(/Dimensi Satu/);
    await expect(page.locator('[data-testid="q-group-trigger-D1"]')).toContainText("3 soal");
    await expect(page.locator('[data-testid="q-group-trigger-D2"]')).toContainText("2 soal");

    // ≤30 soal → semua grup terbuka, jadi barisnya langsung terlihat
    await expect(page.getByText("Satu-A")).toBeVisible();
    await expect(page.getByText("Dua-B")).toBeVisible();

    // dimensi tidak lagi diulang di tiap baris (sudah diwakili header grup)
    await expect(page.locator('[data-testid="question-row"]').first()).not.toContainText("Dimensi Satu");
    void fx;
  });

  test("buka/tutup semua grup", async ({ page }) => {
    test.setTimeout(90000);
    await buildWithOrder(page, "Toggle", BLOCK_PLAN);
    await expect(page.locator('[data-testid="q-group-D1"]')).toBeVisible({ timeout: 20000 });

    const toggle = page.locator('[data-testid="q-toggle-all"]');
    await expect(toggle).toHaveText(/Tutup semua/); // default: semua terbuka (≤30 soal)
    await toggle.click();
    await expect(page.getByText("Satu-A")).toBeHidden();
    await expect(toggle).toHaveText(/Buka semua/);
    await toggle.click();
    await expect(page.getByText("Satu-A")).toBeVisible();
  });

  test("pencarian menyaring soal dan membuka grup yang cocok", async ({ page }) => {
    test.setTimeout(90000);
    await buildWithOrder(page, "Cari", BLOCK_PLAN);
    await expect(page.locator('[data-testid="q-group-D1"]')).toBeVisible({ timeout: 20000 });

    // tutup semua dulu, lalu cari → grup yang punya kecocokan otomatis terbuka
    await page.locator('[data-testid="q-toggle-all"]').click();
    await expect(page.getByText("Dua-A")).toBeHidden();

    await page.locator('[data-testid="q-search"]').fill("Dua-");
    await expect(page.locator('[data-testid="q-search-count"]')).toContainText("2 cocok");
    await expect(page.getByText("Dua-A")).toBeVisible();
    await expect(page.getByText("Satu-A")).toBeHidden();
    // grup tanpa hasil tidak ditampilkan
    await expect(page.locator('[data-testid="q-group-D1"]')).toHaveCount(0);

    await page.locator('[data-testid="q-search"]').fill("tidak-ada-soal-ini");
    await expect(page.locator('[data-testid="q-search-count"]')).toContainText("0 cocok");
  });

  test("tetap datar + diberi penjelasan saat urutan soal berselang", async ({ page }) => {
    test.setTimeout(90000);
    await buildWithOrder(page, "Selang", INTERLEAVED_PLAN);

    await expect(page.locator('[data-testid="question-row"]').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="q-group-D1"]')).toHaveCount(0);
    await expect(page.getByText(/tidak berurutan per dimensi/i)).toBeVisible();
    // dimensi tetap ditampilkan di tiap baris karena tidak ada header grup
    await expect(page.locator('[data-testid="question-row"]').first()).toContainText("Dimensi Satu");
    await expect(page.getByText("Selang-24")).toBeVisible();
  });
});
