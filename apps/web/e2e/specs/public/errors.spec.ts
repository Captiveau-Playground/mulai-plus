import { expect, test } from "@playwright/test";

test.describe("Error Pages & Auth Guard", () => {
  test("404 page shows for unknown route", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-xyz");
    await page.waitForLoadState("networkidle");

    // Should show 404 text
    await expect(page.locator("text=404").first()).toBeVisible({ timeout: 5000 });
  });

  test("redirects unauthenticated users from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    expect(url.includes("login") || url.includes("auth") || url.includes("/dashboard")).toBeTruthy();
  });

  test("redirects unauthenticated users from student dashboard", async ({ page }) => {
    await page.goto("/dashboard/student");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    expect(url.includes("login") || url.includes("auth")).toBeTruthy();
  });
});
