// E2E ADMIN — kerangka editor: panel terbuka, daftar versi, dimensi, status read-only.
import { expect, test } from "@playwright/test";
import { contentOf, createAssessment, versionOf } from "../../../fixtures/assessment";
import {
  addDimensionUI,
  addQuestionUI,
  loginAdmin,
  openEditor,
  openGroup,
  publishVersionUI,
} from "../../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EL";
const codes: string[] = [];

test.describe("Admin · Editor — kerangka", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("editor terbuka & menampilkan struktur (versi, aturan, daftar soal)", async ({ page }) => {
    test.setTimeout(120000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    await createAssessment(page, { code, name: `Editor ${code}` });

    await openEditor(page, code);
    await expect(page.getByRole("heading", { name: new RegExp(code) })).toBeVisible();
    await expect(page.getByText("Rilis & Versi")).toBeVisible();
    await expect(page.locator('[data-testid="version-list"]')).toBeVisible();
    await expect(page.getByText("v1")).toBeVisible();
    await expect(page.getByText(/Daftar soal/).first()).toBeVisible();
    await expect(page.locator('[data-testid="validation-checklist"]')).toBeVisible();
  });

  test("checklist kelayakan menampilkan item yang belum terpenuhi", async ({ page }) => {
    test.setTimeout(120000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    await createAssessment(page, { code, name: `Checklist ${code}` });
    await openEditor(page, code);

    const checklist = page.locator('[data-testid="validation-checklist"]');
    await expect(checklist.getByText(/perlu diperbaiki/)).toBeVisible();
    // belum ada dimensi & soal → banyak item merah
    await expect(checklist.locator('[data-testid="check-fail"]').first()).toBeVisible();
  });

  test("tambah dimensi via UI + isi durasi tersimpan", async ({ page }) => {
    test.setTimeout(120000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `Dim ${code}` });
    await openEditor(page, code);

    await addDimensionUI(page, "R", "Realistic", 120);
    await expect(page.locator('[data-testid="dim-row-R"]')).toBeVisible();

    const c = await contentOf(page, versionId);
    expect(c.dimensions.map((d) => d.code)).toEqual(["R"]);
    expect(c.dimensions[0]?.durationSeconds).toBe(120);
  });

  test("hapus dimensi lewat tombol di tabel", async ({ page }) => {
    test.setTimeout(120000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `DimDel ${code}` });
    await openEditor(page, code);
    await addDimensionUI(page, "X", "Dimensi X");

    await page.locator('[data-testid="dim-delete-X"]').click();
    await expect(page.locator('[data-testid="dim-row-X"]')).toBeHidden({ timeout: 20000 });
    const c = await contentOf(page, versionId);
    expect(c.dimensions).toHaveLength(0);
  });

  test("versi live bersifat read-only (tombol Ubah aturan, bukan Tambah soal)", async ({ page }) => {
    test.setTimeout(120000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `RO ${code}` });
    // lengkapi supaya bisa dirilis
    await page.goto(`/admin/assessment/editor/${code}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
    await addDimensionUI(page, "D", "Dim");
    await openGroup(page, "penilaian");
    await page.locator('[data-testid="rule-min_q_per_dim"]').fill("0");
    await page.locator('[data-testid="save-rules"]').click();
    await page.waitForTimeout(1200);
    await addQuestionUI(page, { text: "Soal RO", options: ["A", "B"] });

    await publishVersionUI(page, 1);

    const v = await versionOf(page, code, "live");
    expect(v.version, "versi harus jadi live").toBeTruthy();

    // buka versi live → UI read-only
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-testid="start-edit"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="q-add"]')).toHaveCount(0);
    void versionId;
  });
});
