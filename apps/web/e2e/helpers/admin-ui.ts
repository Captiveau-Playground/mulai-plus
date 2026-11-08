// Helper interaksi panel admin (editor assessment).
// Semua kontrol dicari lewat `data-testid` supaya test tidak bergantung pada styling/urutan DOM.
import { expect, type Page } from "@playwright/test";
import { adminRpc } from "./api";
import { ensureAdmin, loginUI, preAcceptCookies } from "./auth";

export type RuleGroup = "waktu" | "penilaian" | "pengalaman" | "dimensi" | "konten";

/** Login sebagai admin e2e (akun dibuat/dipromosikan otomatis). */
export async function loginAdmin(page: Page) {
  await preAcceptCookies(page);
  const admin = await ensureAdmin();
  await loginUI(page, admin.email, admin.password);
  await page.goto("/admin");
  await page.waitForTimeout(800);
}

/** Buka editor sebuah tes & tunggu panel aturan siap. */
export async function openEditor(page: Page, code: string) {
  await page.goto(`/admin/assessment/editor/${code}`);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByText("Rilis & Versi")).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(600);
}

/** Buka grup accordion (idempotent). */
export async function openGroup(page: Page, group: RuleGroup) {
  const trigger = page.locator(`[data-testid="group-trigger-${group}"]`).first();
  await expect(trigger).toBeVisible({ timeout: 15000 });
  if ((await trigger.getAttribute("aria-expanded")) !== "true") {
    await trigger.click();
    await page.waitForTimeout(250);
  }
}

/** Isi satu field aturan — otomatis mendeteksi switch / segmented / select / number. */
export async function setRule(page: Page, key: string, value: string | number | boolean) {
  const el = page.locator(`[data-testid="rule-${key}"]`).first();
  await expect(el).toBeVisible({ timeout: 10000 });
  const { tag, role } = await el.evaluate((e) => ({ tag: e.tagName.toLowerCase(), role: e.getAttribute("role") }));
  // Switch (base-ui) = <span role="switch">, tombol segmented = <button aria-pressed>
  if (role === "switch" || tag === "button") {
    const want = value === true || value === 1 || value === "1";
    const now =
      (await el.getAttribute("aria-checked")) === "true" || (await el.getAttribute("aria-pressed")) === "true";
    if (now !== want) await el.click();
    return;
  }
  if (tag === "div") {
    // segmented control
    await el.locator(`button[data-value="${String(value)}"]`).click();
    return;
  }
  if (tag === "select") {
    await el.selectOption(String(value));
    return;
  }
  await el.fill(String(value));
}

export async function ruleValue(page: Page, key: string): Promise<string | null> {
  const el = page.locator(`[data-testid="rule-${key}"]`).first();
  const { tag, role } = await el.evaluate((e) => ({ tag: e.tagName.toLowerCase(), role: e.getAttribute("role") }));
  if (role === "switch" || tag === "button") return el.getAttribute("aria-checked");
  if (tag === "div") {
    const pressed = el.locator('button[aria-pressed="true"]').first();
    return (await pressed.count()) ? pressed.getAttribute("data-value") : null;
  }
  return el.inputValue();
}

export async function saveRules(page: Page) {
  const btn = page.locator('[data-testid="save-rules"]').first();
  await btn.click();
  await expect(btn).toBeEnabled({ timeout: 15000 });
  await page.waitForTimeout(900);
}

/** Tambah dimensi lewat UI; `durationSeconds` opsional (untuk timer per bagian). */
export async function addDimensionUI(page: Page, code: string, name: string, durationSeconds?: number) {
  await openGroup(page, "dimensi");
  await page.locator('[data-testid="dim-add-code"]').fill(code);
  await page.locator('[data-testid="dim-add-name"]').fill(name);
  await page.locator('[data-testid="dim-add-submit"]').click();
  await expect(page.locator(`[data-testid="dim-row-${code}"]`)).toBeVisible({ timeout: 20000 });
  if (durationSeconds != null) {
    const dur = page.locator(`[data-testid="dim-duration-${code}"]`);
    await dur.fill(String(durationSeconds));
    await dur.blur();
    await page.waitForTimeout(1200);
  }
}

