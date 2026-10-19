// E2E — config tes dihormati oleh halaman siswa (permintaan analis #1 & #3):
//  · section_mode = "none"  → TANPA layar "Bagian X dari Y" + instruksi per dimensi
//    (soal mengalir terus). "by_dimension" → layar bagian tetap muncul.
//  · allow_pause = false    → tombol jeda di layar bagian disembunyikan.
//  · urutan blok soal mengikuti displayOrder SOAL (bukan urutan baris dimensi),
//    supaya RIASEC tidak jadi E,C,R,I,A,S.
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, publish, saveQuestion } from "../../fixtures/assessment";
import { loginAdmin } from "../../helpers/admin-ui";
import { rpc } from "../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { runTag } from "../../helpers/env";

const PREFIX = "E2ECF";
const codes: string[] = [];

/**
 * Fixture 2 dimensi × 2 soal. `scrambledDims` = dimensi B dibuat lebih dulu
 * (displayOrder 0) padahal soal dimensi A ada di urutan awal → menguji bahwa
 * urutan sesi mengikuti blok SOAL, bukan urutan baris dimensi.
 */
async function build(
  page: Page,
  opts: { sectionMode: "none" | "by_dimension"; allowPause: boolean; scrambledDims?: boolean },
) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `Cfg ${code}` });
  const dimB = await addDimension(page, versionId, "B", "Dimensi B");
  const dimA = await addDimension(page, versionId, "A", "Dimensi A");
  await configUpdate(page, versionId, {
    total_dim: 2,
    result_dim_count: 2,
    min_q_per_dim: 1,
    section_mode: opts.sectionMode,
    allow_pause: opts.allowPause,
    scoring_method: "sum",
    randomize_q: false,
    randomize_a: false,
  });
  const mc = (dimensionId: string, questionText: string, displayOrder: number) =>
    saveQuestion(page, versionId, {
      dimensionId,
      questionText,
      questionType: "multiple_choice",
      displayOrder,
      options: [
        { optionValue: "A", label: `${questionText} — A`, score: 1 },
        { optionValue: "B", label: `${questionText} — B`, score: 0 },
      ],
    });
  // Blok soal: A dulu (0,1), lalu B (2,3)
  await mc(dimA, "Soal A1", 0);
  await mc(dimA, "Soal A2", 1);
  await mc(dimB, "Soal B1", 2);
  await mc(dimB, "Soal B2", 3);
  const gate = await publish(page, versionId);
  expect(gate.ok, `publish: ${JSON.stringify(gate.errors ?? [])}`).toBe(true);
  return { code, versionId, dimA, dimB };
}

/** Jawab lewat keyboard (A–F) — deterministik; klik tombol bisa kena animasi
 *  framer-motion ("element is not stable"). */
async function jawabA(page: Page) {
  await page.keyboard.press("a");
}

async function tutupTutorial(page: Page) {
  const tut = page.getByRole("button", { name: /Paham, Mulai|Mulai Simulasi/i }).first();
  await tut.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
  if (await tut.isVisible()) {
    await tut.click();
    await page.waitForTimeout(500);
  }
}

