import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page displays auth form", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Should show either a form or redirect
    const emailField = page.locator('input[type="email"]').first();
    const socialButton = page.getByText(/google/i).first();
    const formField = emailField.or(socialButton);
    await expect(formField).toBeVisible({ timeout: 5000 });
  });
});