export interface QuestionForm {
  text: string;
  type?: "multiple_choice" | "likert" | "text_input";
  /** label opsi (>=2) untuk pilihan ganda / skala */
  options?: string[];
  /** skor manual per opsi (mode bobot bebas) */
  scores?: number[];
  preset?: "likert" | "emoji";
  evalType?: "exact_match" | "numeric_tolerance" | "keyword_match" | "pattern_match";
  answerKey?: string;
  tolerance?: string;
  presentation?: "standard_option_card" | "emoji_option" | "image_option" | "visual_comparison";
  dimensionIndex?: number;
  addOption?: string;
}

/** Tambah soal lewat panel "Tambah soal". */
export async function addQuestionUI(page: Page, form: QuestionForm) {
  await page.locator('[data-testid="q-add"]').click();
  await expect(page.locator('[data-testid="q-text"]')).toBeVisible({ timeout: 15000 });

  if (form.dimensionIndex != null) {
    const dimSel = page.locator('[data-testid="q-dimension"]');
    await dimSel.selectOption({ index: form.dimensionIndex });
  }
  await page.locator('[data-testid="q-text"]').fill(form.text);

  const type = form.type ?? "multiple_choice";
  await page.locator('[data-testid="q-type"]').selectOption(type);

  if (form.presentation) await page.locator('[data-testid="q-presentation"]').selectOption(form.presentation);

  if (type === "text_input") {
    if (form.evalType) await page.locator('[data-testid="q-eval-type"]').selectOption(form.evalType);
    if (form.answerKey) await page.locator('[data-testid="q-answer-key"]').fill(form.answerKey);
    if (form.tolerance) await page.locator('[data-testid="q-tolerance"]').fill(form.tolerance);
  } else if (form.preset) {
    await page.locator(`[data-testid="q-preset-${form.preset}"]`).click();
    await page.waitForTimeout(250);
  } else {
    for (const [i, label] of (form.options ?? []).entries()) {
      await page.locator(`[data-testid="q-option-label-${i}"]`).fill(label);
    }
    for (const [i, score] of (form.scores ?? []).entries()) {
      await page.locator(`[data-testid="q-option-score-${i}"]`).fill(String(score));
    }
  }

  if (form.addOption) {
    await page.getByRole("button", { name: /Tambah pilihan/i }).click();
    await page.locator(`[data-testid="q-option-label-${form.options?.length ?? 0}"]`).fill(form.addOption);
  }

  const save = page.locator('[data-testid="q-save"]');
  await expect(save, "tombol simpan soal harus aktif (form belum lengkap?)").toBeEnabled({ timeout: 10000 });
  await save.click();
  await expect(page.locator('[data-testid="q-text"]')).toBeHidden({ timeout: 20000 });
}

/** Jumlah soal dari header daftar soal. */
export async function questionCount(page: Page): Promise<number> {
  const t = await page.locator('span:has-text("Daftar soal")').first().innerText();
  return Number(t.match(/(\d+)\s*soal/)?.[1] ?? 0);
}

/** Daftar teks soal sesuai urutan tampil di panel. */
export async function questionTexts(page: Page): Promise<string[]> {
  return page.locator('[data-testid="question-row"]').evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? ""));
}

/* ── util yang dipakai hampir semua spec ── */

/** Fixture + cleanup berbasis prefix (aman untuk paralel: hapus per kode). */
export function makeCleanup() {
  const codes: string[] = [];
  return {
    codes,
    track(code: string) {
      codes.push(code);
      return code;
    },
  };
}

/** Ubah config versi langsung lewat RPC admin (untuk menyiapkan fixture cepat). */
export async function rpcConfig(page: Page, versionId: string, config: Record<string, unknown>) {
  return adminRpc(page, "discoverAdmin/versions/configUpdate", { versionId, config });
}

/** Rilis versi lewat UI: tunggu tombol stabil → modal verifikasi → Aktifkan & Rilis. */
export async function publishVersionUI(page: Page, versionNumber: number) {
  const btn = page.locator(`[data-testid="version-publish-${versionNumber}"]`);
  await expect(btn).toBeVisible({ timeout: 20000 });
  await expect(btn).toBeEnabled({ timeout: 20000 });
  await page.waitForTimeout(400);
  await btn.click();
  await expect(page.getByText("Verifikasi sebelum rilis")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /Aktifkan & Rilis/i }).click();
  await page.waitForTimeout(3200);
}

/** Buat halaman admin siap pakai (untuk fixture di spec sisi siswa). */
export async function createAdminPage(browser: import("@playwright/test").Browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await loginAdmin(page);
  return page;
}
