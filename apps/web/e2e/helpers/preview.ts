// Helper untuk halaman preview engine siswa (mode admin)?
//   /assessment/talent?preview=1&code=<CODE>&v=<versionId>
// Tidak butuh login dan tidak menulis data ke akun siswa.
import { expect, type Page } from "@playwright/test";

export function previewUrl(code: string, versionId: string) {
  return `/assessment/talent?preview=1&code=${code}&v=${versionId}`;
}

/** Buka preview & tutup dialog cookie (dialog menutupi tombol). */
export async function openPreview(page: Page, code: string, versionId: string) {
  await page.goto(previewUrl(code, versionId), { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Mulai Sekarang|Start now/ })).toBeVisible({ timeout: 30000 });
  const dlg = page.getByRole("dialog", { name: "Persetujuan cookie" });
  await dlg.waitFor({ state: "visible", timeout: 2500 }).catch(() => undefined);
  if (await dlg.isVisible().catch(() => false)) {
    await dlg
      .getByRole("button", { name: /Ya, saya setuju|Setuju|Terima/i })
      .first()
      .click({ timeout: 5000 })
      .catch(() => undefined);
    await dlg.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
  }
}

/** Mulai tes dan lewati layar instruksi bagian pertama (kalau muncul). */
export async function startRun(page: Page) {
  await page.getByRole("button", { name: /Mulai Sekarang|Start now/ }).click();
  const begin = page.getByRole("button", { name: /Mulai Bagian Ini/ });
  await begin.waitFor({ state: "visible", timeout: 20000 }).catch(() => undefined);
  if (await begin.isVisible()) await begin.click();
}

/** Input jawaban isian (tombol kirim dipilih lewat DOM, bukan labelnya). */
export function textAnswerInput(page: Page) {
  return page.locator('input[placeholder^="Tulis jawaban"]').first();
}
export function sendButton(page: Page) {
  return textAnswerInput(page).locator("xpath=following-sibling::button");
}

/** Tombol opsi untuk skala/likert (label angka 1–5 di dalam tombol). */
export function likertButtons(page: Page) {
  return page.locator("button").filter({
    has: page.locator('span:text-is("1"), span:text-is("2"), span:text-is("3"), span:text-is("4"), span:text-is("5")'),
  });
}

/** Teks progres di bar atas panel soal ("N/total"). */
export async function progressText(page: Page): Promise<string> {
  const lines = (await page.locator("main").innerText()).split("\n");
  return lines.find((l) => /^\d+\/\d+$/.test(l.trim()))?.trim() ?? "";
}
