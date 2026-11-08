// E2E USER (UI) — pengambilan tes di halaman preview: pengantar, instruksi per dimensi,
// dan rendering + penyimpanan jawaban untuk semua tipe soal.
import { expect, type Page, test } from "@playwright/test";
import { buildUiFixture } from "../../fixtures/assessment";
import { createAdminPage } from "../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { likertButtons, openPreview, progressText, sendButton, startRun, textAnswerInput } from "../../helpers/preview";

const codes: string[] = [];
let admin: Page;

test.describe("Siswa (UI) · tipe soal di engine", () => {
  test.beforeAll(async ({ browser }) => {
    admin = await createAdminPage(browser);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("intro menampilkan pengantar & daftar dimensi", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(admin);
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await expect(page.getByText("Sebelum mulai")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Tes ini mengukur minat & cara berpikirmu.")).toBeVisible();
    await expect(page.getByText("Cara menjawab")).toBeVisible();
    await expect(page.getByText("Tidak ada jawaban benar atau salah")).toBeVisible();
    await expect(page.getByText("Dimensi Kreatif")).toBeVisible();
    await expect(page.getByText("Dimensi Analitis")).toBeVisible();
  });

  test("instruksi per dimensi tampil sebelum soal pertama", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(admin);
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await page.getByRole("button", { name: /Mulai Sekarang/ }).click();
    await expect(page.getByRole("heading", { name: "Bagian Dimensi Kreatif" })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Pilih yang paling menggambarkan dirimu")).toBeVisible();
    await page.getByRole("button", { name: /Mulai Bagian Ini/ }).click();
    await expect(page.getByText("Kamu lebih suka bekerja dengan…")).toBeVisible({ timeout: 20000 });
  });

  test("soal pilihan ganda: opsi + ikon emoji muncul & jawaban tersimpan", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(admin, { first: "mc" });
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await startRun(page);
    await expect(page.getByText("Kamu lebih suka bekerja dengan…")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: /Data dan eksperimen/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ide kreatif dan visual/ })).toBeVisible();
    await expect(page.locator("main").getByText("🔬", { exact: true })).toBeVisible();

    expect(await progressText(page)).toBe(`0/${fx.total}`);
    await page.getByRole("button", { name: /Data dan eksperimen/ }).click();
    await expect.poll(() => progressText(page), { timeout: 15000 }).toBe(`1/${fx.total}`);
  });

  test("soal skala (likert): 5 titik pilihan & jawaban tersimpan", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(admin, { first: "likert" });
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await startRun(page);
    await expect(page.getByText("Seberapa nyaman kamu bekerja dalam tim?")).toBeVisible({ timeout: 20000 });
    await expect(likertButtons(page)).toHaveCount(5);

    expect(await progressText(page)).toBe(`0/${fx.total}`);
    await likertButtons(page).nth(4).click();
    await expect.poll(() => progressText(page), { timeout: 15000 }).toBe(`1/${fx.total}`);
  });

  test("soal isian (free text): kirim dengan tombol", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(admin, { first: "text" });
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await startRun(page);
    await expect(page.getByText("Hasil dari 3/4 adalah…")).toBeVisible({ timeout: 20000 });
    await expect(textAnswerInput(page)).toBeVisible();
    await expect(sendButton(page)).toBeVisible();

    expect(await progressText(page)).toBe(`0/${fx.total}`);
    await textAnswerInput(page).fill("0.75");
    await sendButton(page).click();
    await expect.poll(() => progressText(page), { timeout: 15000 }).toBe(`1/${fx.total}`);
  });

  test("soal isian bisa dikirim dengan tombol Enter", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(admin, { first: "text" });
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await startRun(page);
    await expect(page.getByText("Hasil dari 3/4 adalah…")).toBeVisible({ timeout: 20000 });
    await textAnswerInput(page).fill("3/4");
    await textAnswerInput(page).press("Enter");
    await expect.poll(() => progressText(page), { timeout: 15000 }).toBe(`1/${fx.total}`);
  });

  test("label tombol kirim jawaban isian memakai teks yang benar", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(admin, { first: "text" });
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await startRun(page);
    await expect(page.getByText("Hasil dari 3/4 adalah…")).toBeVisible({ timeout: 20000 });
    await expect(sendButton(page)).toHaveText(/^(Kirim|Submit)$/);
  });
});
