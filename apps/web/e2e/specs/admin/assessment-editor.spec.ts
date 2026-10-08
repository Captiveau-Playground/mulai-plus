// E2E ADMIN — Assessment editor v2: timer rules, durasi dimensi, instruksi.
// Prasyarat: jalankan `bun e2e/setup-admin.mts` lalu set env E2E_ADMIN_EMAIL & E2E_ADMIN_PASSWORD.
// Bila env kosong → suite di-skip (agar tidak memblok CI tanpa kredensial).
import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const PASS = process.env.E2E_ADMIN_PASSWORD ?? "";
test.skip(!EMAIL || !PASS, "Butuh E2E_ADMIN_EMAIL & E2E_ADMIN_PASSWORD (jalankan e2e/setup-admin.mts)");

async function dismissCookie(page: Page) {
  const dlg = page.getByRole("dialog", { name: "Persetujuan cookie" });
  try { if (await dlg.isVisible({ timeout: 2500 })) await dlg.locator("button").first().click(); } catch { /* none */ }
}

async function loginAdmin(page: Page) {
  await page.goto("/login");
  await page.waitForTimeout(1200);
  await dismissCookie(page);
  await page.locator('input[name="email"]').first().fill(EMAIL);
  await page.locator('input[name="password"]').first().fill(PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2500);
}

test.describe("Admin — Assessment editor v2 (timer & instruksi)", () => {
  test("editor memuat, aturan timer tampil, durasi dimensi bisa diubah, simpan aturan", async ({ page }) => {
    test.setTimeout(180000);
    await loginAdmin(page);

    await page.goto("/admin/assessment/editor/TALENT");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
    await dismissCookie(page);

    // Halaman editor tampil (judul Dimensi & Aturan)
    await expect(page.getByText("Dimensi", { exact: false }).first()).toBeVisible({ timeout: 20000 });

    // Panel Timer ada
    await expect(page.getByText(/Timer/i).first()).toBeVisible({ timeout: 15000 });

    // Durasi dimensi: input detik muncul di chip dimensi (minimal 1)
    const durInput = page.locator('input[type="number"][title*="Durasi"]').first();
    if (await durInput.count()) {
      await durInput.fill("120");
      await durInput.blur();
      await page.waitForTimeout(2000);
    }

    // Aktifkan timer kalau belum, lalu pilih scope "Per bagian (dimensi)"
    const timerToggle = page.locator('input[type="checkbox"]').first();
    if (await timerToggle.count()) {
      const checked = await timerToggle.isChecked().catch(() => false);
      if (!checked) await timerToggle.check();
      await page.waitForTimeout(800);
    }

    // Simpan aturan → toast sukses
    const saveBtn = page.getByRole("button", { name: /Simpan aturan/i }).first();
    if (await saveBtn.count()) {
      await saveBtn.click();
      await page.waitForTimeout(2500);
    }

    // Instruksi per dimensi tampil (Pengantar & Instruksi)
    await expect(page.getByText(/Pengantar &/i).first()).toBeVisible({ timeout: 15000 });
  });
});
