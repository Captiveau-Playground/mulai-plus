// @ts-nocheck — Playwright types conflict with Next.js build
import { defineConfig } from "@playwright/test";

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 6 : 2,
  reporter: [["list"], ...(CI ? [["github"]] : [])],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001",
    screenshot: "only-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...require("@playwright/test").devices["Desktop Chrome"],
        launchOptions: CI ? { args: ["--no-sandbox"] } : {},
      },
    },
  ],
  webServer: {
    command: "bun run dev",
    port: 3001,
    reuseExistingServer: !CI,
    timeout: 15000,
  },
});
