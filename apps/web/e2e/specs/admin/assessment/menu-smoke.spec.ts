// E2E ADMIN — smoke semua menu assessment (halaman terbuka, tidak ada error boundary).
import { expect, test } from "@playwright/test";
import { loginAdmin } from "../../../helpers/admin-ui";

// Kanonik: satu daftar untuk sidebar & kartu dashboard — dipakai untuk memastikan keduanya
// tidak pernah berbeda lagi.
const MENU: [string, string][] = [
  ["/admin/assessment", "Dashboard"],
  ["/admin/assessment/editor", "Editor Soal & Versi"],
  ["/admin/assessment/questions", "Konten Legacy"],
  ["/admin/assessment/patterns", "Pola Jurusan"],
  ["/admin/assessment/careers", "Mapping Karier"],
  ["/admin/assessment/schools", "Sekolah & Batch"],
  ["/admin/assessment/b2c", "Statistik B2C"],
  ["/admin/assessment/b2c/history", "Riwayat B2C"],
];

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
    ["/admin/assessment/schools", /Sekolah & Batch/i],
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

  test("sidebar punya SATU parent Assessment dengan seluruh submenu", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/admin/assessment", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Dashboard Assessment").first()).toBeVisible({ timeout: 30000 });

    // tidak ada lagi dua parent terpisah (Operasional / Analitik)
    await expect(page.getByText("Assessment — Operasional")).toHaveCount(0);
    await expect(page.getByText("Assessment — Analitik")).toHaveCount(0);

    // grup aktif otomatis terbuka → semua submenu langsung terlihat
    for (const [href] of MENU) {
      await expect(page.locator(`a[href="${href}"]`).first(), `link ${href}`).toBeVisible({ timeout: 10000 });
    }
  });

  test("kartu di dashboard sejajar dengan menu sidebar (href & label)", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/admin/assessment", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Menu Assessment")).toBeVisible({ timeout: 30000 });

    // semua tujuan menu punya kartu (kecuali Dashboard itu sendiri)
    for (const [href, label] of MENU.filter(([h]) => h !== "/admin/assessment")) {
      const card = page.locator(`a[href="${href}"]`).first();
      await expect(card, `kartu ${href}`).toBeVisible({ timeout: 10000 });
      await expect(card, `label kartu ${href}`).toContainText(label);
    }
  });

  test("highlight sidebar hanya pada submenu paling spesifik", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/admin/assessment/editor", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Buat Tes|Belum ada tes|Memuat tes/i).first()).toBeVisible({ timeout: 30000 });

    const editorLink = page.locator('a[href="/admin/assessment/editor"]').first();
    const dashboardLink = page.locator('a[href="/admin/assessment"]').first();
    await expect(editorLink).toHaveAttribute("data-active", "", { timeout: 15000 });
    await expect(dashboardLink).not.toHaveAttribute("data-active", "");
  });
});
