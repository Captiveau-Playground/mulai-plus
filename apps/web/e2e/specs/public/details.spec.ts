import { expect, test } from "@playwright/test";

test.describe("Legal & Misc Pages", () => {
  test("privacy policy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("terms of service page loads", async ({ page }) => {
    await page.goto("/terms");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("categories page loads", async ({ page }) => {
    await page.goto("/categories");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });
});
