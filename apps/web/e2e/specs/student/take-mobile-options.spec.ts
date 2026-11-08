// E2E SISWA (mobile) — #2: pilihan jawaban TIDAK boleh terpotong di layar kecil.
// Menguji 3 bentuk render: skala 6 baris, pilihan ganda teks panjang, dan opsi bergambar (grid 2×2).
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, publish, saveQuestion } from "../../fixtures/assessment";
import { loginAdmin } from "../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { runTag } from "../../helpers/env";

const PREFIX = "E2EMB";
const codes: string[] = [];

/** Gambar 1×1 inline supaya tidak butuh jaringan. */
const IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='%23cfe3ff'/></svg>";

async function build(
  page: Page,
  questionType: "likert" | "multiple_choice",
  mode: "text" | "image" | "image6" | "scale6",
  opts: { longQuestion?: boolean; media?: boolean } = {},
) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `Mobile ${code}` });
  const dim = await addDimension(page, versionId, "D1", "Dimensi Satu");
  await configUpdate(page, versionId, {
    total_dim: 1,
    result_dim_count: 1,
    min_q_per_dim: 1,
    section_mode: "none",
    timer_enabled: false,
    scoring_method: "sum",
  });
  const long = "Pilihan jawaban yang teksnya panjang sekali supaya menguji pembungkusan baris di layar sempit";
  const options =
    mode === "scale6"
      ? ["Sangat tidak setuju", "Tidak setuju", "Agak tidak setuju", "Agak setuju", "Setuju", "Sangat setuju"].map(
          (c, i) => ({
            optionValue: "ABCDEF"[i],
            label: c,
            imageCaption: c,
            icon: ["😡", "🙁", "😕", "🙂", "😀", "😍"][i],
            score: i + 1,
          }),
        )
      : mode === "image" || mode === "image6"
        ? (mode === "image6" ? ["A", "B", "C", "D", "E", "F"] : ["A", "B", "C", "D"]).map((v, i) => ({
            optionValue: v,
            label: `Gambar ${v}`,
            imageUrl: IMG,
            imageCaption: `Keterangan ${v}`,
            score: i === 0 ? 1 : 0,
          }))
        : ["A", "B", "C", "D"].map((v, i) => ({ optionValue: v, label: `${v}. ${long}`, score: i === 0 ? 1 : 0 }));

  await saveQuestion(page, versionId, {
    dimensionId: dim,
    questionText: opts.longQuestion
      ? "Soal uji mobile dengan teks yang sangat panjang sekali ".repeat(8)
      : "Soal uji mobile: pilih salah satu",
    mediaUrl: opts.media ? IMG : null,
    mediaCaption: opts.media ? "Gambar soal" : null,
    questionType,
    presentationMode:
      mode === "image" ? "visual_comparison" : mode === "scale6" ? "emoji_option" : "standard_option_card",
    options,
  });
  const gate = await publish(page, versionId);
  expect(gate.ok, `publish: ${JSON.stringify(gate.errors ?? [])}`).toBe(true);
  return { code, versionId };
}

