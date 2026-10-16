// E2E ADMIN — checklist kelayakan, gate verifikasi, rilis versi, dan draf baru.
import { expect, test } from "@playwright/test";
import { contentOf, createAssessment, publish, saveQuestion, summaries, validate } from "../../../fixtures/assessment";
import {
  addDimensionUI,
  addQuestionUI,
  loginAdmin,
  openEditor,
  openGroup,
  publishVersionUI,
  setRule,
} from "../../../helpers/admin-ui";
import { adminRpc } from "../../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EP";
const codes: string[] = [];

test.describe("Admin · Editor — kelayakan & rilis", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("checklist berubah hijau setelah isi dimensi & soal yang cukup", async ({ page }) => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    await createAssessment(page, { code, name: `Rilis ${code}` });
    await openEditor(page, code);

    const checklist = page.locator('[data-testid="validation-checklist"]');
    await expect(checklist.getByText(/perlu diperbaiki/)).toBeVisible();

    await addDimensionUI(page, "D1", "Dimensi Satu");
    await openGroup(page, "penilaian");
    await setRule(page, "min_q_per_dim", 1);
    await setRule(page, "result_dim_count", 1);
    await page.locator('[data-testid="save-rules"]').click();
    await page.waitForTimeout(1500);
    await addQuestionUI(page, { text: "Soal pertama", options: ["A", "B"] });

    await expect(checklist.getByText(/Siap terbit/)).toBeVisible({ timeout: 25000 });
  });

  test("gate menolak rilis saat belum lengkap, berhasil setelah lengkap", async ({ page }) => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const created = await createAssessment(page, { code, name: `Gate ${code}` });
    await openEditor(page, code);
    await addDimensionUI(page, "D1", "Dimensi Satu");
    await openGroup(page, "penilaian");
    await setRule(page, "min_q_per_dim", 1);
    await setRule(page, "result_dim_count", 1);
    await page.locator('[data-testid="save-rules"]').click();
    await page.waitForTimeout(1500);

    // belum ada soal → gate menolak
    const before = await validate(page, created.versionId);
    expect(before.ok).toBe(false);

    await addQuestionUI(page, { text: "Soal gate", options: ["A", "B"] });
    const after = await validate(page, created.versionId);
    expect(after.errors).toEqual([]);
    expect(after.ok).toBe(true);

    await publishVersionUI(page, 1);
    const live = (await summaries(page)).find((a) => a.code === code)?.versions.find((v: any) => v.status === "live");
    expect(live, "versi harus menjadi live").toBeTruthy();
  });

  test("rilis versi baru mengarsipkan versi live sebelumnya", async ({ page }) => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `Versi ${code}` });
    await openEditor(page, code);
    const c0 = await contentOf(page, versionId);
    await addDimensionUI(page, "D1", "Dim V");
    await openGroup(page, "penilaian");
    await setRule(page, "min_q_per_dim", 1);
    await setRule(page, "result_dim_count", 1);
    await page.locator('[data-testid="save-rules"]').click();
    await page.waitForTimeout(1500);
    void c0;

    const c1 = await contentOf(page, versionId);
    await saveQuestion(page, versionId, {
      dimensionId: c1.dimensions[0]?.id,
      questionText: "Soal v1",
      questionType: "multiple_choice",
      options: [
        { optionValue: "A", label: "A", score: 1 },
        { optionValue: "B", label: "B", score: 0 },
      ],
    });
    expect((await publish(page, versionId)).ok).toBe(true);

    // buat draf v2 dari versi live + rilis
    const draft = await adminRpc<{ ok: boolean; versionId: string; versionNumber: number }>(
      page,
      "discoverAdmin/versions/createDraft",
      { code },
    );
    expect(draft.ok).toBe(true);
    expect(draft.versionNumber).toBe(2);
    expect((await publish(page, draft.versionId)).ok).toBe(true);

    const versions = (await summaries(page)).find((a) => a.code === code)?.versions;
    expect(versions.filter((v: any) => v.status === "live")).toHaveLength(1);
    expect(versions.find((v: any) => v.status === "live").versionNumber).toBe(2);
    expect(versions.find((v: any) => v.versionNumber === 1).status).toBe("archived");
  });

  test("versi live read-only: tombol Ubah aturan menggantikan Tambah soal", async ({ page }) => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `RO ${code}` });
    await openEditor(page, code);
    await addDimensionUI(page, "D1", "Dim RO");
    await openGroup(page, "penilaian");
    await setRule(page, "min_q_per_dim", 1);
    await setRule(page, "result_dim_count", 1);
    await page.locator('[data-testid="save-rules"]').click();
    await page.waitForTimeout(1500);
    await addQuestionUI(page, { text: "Soal RO", options: ["A", "B"] });
    await publishVersionUI(page, 1);

    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-testid="start-edit"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="q-add"]')).toHaveCount(0);
    void versionId;
  });
});
