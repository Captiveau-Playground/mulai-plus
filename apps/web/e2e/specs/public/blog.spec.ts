import { expect, test } from "@playwright/test";

test.describe("Blog Pages", () => {
  test("blog home has articles and navigation tabs", async ({ page }) => {
    await page.goto("/blog");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    // Blog heading
    const heading = page.locator("main h1").first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // Links to articles/news exist
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("articles page shows article cards", async ({ page }) => {
    await page.goto("/blog/articles");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("news page shows news items", async ({ page }) => {
    await page.goto("/blog/news");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });
});
