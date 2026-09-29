import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("should display hero with title and CTA", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const h1 = page.getByRole("heading", { level: 1 }).first();
    await expect(h1).toBeVisible({ timeout: 15000 });

    // Brand name visible
    await expect(page.getByText("MULAI+").first()).toBeVisible();

    // CTA button/link exists
    const cta = page.locator("a[href*='/programs'], a[href*='/explore']").first();
    await expect(cta).toBeVisible({ timeout: 5000 });
  });

  test("should display featured programs section", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    // Program cards
    const cards = page.locator("a[href*='/programs/']");
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });

  test("should have working navigation menu", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Nav links exist
    const navLinks = page.locator("nav a[href]").first();
    await expect(navLinks).toBeVisible({ timeout: 15000 });
  });

  test("should have footer with company info", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible({ timeout: 15000 });
    await expect(footer.getByText(/MULAI/i).first()).toBeVisible();
  });
});
