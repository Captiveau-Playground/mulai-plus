import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    exclude: ["src/__tests__/integration/**/*.test.ts"],
    globalSetup: [],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5432/mulai_plus",
      BETTER_AUTH_SECRET: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      BETTER_AUTH_URL: "http://localhost:3000",
      CORS_ORIGIN: "http://localhost:3000",
      GOOGLE_CLIENT_ID: "test",
      GOOGLE_CLIENT_SECRET: "test",
      R2_ACCOUNT_ID: "test",
      R2_ACCESS_KEY_ID: "test",
      R2_SECRET_ACCESS_KEY: "test",
      R2_BUCKET_NAME: "test",
      R2_PUBLIC_URL: "http://test.com",
      PAYMENT_API_URL: "http://test.com",
      PAYMENT_API_KEY: "test",
      UNOSEND_API_KEY: "test",
      UNOSEND_FROM_EMAIL: "test@test.com",
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "test@test.com",
      APP_URL: "http://localhost:3000",
      ESIGN_SECRET: "test-secret-key-for-unit-testing",
    },
  },
  resolve: {
    conditions: ["bun", "node", "import"],
  },
});
