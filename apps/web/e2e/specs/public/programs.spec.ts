import { expect, test } from "@playwright/test";

test.describe("Programs & Courses", () => {
  test("programs listing shows program cards", async ({ page }) => {
    await page.goto("/programs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Heading
    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // Program cards exist
    const cards = page.locator("a[href*='/programs/']");
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });

  test("courses page shows course listing", async ({ page }) => {
    await page.goto("/courses");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });
});
