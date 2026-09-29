// @ts-nocheck
import { defineConfig } from "@playwright/test";

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 3 : 2,
  reporter: [["list"], ...(CI ? [["github"]] : [])],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001",
    screenshot: "only-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
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
    command: CI ? "node node_modules/.bin/next start --port 3001" : "bun run dev",
    port: 3001,
    reuseExistingServer: !CI,
    timeout: CI ? 60000 : 15000,
    cwd: CI ? process.cwd() : undefined,
  },
});
