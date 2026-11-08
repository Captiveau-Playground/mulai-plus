// E2E — jangan pernah mengirim data lokal/staging ke properti analytics PRODUKSI.
//
// Latar: build bisa memakai .env.production (mis. `next build` biasa), dan provider
// dulu memuat GA/Clarity/Amplitude tanpa cek hostname — sehingga aktivitas lokal &
// staging tercatat di GA4/Clarity produksi. Test ini menjaga agar tidak terulang.
import { expect, test } from "@playwright/test";

const BLOCKED_HOSTS = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$|\.local$/;

test.describe("Analytics · tidak bocor ke produksi dari lokal", () => {
  for (const path of ["/", "/programs", "/login"]) {
    test(`${path}: tidak ada script/global GA, Clarity, atau Amplitude`, async ({ page }) => {
      test.setTimeout(120000);
      const requests: string[] = [];
      page.on("request", (r) => requests.push(r.url()));

      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3500);

      // sanity: test memang jalan di host lokal
      expect(BLOCKED_HOSTS.test(new URL(page.url()).hostname), `host: ${page.url()}`).toBe(true);

      // tidak ada permintaan ke domain analytics
      const leaked = requests.filter((u) =>
        /googletagmanager\.com|google-analytics\.com|clarity\.ms|amplitude\.com/.test(u),
      );
      expect(leaked, `permintaan analytics dari ${path}: ${leaked.join(", ")}`).toEqual([]);

      // tidak ada script tag analytics
      const scripts = await page
        .locator('script[src*="googletagmanager"], script[src*="clarity"], script[src*="amplitude"]')
        .count();
      expect(scripts).toBe(0);

      // tidak ada global analytics
      const globals = await page.evaluate(() => ({
        gtag: typeof (window as any).gtag,
        dataLayer: Array.isArray((window as any).dataLayer) ? (window as any).dataLayer.length : 0,
        clarity: typeof (window as any).clarity,
        amplitude: typeof (window as any).amplitude,
      }));
      expect(globals.gtag).toBe("undefined");
      expect(globals.clarity).toBe("undefined");
      expect(globals.amplitude).toBe("undefined");
      // dataLayer boleh ada (Consent Mode) tapi tidak boleh terisi event GA
      expect(globals.dataLayer).toBeLessThanOrEqual(1);
    });
  }

  test("build e2e tidak membawa measurement ID produksi", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const html = await page.content();
    // G-BC14H4D60V = properti produksi
    expect(html).not.toContain("G-BC14H4D60V");
    expect(html).not.toContain("G-FSFJ2G8W3R");
  });
});
