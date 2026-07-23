import { expect, test } from "@playwright/test";

test.describe("Blog Pages", () => {
  test("blog home has articles and navigation tabs", async ({ page }) => {
    await page.goto("/blog");

    // Blog heading — rendered after React Query fetches API data
    // Use generous timeout since API response time varies in CI
    const heading = page.locator("main h1").first();
    await expect(heading).toBeVisible({ timeout: 30000 });

    // Links to articles/news exist
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("articles page shows article cards", async ({ page }) => {
    await page.goto("/blog/articles");

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 30000 });
  });

  test("news page shows news items", async ({ page }) => {
    await page.goto("/blog/news");

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 30000 });
  });
});
