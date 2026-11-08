// E2E SISWA — kebutuhan proses analis (20 Okt):
//  A. Tombol keluar (X) tersedia di SEMUA layar (intro & layar bagian), bukan hanya soal.
//  B. Elapsed time SELALU tampil (termasuk mobile) + countdown bersamaan saat timer aktif.
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, publish, saveQuestion } from "../../fixtures/assessment";
import { createAdminPage, loginAdmin } from "../../helpers/admin-ui";
import { adminRpc } from "../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { runTag } from "../../helpers/env";

const codes: string[] = [];
let admin: Page;

async function build(page: Page, opts: { dims: number; timerSeconds?: number; sectionMode?: "none" | "by_dimension" }) {
  const { code } = runTag("E2EEX");
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `Exit ${code}` });
  const dims: string[] = [];
  for (let i = 0; i < opts.dims; i++) dims.push(await addDimension(page, versionId, `D${i + 1}`, `Dim ${i + 1}`));
  await configUpdate(page, versionId, {
    total_dim: opts.dims,
    result_dim_count: opts.dims,
    min_q_per_dim: 1,
    section_mode: opts.sectionMode ?? "none",
    timer_enabled: Boolean(opts.timerSeconds),
    timer_scope: opts.timerSeconds ? "none" : "none",
    scoring_method: "sum",
  });
  if (opts.timerSeconds) {
    for (const d of dims) {
      await adminRpc(page, "discoverAdmin/versions/dimsUpdate", {
        dimensionId: d,
        timerScope: "dimension",
        durationSeconds: opts.timerSeconds,
      });
    }
  }
  let order = 0;
  for (const [i, d] of dims.entries()) {
    await saveQuestion(page, versionId, {
      dimensionId: d,
      questionText: `Soal dim ${i + 1}`,
      questionType: "multiple_choice",
      displayOrder: order++,
      options: [
        { optionValue: "A", label: `D${i + 1} A`, score: 1 },
        { optionValue: "B", label: `D${i + 1} B`, score: 0 },
      ],
    });
  }
  expect((await publish(page, versionId)).ok).toBe(true);
  return { code, versionId };
}

async function buka(page: Page, code: string, versionId: string) {
  await page.goto(`/dashboard/student/assessment/take/${code}?preview=1&v=${versionId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("button", { name: /Mulai Tes|Mulai$/i }).first()).toBeVisible({ timeout: 30000 });
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
  await closeDb();
  await admin.context().close();
});

test.describe("Siswa · X di semua layar & elapsed time", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test("A. X tersedia di layar intro & layar bagian, konfirmasi keluar berfungsi", async ({ page }) => {
    test.setTimeout(240000);
    const fx = await build(page, { dims: 2, sectionMode: "by_dimension" });
    await buka(page, fx.code, fx.versionId);

    // intro: ada X
    await expect(page.getByTestId("exit-button")).toHaveCount(1);
    await page.getByTestId("exit-button").click();
    await expect(page.getByText("Progresmu aman")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Lanjut Test/i }).click();
    await expect(page.getByText("Progresmu aman")).toBeHidden();

    // masuk ke layar bagian pertama: X tetap ada
    await page
      .getByRole("button", { name: /Mulai Tes|Mulai$/i })
      .first()
      .click();
    const tut = page.getByRole("button", { name: /Paham, Mulai|Mulai Simulasi/i }).first();
    await tut.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
    if (await tut.isVisible()) await tut.click();
    await expect(page.locator("body")).toContainText(/Bagian 1 dari 2/i, { timeout: 20000 });
    await expect(page.getByTestId("exit-button")).toHaveCount(1);
    await page.getByTestId("exit-button").click();
    await expect(page.getByText("Progresmu aman")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Lanjut Test/i }).click();
    await expect(page.locator("body")).toContainText(/Bagian 1 dari 2/i);
  });

  test("B. elapsed time tampil di mobile; countdown tampil bersamaan saat timer aktif", async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width: 375, height: 667 });

    // tanpa timer: elapsed tetap tampil di mobile (dulu hidden di <sm)
    const noTimer = await build(page, { dims: 1 });
    await buka(page, noTimer.code, noTimer.versionId);
    await page
      .getByRole("button", { name: /Mulai Tes|Mulai$/i })
      .first()
      .click();
    const tut = page.getByRole("button", { name: /Paham, Mulai|Mulai Simulasi/i }).first();
    await tut.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
    if (await tut.isVisible()) await tut.click();
    await expect(page.getByTestId("question-text")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("elapsed-chip")).toBeVisible();
    const t1 = await page.getByTestId("elapsed-chip").innerText();
    await page.waitForTimeout(2200);
    const t2 = await page.getByTestId("elapsed-chip").innerText();
    expect(t2, "elapsed harus berjalan").not.toBe(t1);
    await expect(page.getByTestId("countdown-chip")).toHaveCount(0);

    // dengan timer: elapsed + countdown tampil bersamaan
    const withTimer = await build(page, { dims: 1, timerSeconds: 60 });
    await buka(page, withTimer.code, withTimer.versionId);
    await page
      .getByRole("button", { name: /Mulai Tes|Mulai$/i })
      .first()
      .click();
    const tut2 = page.getByRole("button", { name: /Paham, Mulai|Mulai Simulasi/i }).first();
    await tut2.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
    if (await tut2.isVisible()) await tut2.click();
    await expect(page.getByTestId("question-text")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("elapsed-chip")).toBeVisible();
    await expect(page.getByTestId("countdown-chip")).toBeVisible();
  });
});