async function startTest(page: Page, code: string, versionId: string) {
  await page.goto(`/dashboard/student/assessment/take/${code}?preview=1&v=${versionId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("button", { name: /Mulai Tes|Mulai$/i }).first()).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("button", { name: /Mulai Tes|Mulai$/i })
    .first()
    .click();
  const tut = page.getByRole("button", { name: /Paham, Mulai|Mulai Simulasi/i }).first();
  await tut.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
  if (await tut.isVisible()) await tut.click();
  await expect(page.getByTestId("question-text")).toBeVisible({ timeout: 20000 });
}

test.describe("Siswa · opsi jawaban di layar mobile", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  // Soal PANJANG + gambar soal → area opsi mengecil drastis (kandidat kuat "terpotong")
  test("soal panjang + gambar soal: area opsi tetap cukup tinggi @ 360×640", async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width: 360, height: 640 });
    const fx = await build(page, "likert", "scale6", {
      longQuestion: true,
      media: true,
    });
    await startTest(page, fx.code, fx.versionId);
    const buttons = page.locator("button").filter({ hasText: /setuju/i });
    await expect(buttons).toHaveCount(6);
    // area opsi (scroll container) harus punya tinggi wajar, bukan 0/terpotong
    const area = page.getByTestId("options-area");
    const ab = await area.boundingBox();
    console.log("### tinggi area opsi:", ab?.height, "| viewport:", 640);
    expect(ab!.height, "area opsi terlalu pendek → opsi terpotong").toBeGreaterThan(140);
    await buttons.last().scrollIntoViewIfNeeded();
    await expect(buttons.last()).toBeInViewport({ ratio: 0.9 });
  });

  // Kasus ekstrem: teks opsi panjang (pembungkusan), 6 opsi bergambar (grid overflow), landscape.
  test("opsi pilihan ganda teks panjang tidak terpotong @ 360×640", async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width: 360, height: 640 });
    const fx = await build(page, "multiple_choice", "text");
    await startTest(page, fx.code, fx.versionId);
    const opts = page.locator("button").filter({ hasText: /menguji pembungkusan/i });
    await expect(opts).toHaveCount(4);
    await opts.last().scrollIntoViewIfNeeded();
    await expect(opts.last()).toBeInViewport({ ratio: 0.9 });
  });

  test("6 opsi bergambar (grid) tidak terpotong @ 360×640", async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width: 360, height: 640 });
    const fx = await build(page, "multiple_choice", "image6");
    await startTest(page, fx.code, fx.versionId);
    const first = page.getByRole("button", { name: /Gambar A/ }).first();
    const last = page.getByRole("button", { name: /Gambar F/ }).first();
    const boxFirst = await first.boundingBox();
    expect(boxFirst!.y, "opsi pertama tidak boleh terpotong di atas").toBeGreaterThanOrEqual(0);
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 0.9 });
  });

  test("landscape 844×390 — opsi tetap bisa diakses", async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width: 844, height: 390 });
    const fx = await build(page, "likert", "scale6");
    await startTest(page, fx.code, fx.versionId);
    const buttons = page.locator("button").filter({ hasText: /setuju/i });
    await expect(buttons).toHaveCount(6);
    await buttons.last().scrollIntoViewIfNeeded();
    await expect(buttons.last()).toBeInViewport({ ratio: 0.9 });
  });

  for (const vp of [
    { width: 390, height: 844 },
    { width: 360, height: 640 },
  ]) {
    test(`skala 6 baris tidak terpotong @ ${vp.width}×${vp.height}`, async ({ page }) => {
      test.setTimeout(240000);
      await page.setViewportSize(vp);
      const fx = await build(page, "likert", "scale6");
      await startTest(page, fx.code, fx.versionId);
      const buttons = page.locator("button").filter({ hasText: /setuju/i });
      await expect(buttons).toHaveCount(6);
      // Opsi terakhir harus berada DI DALAM viewport (tidak terpotong)
      await buttons.last().scrollIntoViewIfNeeded();
      await expect(buttons.last(), "opsi terakhir harus terlihat utuh").toBeInViewport({ ratio: 0.9 });
      const box = await buttons.last().boundingBox();
      expect(box, "bounding box opsi terakhir harus ada").toBeTruthy();
      expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
      // dan bisa dipilih
      await page.keyboard.press("f");
      await expect(page.locator("body")).toContainText(/selesai/i, { timeout: 20000 });
    });

    test(`opsi bergambar (grid 2×2) tidak terpotong atas/bawah @ ${vp.width}×${vp.height}`, async ({ page }) => {
      test.setTimeout(240000);
      await page.setViewportSize(vp);
      const fx = await build(page, "multiple_choice", "image");
      await startTest(page, fx.code, fx.versionId);
      const first = page.getByRole("button", { name: /Gambar A/ }).first();
      const last = page.getByRole("button", { name: /Gambar D/ }).first();
      await expect(first).toBeVisible();
      const boxFirst = await first.boundingBox();
      // Tidak terpotong di ATAS (penyebab: `content-center` pada grid yang overflow)
      expect(boxFirst!.y, "opsi pertama tidak boleh terpotong di atas").toBeGreaterThanOrEqual(0);
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport({ ratio: 0.9 });
      const boxLast = await last.boundingBox();
      expect(boxLast!.y + boxLast!.height).toBeLessThanOrEqual(vp.height + 1);
    });
  }
});
