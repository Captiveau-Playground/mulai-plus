import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page displays auth form", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check form elements exist (email input OR Google button)
    const emailField = page.locator('input[name="email"]').first();
    await expect(emailField).toBeVisible({ timeout: 5000 });
    await expect(formField).toBeVisible({ timeout: 5000 });
  });
});
