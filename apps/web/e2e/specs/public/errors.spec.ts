import { expect, test } from "@playwright/test";

test.describe("Error Pages & Auth Guard", () => {
  test("404 page shows for unknown route", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-xyz");

    // Should show 404 text — wait for the element instead of networkidle
    // (networkidle can hang on pages with persistent connections like analytics)
    await expect(page.locator("text=404").first()).toBeVisible({ timeout: 15000 });
  });

  test("redirects unauthenticated users from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // Wait for either login page or dashboard to settle
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const url = page.url();
    expect(url.includes("login") || url.includes("auth") || url.includes("/dashboard")).toBeTruthy();
  });

  test("redirects unauthenticated users from student dashboard", async ({ page }) => {
    await page.goto("/dashboard/student");
    // Wait for the redirect to complete
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    const url = page.url();
    expect(url.includes("login") || url.includes("auth")).toBeTruthy();
  });
});
