// E2E SISWA (mobile) — Temuan 20 Okt #1:
//  · maskot & teks soal harus SATU BARIS (bukan 2 baris)
//  · area opsi TIDAK boleh melewati batas viewport (dulu 696px di layar 667px)
import { expect, type Page, test } from "@playwright/test";
import { loginAdmin } from "../../helpers/admin-ui";
import { rpc } from "../../helpers/api";

test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });

async function masukSoal(page: Page, code: string) {
  const cfg = await rpc<{ version: { id: string } }>("discover/config", { code });
  await page.goto(`/dashboard/student/assessment/take/${code}?preview=1&v=${(cfg as any).version.id}`, {
    waitUntil: "domcontentloaded",
  });
  const cta = page.getByRole("button", { name: /Mulai Tes|Mulai$/i }).first();
  await cta.scrollIntoViewIfNeeded().catch(() => undefined);
  await cta.click({ force: true, timeout: 30000 });
  const tut = page.getByRole("button", { name: /Paham, Mulai|Mulai Simulasi/i }).first();
  await tut.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
  if (await tut.isVisible()) await tut.click({ force: true });
  await page.waitForTimeout(600);
  const begin = page.getByRole("button", { name: /Mulai bagian/i }).first();
  await begin.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
  if (await begin.isVisible()) {
    await begin.click({ force: true });
    await page.waitForTimeout(600);
  }
  await expect(page.getByTestId("question-text")).toBeVisible({ timeout: 20000 });
}

test.describe("Siswa · layout mobile (maskot 1 baris & opsi tidak terpotong)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test("DISCOVER: maskot & soal satu baris, area opsi di dalam viewport", async ({ page }) => {
    test.setTimeout(240000);
    await masukSoal(page, "DISCOVER");

    const mascot = await page.getByAltText("Maskot bertanya").boundingBox();
    const soal = await page.getByTestId("question-text").boundingBox();
    expect(mascot, "maskot harus ada").toBeTruthy();
    expect(soal, "teks soal harus ada").toBeTruthy();
    // SATU BARIS: band vertikal keduanya beririsan & maskot di kiri soal
    const overlap = Math.min(mascot!.y + mascot!.height, soal!.y + soal!.height) - Math.max(mascot!.y, soal!.y);
    expect(overlap, "maskot & soal harus sebaris (band vertikal beririsan)").toBeGreaterThan(10);
    expect(mascot!.x + mascot!.width, "maskot di kiri soal").toBeLessThanOrEqual(soal!.x + 4);

    // area opsi tidak boleh melewati viewport (dulu 696px di layar 667px)
    const area = await page.getByTestId("options-area").boundingBox();
    expect(area, "area opsi harus ada").toBeTruthy();
    expect(area!.y + area!.height).toBeLessThanOrEqual(667 + 1);

    // opsi terakhir bisa dipilih
    const opts = page.locator('[data-testid="options-area"] button');
    await expect(opts).toHaveCount(5);
    await opts.last().scrollIntoViewIfNeeded();
    await expect(opts.last()).toBeInViewport({ ratio: 0.9 });
  });
});
