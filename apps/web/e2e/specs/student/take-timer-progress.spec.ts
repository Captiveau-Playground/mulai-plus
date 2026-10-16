// E2E USER (UI) — timer, progres antar soal, checkpoint bagian, dan jeda di halaman siswa.
import { expect, type Page, test } from "@playwright/test";
import { buildSimpleAssessment, buildUiFixture } from "../../fixtures/assessment";
import { createAdminPage } from "../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { likertButtons, openPreview, progressText, startRun } from "../../helpers/preview";

const codes: string[] = [];
let admin: Page;

test.describe("Siswa (UI) · timer & progres", () => {
  test.beforeAll(async ({ browser }) => {
    admin = await createAdminPage(browser);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("timer aktif menampilkan countdown MM:SS yang berjalan", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(admin, {
      timer: { timer_enabled: true, timer_scope: "question", time_per_question: 120 },
    });
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await startRun(page);
    await expect(page.getByText("Kamu lebih suka bekerja dengan…")).toBeVisible({ timeout: 20000 });

    const header = page.locator("main");
    const readChip = async () => (await header.innerText()).match(/\d{2}:\d{2}/)?.[0];
    const before = await readChip();
    expect(before, "countdown MM:SS harus tampil").toBeTruthy();
    await expect.poll(readChip, { timeout: 20000 }).not.toBe(before);
  });

  test("tanpa timer: tidak ada countdown di layar soal", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(admin);
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await startRun(page);
    await expect(page.getByText("Kamu lebih suka bekerja dengan…")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("main")).not.toContainText(/\d{2}:\d{2}/);
  });

  test("berpindah ke soal berikutnya setelah menjawab", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(admin, { first: "mc" });
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await startRun(page);
    await expect(page.getByText("Kamu lebih suka bekerja dengan…")).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: /Data dan eksperimen/ }).click();

    // soal pertama harus hilang (bisa langsung soal berikutnya, bisa checkpoint antar bagian)
    await expect(page.getByText("Kamu lebih suka bekerja dengan…")).toBeHidden({ timeout: 20000 });
    const next = page.getByRole("button", { name: /^Lanjut ke/ });
    if (await next.isVisible().catch(() => false)) await next.click();

    // Mode by_dimension → soal berikutnya tetap di bagian yang sama (likert di dimensi 1),
    // TIDAK lagi melompat ke dimensi lain seperti perilaku CAT-lite sebelumnya.
    await expect(page.getByText("Seberapa nyaman kamu bekerja dalam tim?")).toBeVisible({ timeout: 20000 });
    await expect.poll(() => progressText(page), { timeout: 15000 }).toBe(`1/${fx.total}`);
  });

  test("menyelesaikan seluruh soal menampilkan hasil preview", async ({ page }) => {
    test.setTimeout(240000);
    const fx = await buildUiFixture(admin, { first: "mc" });
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await startRun(page);

    // jawab semua soal apa pun tipenya, lewati checkpoint antar bagian, sampai selesai
    for (let guard = 0; guard < 25; guard++) {
      if (
        await page
          .getByText("Preview selesai")
          .isVisible()
          .catch(() => false)
      )
        break;

      // layar instruksi bagian & checkpoint antar bagian sama-sama punya tombol lanjut
      const begin = page.getByRole("button", { name: /Mulai Bagian Ini/ });
      const next = page.getByRole("button", { name: /^Lanjut ke/ });
      const cont = (await next.isVisible().catch(() => false))
        ? next
        : (await begin.isVisible().catch(() => false))
          ? begin
          : null;
      if (cont) {
        await cont.click();
        await page.waitForTimeout(700);
        continue;
      }

      const input = page.locator('input[placeholder^="Tulis jawaban"]');
      const mc = page.getByRole("button", { name: /Data dan eksperimen|Ide kreatif dan visual/ }).first();
      const skala = likertButtons(page).first();

      if (await input.isVisible().catch(() => false)) {
        await input.fill("0.75");
        await input.press("Enter");
      } else if (await mc.isVisible().catch(() => false)) {
        await mc.click();
      } else if (await skala.isVisible().catch(() => false)) {
        await skala.click();
      }
      await page.waitForTimeout(900);
    }

    await expect(async () => {
      const body = await page.locator("main").innerText();
      expect(body, `isi layar: ${body.replace(/\n+/g, " | ").slice(0, 300)}`).toContain("Preview selesai");
    }).toPass({ timeout: 30000 });
    await expect(page.getByText("Talent Profile")).toBeVisible();
  });

  test("allow_pause=false → tombol jeda tidak tampil di layar siswa", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildSimpleAssessment(admin, {
      name: "NoPause UI",
      questionCount: 2,
      config: { allow_pause: false },
    });
    codes.push(fx.code);

    await openPreview(page, fx.code, fx.versionId);
    await startRun(page);
    await expect(page.getByText("Soal 1")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: /Berhenti & lanjutkan nanti/ })).toHaveCount(0);
  });
});