/** Buka rute tes siswa (preview) sampai layar pertama muncul. */
async function startTest(page: Page, code: string, versionId: string) {
  await page.goto(`/dashboard/student/assessment/take/${code}?preview=1&v=${versionId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("button", { name: /Mulai Tes|Mulai$/i }).first()).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("button", { name: /Mulai Tes|Mulai$/i })
    .first()
    .click();
  await tutupTutorial(page);
}

test.describe("Siswa · config tes dihormati", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("urutan sesi mengikuti blok SOAL, bukan urutan baris dimensi", async ({ page }) => {
    test.setTimeout(180000);
    // `scrambledDims` tidak dipakai build() saat ini: dimensi B memang dibuat lebih dulu,
    // soal dimensi A tetap di urutan 0–1 → urutan sesi harus A,A,B,B.
    const fx = await build(page, { sectionMode: "by_dimension", allowPause: false });
    const cfg = await rpc<{ questions: any[] }>("discover/config", { code: fx.code, versionId: fx.versionId });
    const dimOf = new Map(cfg.questions.map((q) => [q.id, q.dimensionId]));
    const st = await rpc<any>("discover/start", {
      code: fx.code,
      studentId: `e2e-cfg-${Date.now()}`,
      versionId: fx.versionId,
    });
    const seq: string[] = st.orderIds.map((id: string) => dimOf.get(id));
    // Blok: A,A,B,B (dimensi B dibuat lebih dulu, jadi urutan dimensi bukan penentu)
    expect(seq.map((d) => (d === fx.dimA ? "A" : "B")).join("")).toBe("AABB");
  });

  test("section_mode=none: soal langsung mengalir tanpa layar bagian/instruksi", async ({ page }) => {
    test.setTimeout(240000);
    const fx = await build(page, { sectionMode: "none", allowPause: false });
    await startTest(page, fx.code, fx.versionId);
    // Soal pertama langsung tampil (tidak ada "Bagian 1 dari …")
    await expect(page.getByTestId("question-text")).toContainText("Soal A1", { timeout: 20000 });
    await expect(page.locator("body")).not.toContainText(/Bagian 1 dari/i);
    await expect(page.locator("body")).not.toContainText(/Mulai bagian/i);
    // Jawab → soal berikutnya langsung (tanpa layar bagian)
    await jawabA(page);
    await expect(page.getByTestId("question-text")).toContainText("Soal A2", { timeout: 20000 });
    await expect(page.locator("body")).not.toContainText(/selesai! 🎉/);
  });

  test("section_mode=by_dimension: layar bagian muncul & pause tampil bila allow_pause=true", async ({ page }) => {
    test.setTimeout(240000);
    const fx = await build(page, { sectionMode: "by_dimension", allowPause: true });
    await startTest(page, fx.code, fx.versionId);
    await expect(page.locator("body")).toContainText(/Bagian 1 dari 2/i, { timeout: 20000 });
    await expect(page.locator("body")).toContainText(/Mulai bagian/i);
    // Selesaikan bagian 1 (A1, A2) → overlay selesai bagian + tombol pause muncul
    await page.getByRole("button", { name: /Mulai bagian/i }).click();
    await page.waitForTimeout(700); // biarkan animasi transisi selesai
    await expect(page.getByTestId("question-text")).toContainText("Soal A1", { timeout: 20000 });
    await jawabA(page);
    await expect(page.getByTestId("question-text")).toContainText("Soal A2", { timeout: 20000 });
    await jawabA(page);
    await expect(page.locator("body")).toContainText(/selesai/i, { timeout: 20000 });
    // allow_pause=true → overlay antar bagian menampilkan opsi berhenti
    await expect(page.locator("body")).toContainText(/Berhenti di sini/i, { timeout: 20000 });
    await page.getByRole("button", { name: /Lanjut ke Dimensi B/i }).click();
    await page.waitForTimeout(700);
    await expect(page.locator("body")).toContainText(/Bagian 2 dari 2/i, { timeout: 20000 });
  });

  test("allow_pause=false: tombol jeda tidak muncul walau layar bagian tampil", async ({ page }) => {
    test.setTimeout(240000);
    const fx = await build(page, { sectionMode: "by_dimension", allowPause: false });
    await startTest(page, fx.code, fx.versionId);
    await expect(page.locator("body")).toContainText(/Bagian 1 dari 2/i, { timeout: 20000 });
    await page.getByRole("button", { name: /Mulai bagian/i }).click();
    await page.waitForTimeout(700); // biarkan animasi transisi selesai
    await expect(page.getByTestId("question-text")).toContainText("Soal A1", { timeout: 20000 });
    await jawabA(page);
    await expect(page.getByTestId("question-text")).toContainText("Soal A2", { timeout: 20000 });
    await jawabA(page);
    await expect(page.locator("body")).toContainText(/selesai/i, { timeout: 20000 });
    // allow_pause=false → tidak ada opsi berhenti, baik di overlay maupun intro bagian
    await expect(page.locator("body")).not.toContainText(/Berhenti di sini/i);
    await page.getByRole("button", { name: /Lanjut ke Dimensi B/i }).click();
    await page.waitForTimeout(700);
    await expect(page.locator("body")).toContainText(/Bagian 2 dari 2/i, { timeout: 20000 });
    await expect(page.locator("body")).not.toContainText(/Berhenti dulu/i);
  });
});
