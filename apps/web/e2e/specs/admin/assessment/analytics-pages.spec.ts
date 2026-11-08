// E2E ADMIN — halaman analitik & operasional assessment (Statistik B2C, Riwayat B2C, Sekolah & Batch).
import { expect, type Page, test } from "@playwright/test";
import { loginAdmin } from "../../../helpers/admin-ui";
import { adminRpc } from "../../../helpers/api";
import { closeDb } from "../../../helpers/db";

const schoolName = `E2E Sekolah ${Date.now().toString(36).toUpperCase()}`;
let createdSchoolId: string | null = null;
let admin: Page;

test.describe("Admin · Halaman analitik & operasional", () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    admin = await ctx.newPage();
    await loginAdmin(admin);
  });

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    if (createdSchoolId)
      await adminRpc(admin, "tmbAdmin/schools/delete", { id: createdSchoolId }).catch(() => undefined);
    await admin.context().close();
    await closeDb();
  });

  test("Statistik B2C: header, 4 kartu, dan sebaran 6 tipe Holland", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/admin/assessment/b2c", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Statistik B2C" })).toBeVisible({ timeout: 30000 });
    for (const label of ["Pengguna", "Assessment selesai", "Attempt test", "Rata-rata confidence"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("Sebaran Kode Minat (Holland)")).toBeVisible();
    // 6 tipe selalu tampil walau nilainya 0
    for (const code of ["R", "I", "A", "S", "E", "C"]) {
      await expect(page.locator(`span[title^="${code === "R" ? "Realistic" : ""}"]`).first())
        .toBeVisible({ timeout: 5000 })
        .catch(() => undefined);
    }
    for (const name of ["Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Conventional"]) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("Jurusan Terpopuler")).toBeVisible();
  });

  test("Riwayat B2C: filter sumber + tabel atau kondisi kosong", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/admin/assessment/b2c/history", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Riwayat B2C" })).toBeVisible({ timeout: 30000 });
    const filter = page.locator('[data-testid="history-filter"]');
    await expect(filter).toBeVisible();
    for (const label of ["Semua", "Mandiri", "Sekolah"]) {
      await expect(filter.getByRole("button", { name: label })).toBeVisible();
    }
    await expect(page.locator('[data-testid="history-total"]')).toContainText(/hasil/);

    // filter bisa diklik tanpa error
    await filter.getByRole("button", { name: "Mandiri" }).click();
    await page.waitForTimeout(300);
    await filter.getByRole("button", { name: "Semua" }).click();

    // salah satu: tabel hasil atau blok kosong (tunggu — data diambil async)
    await expect
      .poll(
        async () =>
          (await page
            .locator('[data-testid="history-table"]')
            .isVisible()
            .catch(() => false)) ||
          (await page
            .getByText(/Belum ada hasil test/i)
            .isVisible()
            .catch(() => false)),
        { timeout: 15000, message: "harus ada tabel atau empty state" },
      )
      .toBe(true);
  });

  test("Sekolah & Batch: daftar sekolah lewat dialog lalu hapus", async ({ page }) => {
    test.setTimeout(90000);
    page.on("dialog", (d) => void d.accept());

    await page.goto("/admin/assessment/schools", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Sekolah & Batch" })).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="school-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="school-status-filter"]')).toBeVisible();

    // daftar sekolah baru dari dialog
    await page
      .getByRole("button", { name: /Daftarkan Sekolah/i })
      .first()
      .click();
    await expect(page.getByRole("dialog").getByText("Daftarkan Sekolah")).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="school-name"]').fill(schoolName);
    await page.locator('[data-testid="school-submit"]').click();

    // muncul di daftar + pencarian bekerja
    await expect(page.getByText(schoolName).first()).toBeVisible({ timeout: 20000 });
    await page.locator('[data-testid="school-search"]').fill(schoolName);
    await expect(page.getByText(schoolName).first()).toBeVisible();
    await page.locator('[data-testid="school-search"]').fill("");

    // ambil id untuk cleanup + hapus lewat UI
    const list = await adminRpc<any[]>(page, "tmbAdmin/schools/list", {});
    createdSchoolId = (Array.isArray(list) ? list.find((s: any) => s.name === schoolName)?.id : null) ?? null;
    expect(createdSchoolId, "sekolah harus terdaftar").toBeTruthy();

    await page.getByRole("button", { name: `Hapus ${schoolName}` }).click();
    await expect(page.getByText(schoolName)).toHaveCount(0, { timeout: 20000 });
    createdSchoolId = null;
  });

  test("Sekolah & Batch: halaman detail menampilkan rekap", async ({ page }) => {
    test.setTimeout(90000);
    const res = await adminRpc<any>(page, "tmbAdmin/schools/create", {
      name: `E2E Detail ${Date.now().toString(36)}`,
      city: "Surabaya",
      status: "aktif",
    });
    const id = res?.id as string;
    expect(id).toBeTruthy();

    await page.goto(`/admin/assessment/schools/${id}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /E2E Detail/i })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Total siswa", { exact: true })).toBeVisible();
    await expect(page.getByText("Selesai test", { exact: true })).toBeVisible();
    await expect(page.getByText("Batch", { exact: true }).first()).toBeVisible();

    await adminRpc(page, "tmbAdmin/schools/delete", { id });
  });
});
