// E2E ADMIN — pengisian seluruh aturan di panel "Aturan tes" (accordion) & persistensinya.
import { expect, test } from "@playwright/test";
import { createAssessment } from "../../../fixtures/assessment";
import {
  addDimensionUI,
  loginAdmin,
  openEditor,
  openGroup,
  ruleValue,
  saveRules,
  setRule,
} from "../../../helpers/admin-ui";
import { rpc } from "../../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2ER";
const codes: string[] = [];

async function newAssessment(page: import("@playwright/test").Page, label: string) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `${label} ${code}` });
  return { code, versionId };
}

async function configOf(code: string, versionId: string) {
  const r = await rpc<{ config: any }>("discover/config", { code, versionId });
  return r.config;
}

test.describe("Admin · Editor — aturan", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("grup accordion bisa dibuka & ringkasannya terbaca", async ({ page }) => {
    test.setTimeout(90000);
    const { code } = await newAssessment(page, "Grup");
    await openEditor(page, code);

    // ringkasan tampil walau grup tertutup
    await expect(page.locator('[data-testid="group-trigger-waktu"]')).toContainText(/Tanpa batas waktu/i);
    await expect(page.locator('[data-testid="group-trigger-penilaian"]')).toContainText(/top-/i);
    await expect(page.locator('[data-testid="group-trigger-pengalaman"]')).toContainText(/satu bagian/i);

    await openGroup(page, "waktu");
    await expect(page.locator('[data-testid="rule-timer_enabled"]')).toBeVisible();
    await openGroup(page, "penilaian");
    await expect(page.locator('[data-testid="rule-scoring_method"]')).toBeVisible();
  });

  test("aturan penilaian tersimpan (cara nilai, top-N, min soal, mode likert)", async ({ page }) => {
    test.setTimeout(90000);
    const { code, versionId } = await newAssessment(page, "Nilai");
    await openEditor(page, code);

    await openGroup(page, "penilaian");
    await setRule(page, "scoring_method", "weighted");
    await setRule(page, "result_dim_count", 3);
    await setRule(page, "min_q_per_dim", 4);
    await setRule(page, "scoring_mode", "likert");
    // skala min/maks hanya muncul di mode likert
    await expect(page.locator('[data-testid="rule-likert_min"]')).toBeVisible();
    await setRule(page, "likert_min", 2);
    await setRule(page, "likert_max", 7);
    await saveRules(page);

    const cfg = await configOf(code, versionId);
    expect(cfg.scoring_method, "cara nilai").toBe("weighted");
    expect(cfg.result_dim_count, "top-N").toBe(3);
    expect(cfg.min_q_per_dim, "min soal per dimensi").toBe(4);
    expect(cfg.scoring_mode, "pembobotan bagian").toBe("likert");
    expect(cfg.likert_min, "skala minimal").toBe(2);
    expect(cfg.likert_max, "skala maksimal").toBe(7);
  });

  test("aturan timer per bagian (+ peringatan durasi) & per soal", async ({ page }) => {
    test.setTimeout(90000);
    const { code, versionId } = await newAssessment(page, "Timer");
    await openEditor(page, code);

    await addDimensionUI(page, "D1", "Dimensi Satu"); // tanpa durasi
    await openGroup(page, "waktu");
    await setRule(page, "timer_enabled", true);
    await setRule(page, "timer_scope", "dimension");
    await expect(page.locator('[data-testid="timer-duration-warning"]')).toContainText(/1 dimensi belum punya durasi/i);
    await saveRules(page);

    let cfg = await configOf(code, versionId);
    expect(cfg).toMatchObject({ timer_enabled: true, timer_scope: "dimension" });

    // pindah ke per soal → field detik muncul
    await setRule(page, "timer_scope", "question");
    await expect(page.locator('[data-testid="rule-time_per_question"]')).toBeVisible();
    await setRule(page, "time_per_question", 45);
    await saveRules(page);

    cfg = await configOf(code, versionId);
    expect(cfg).toMatchObject({ timer_scope: "question", time_per_question: 45 });

    // ringkasan header ikut berubah
    await expect(page.locator('[data-testid="group-trigger-waktu"]')).toContainText(/45 detik\/soal/i);
  });

  test("aturan pengalaman siswa tersimpan (acak soal/opsi, pause, bagian, bahasa)", async ({ page }) => {
    test.setTimeout(90000);
    const { code, versionId } = await newAssessment(page, "Pengalaman");
    await openEditor(page, code);

    await openGroup(page, "pengalaman");
    await setRule(page, "randomize_q", true);
    await setRule(page, "randomize_a", true);
    await setRule(page, "allow_pause", true);
    await setRule(page, "section_mode", "by_dimension");
    await setRule(page, "lang", "en");
    await saveRules(page);

    const cfg = await configOf(code, versionId);
    expect(cfg).toMatchObject({
      randomize_q: true,
      randomize_a: true,
      allow_pause: true,
      section_mode: "by_dimension",
      lang: "en",
    });
    await expect(page.locator('[data-testid="group-trigger-pengalaman"]')).toContainText(
      /acak soal · acak opsi · boleh pause/i,
    );
  });

  test("nilai yang tersimpan terbaca kembali saat editor dibuka ulang", async ({ page }) => {
    test.setTimeout(90000);
    const { code } = await newAssessment(page, "Persist");
    await openEditor(page, code);
    await openGroup(page, "penilaian");
    await setRule(page, "scoring_method", "average");
    await setRule(page, "result_dim_count", 2);
    await saveRules(page);

    await page.reload();
    await page.waitForTimeout(2000);
    await openGroup(page, "penilaian");
    expect(await ruleValue(page, "scoring_method")).toBe("average");
    expect(await ruleValue(page, "result_dim_count")).toBe("2");
  });
});
