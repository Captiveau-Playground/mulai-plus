// E2E SISWA — Temuan 20 Okt #3: timer harus BENAR-BENAR jalan.
//  · countdown tampil di layar soal
//  · saat waktu bagian habis → otomatis lanjut ke bagian/soal berikutnya (bukan diam)
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, publish, saveQuestion } from "../../fixtures/assessment";
import { createAdminPage, loginAdmin } from "../../helpers/admin-ui";
import { adminRpc } from "../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { runTag } from "../../helpers/env";

const codes: string[] = [];
let admin: Page;

/** 2 dimensi; tiap dimensi dijadwalkan 6 detik (scope: per bagian). */
async function build(page: Page) {
  const { code } = runTag("E2ETA");
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `AutoAdv ${code}` });
  const dA = await addDimension(page, versionId, "A", "Dim A");
  const dB = await addDimension(page, versionId, "B", "Dim B");
  await configUpdate(page, versionId, {
    total_dim: 2,
    result_dim_count: 2,
    min_q_per_dim: 1,
    section_mode: "none",
    timer_enabled: true,
    timer_scope: "none", // hanya override per dimensi yang berlaku
    scoring_method: "sum",
  });
  for (const [dim, scope] of [
    [dA, "dimension"],
    [dB, "dimension"],
  ] as const) {
    await adminRpc(page, "discoverAdmin/versions/dimsUpdate", {
      dimensionId: dim,
      timerScope: scope,
      durationSeconds: 6,
    });
  }
  for (const [i, [text, dim]] of [
    ["Soal A1", dA],
    ["Soal A2", dA],
    ["Soal B1", dB],
    ["Soal B2", dB],
  ].entries()) {
    const d = dim as string;
    await saveQuestion(page, versionId, {
      dimensionId: d,
      questionText: text as string,
      questionType: "multiple_choice",
      displayOrder: i,
      options: [
        { optionValue: "A", label: `${text} A`, score: 1 },
        { optionValue: "B", label: `${text} B`, score: 0 },
      ],
    });
  }
  expect((await publish(page, versionId)).ok).toBe(true);
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

test.describe("Siswa · timer aktif & auto-advance", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test("countdown tampil dan bagian yang habis otomatis lanjut ke bagian berikutnya", async ({ page }) => {
    test.setTimeout(240000);
    const fx = await build(page);
    await page.goto(`/dashboard/student/assessment/take/${fx.code}?preview=1&v=${fx.versionId}`, {
      waitUntil: "domcontentloaded",
    });
    const cta = page.getByRole("button", { name: /Mulai Tes|Mulai$/i }).first();
    await cta.click({ force: true, timeout: 30000 });
    const tut = page.getByRole("button", { name: /Paham, Mulai|Mulai Simulasi/i }).first();
    await tut.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
    if (await tut.isVisible()) await tut.click({ force: true });
    await page.waitForTimeout(400);

    await expect(page.getByTestId("question-text")).toContainText("Soal A1", { timeout: 20000 });
    // countdown MM:SS terlihat (timer per bagian aktif)
    await expect(page.locator("body")).toContainText(/\d{2}:\d{2}/, { timeout: 15000 });

    // tunggu deadline bagian A (6 detik) lewat → harus otomatis pindah ke bagian B
    await expect(page.getByTestId("question-text")).toContainText("Soal B1", { timeout: 20000 });
    await expect(page.locator("#root, body")).toContainText(/Waktu .*habis/i);
  });
});
