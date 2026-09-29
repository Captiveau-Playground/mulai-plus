import { expect, test } from "@playwright/test";

test.describe("Explore Pages", () => {
  test("explore main page has navigation cards", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForLoadState("load");

    // Cards / links t1o sub-pages
    const links = page.locator("a[href*='/explore/']");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Has heading
    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("universities page loads with content", async ({ page }) => {
    await page.goto("/explore/universities");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("study programs page loads", async ({ page }) => {
    await page.goto("/explore/study-programs");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("passing grade page loads", async ({ page }) => {
    await page.goto("/explore/passing-grade");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("compare page loads", async ({ page }) => {
    await page.goto("/explore/compare");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });
});
