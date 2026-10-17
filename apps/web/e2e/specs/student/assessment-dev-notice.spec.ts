// E2E STUDENT — notice "Tes Minat & Bakat masih dalam pengembangan":
// setelah diklik "Mengerti", tidak boleh muncul lagi (dismiss disimpan).
import { expect, test } from "@playwright/test";
import { completeStudentProfile, createStudent, dismissCookie, preAcceptCookies } from "../../helpers/auth";
import { closeDb } from "../../helpers/db";

test.describe("Siswa · notice development", () => {
  test.afterAll(async () => {
    await closeDb();
  });

  test("klik 'Mengerti' → notice tidak muncul lagi setelah reload", async ({ page }) => {
    test.setTimeout(180000);
    await preAcceptCookies(page);
    // lewati tur onboarding siswa (react-joyride) — overlay-nya menutupi seluruh layar
    await page.addInitScript(() => {
      try {
        localStorage.setItem("mulaiplus-student-onboarding-done", "true");
      } catch {
        /* abaikan */
      }
    });
    const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await createStudent(page, tag);

    await page.goto("/dashboard/student/assessment");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2500);
    await dismissCookie(page);
    await completeStudentProfile(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const notice = page.getByText(/Tes Minat & Bakat masih dalam pengembangan/i);
    await expect(notice).toBeVisible({ timeout: 20000 });

    // tombol "Mengerti" harus MENYIMPAN dismiss (bukan sekadar menutup dialog)
    await page.getByRole("button", { name: /^Mengerti$/ }).click();
    await expect(notice).toBeHidden({ timeout: 15000 });

    const stored = await page.evaluate(() => ({
      ls: localStorage.getItem("mulai-dev-info-v1"),
      cookie: document.cookie.includes("mulai-dev-info=1"),
    }));
    expect(stored.ls === "1" || stored.cookie, "dismiss harus tersimpan (localStorage/cookie)").toBe(true);

    // reload → tidak muncul lagi
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page.getByText(/Tes Minat & Bakat masih dalam pengembangan/i)).toHaveCount(0);
  });
});
