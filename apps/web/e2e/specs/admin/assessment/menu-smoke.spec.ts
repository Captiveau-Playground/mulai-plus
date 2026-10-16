// E2E ADMIN — smoke semua menu assessment (halaman terbuka, tidak ada error boundary).
import { expect, test } from "@playwright/test";
import { loginAdmin } from "../../../helpers/admin-ui";

test.describe("Admin · Semua menu assessment", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  const pages: [string, RegExp][] = [
    ["/admin/assessment", /Dashboard Assessment/i],
    ["/admin/assessment/editor", /Buat Tes|Belum ada tes|Memuat tes/i],
    ["/admin/assessment/questions", /Manajemen Soal/i],
    ["/admin/assessment/patterns", /Pola Jurusan/i],
    ["/admin/assessment/careers", /Mapping Karier/i],
    ["/admin/assessment/schools", /Sekolah Kerjasama/i],
    ["/admin/assessment/b2c", /B2C/i],
    ["/admin/assessment/b2c/history", /B2C/i],
  ];

  for (const [path, heading] of pages) {
    test(`menu ${path} terbuka tanpa error`, async ({ page }) => {
      test.setTimeout(90000);
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `status HTTP ${path}`).toBeLessThan(400);
      await expect(page.getByText(heading).first()).toBeVisible({ timeout: 30000 });
      await expect(page.getByText(/Application error|Unhandled Runtime Error/i)).toHaveCount(0);
      expect(page.url(), `${path} tidak boleh redirect ke login`).not.toContain("/login");
    });
  }

  test("sidebar menautkan ke seluruh submenu assessment", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/admin/assessment", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Dashboard Assessment").first()).toBeVisible({ timeout: 30000 });

    // grup "Analitik" terbuka otomatis karena path aktif
    for (const href of ["/admin/assessment/b2c", "/admin/assessment/b2c/history"]) {
      await expect(page.locator(`a[href="${href}"]`).first(), `link ${href}`).toBeVisible({ timeout: 10000 });
    }
    // grup "Operasional" perlu diklik dulu
    await page.getByText("Assessment — Operasional", { exact: false }).first().click();
    await page.waitForTimeout(500);
    for (const href of [
      "/admin/assessment/editor",
      "/admin/assessment/questions",
      "/admin/assessment/patterns",
      "/admin/assessment/careers",
      "/admin/assessment/schools",
    ]) {
      await expect(page.locator(`a[href="${href}"]`).first(), `link ${href}`).toBeVisible({ timeout: 10000 });
    }
  });
});
