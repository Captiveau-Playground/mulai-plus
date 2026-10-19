// E2E ADMIN — #6 hapus tes: tetap BISA, tapi lewat tangga konfirmasi.
//   1) ringkasan dampak (versi/soal/sesi)
//   2) WAJIB unduh backup JSON dulu
//   3) WAJIB mengetik kode tes
//   + tes minat/bakat resmi tidak bisa dihapus dari UI (server menolak juga).
import { expect, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, saveQuestion } from "../../../fixtures/assessment";
import { loginAdmin } from "../../../helpers/admin-ui";
import { adminRpc } from "../../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EDEL";
const codes: string[] = [];

async function build(page: any) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `Hapus ${code}` });
  const dim = await addDimension(page, versionId, "D1", "Dimensi Satu");
  await configUpdate(page, versionId, { total_dim: 1, result_dim_count: 1, min_q_per_dim: 1, section_mode: "none" });
  for (const [i, text] of ["Soal satu", "Soal dua"].entries()) {
    await saveQuestion(page, versionId, {
      dimensionId: dim,
      questionText: text,
      questionType: "multiple_choice",
      displayOrder: i,
      options: [
        { optionValue: "A", label: "Ya", score: 1 },
        { optionValue: "B", label: "Tidak", score: 0 },
      ],
    });
  }
  return { code, versionId };
}

test.describe("Admin · hapus tes dengan tangga konfirmasi", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("backup wajib + kode tes harus tepat sebelum hapus permanen", async ({ page }) => {
    test.setTimeout(240000);
    const { code } = await build(page);
    await page.goto("/admin/assessment/editor", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId(`test-row-${code}`)).toBeVisible({ timeout: 30000 });

    await page.getByTestId(`del-open-${code}`).click();
    // Langkah 1: ringkasan dampak
    await expect(page.getByTestId("del-impact")).toContainText(/2 soal/i, { timeout: 20000 });
    // Tombol hapus masih terkunci
    await expect(page.getByTestId("del-confirm")).toBeDisabled();
    await expect(page.getByTestId("del-code")).toBeDisabled();

    // Langkah 2: unduh backup (wajib)
    const dl = page.waitForEvent("download", { timeout: 20000 }).catch(() => null);
    await page.getByTestId("del-backup").click();
    await dl;
    await expect(page.getByTestId("del-backup-done")).toBeVisible({ timeout: 20000 });

    // Langkah 3: kode harus tepat
    await page.getByTestId("del-code").fill("KODE-SALAH");
    await expect(page.getByTestId("del-confirm")).toBeDisabled();
    await page.getByTestId("del-code").fill(code);
    await expect(page.getByTestId("del-confirm")).toBeEnabled();
    await page.getByTestId("del-confirm").click();
    await expect(page.getByTestId("del-dialog")).toBeHidden({ timeout: 30000 });
    await expect(page.getByTestId(`test-row-${code}`)).toBeHidden({ timeout: 30000 });
  });

  test("tes minat resmi (DISCOVER) tidak bisa dihapus dari UI", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/admin/assessment/editor", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("test-row-DISCOVER")).toBeVisible({ timeout: 30000 });
    await page.getByTestId("del-open-DISCOVER").click();
    await expect(page.getByTestId("del-dialog")).toContainText(/tidak bisa dihapus dari sini/i, { timeout: 20000 });
    await expect(page.getByTestId("del-confirm")).toHaveCount(0);
    await page.getByRole("button", { name: /Mengerti/i }).click();
  });

  test("server menolak kode salah & melindungi tes minat/bakat", async ({ page }) => {
    test.setTimeout(180000);
    const { code } = await build(page);
    // kode salah
    const wrong = await adminRpc<any>(page, "discoverAdmin/remove", { id: "bukan-id", confirmCode: code });
    expect(wrong.ok).toBe(false);
    // DISCOVER: cari id-nya lewat summaries lalu coba hapus dengan kode benar
    const items = await adminRpc<any>(page, "discoverAdmin/summaries", {});
    const disc = (items.items ?? []).find((x: any) => x.code === "DISCOVER");
    expect(disc, "DISCOVER harus ada").toBeTruthy();
    const prot = await adminRpc<any>(page, "discoverAdmin/remove", { id: disc.id, confirmCode: "DISCOVER" });
    expect(prot.ok).toBe(false);
    expect(prot.error).toBe("protected_assessment");
  });
});
