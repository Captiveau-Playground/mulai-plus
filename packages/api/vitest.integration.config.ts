import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/__tests__/integration/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5433/mulai_plus_test",
      BETTER_AUTH_SECRET: "test-secret-thirty-two-characters-long!",
      BETTER_AUTH_URL: "http://localhost:3000",
      CORS_ORIGIN: "http://localhost:3000",
      GOOGLE_CLIENT_ID: "test",
      GOOGLE_CLIENT_SECRET: "test",
      R2_ACCOUNT_ID: "test",
      R2_ACCESS_KEY_ID: "test",
      R2_SECRET_ACCESS_KEY: "test",
      R2_BUCKET_NAME: "test",
      R2_PUBLIC_URL: "http://test.com",
      APP_URL: "http://localhost:3000",
      ESIGN_SECRET: "test-secret-key-for-unit-testing",
      PAYMENT_API_URL: "http://test.com",
      PAYMENT_API_KEY: "test",
      UNOSEND_API_KEY: "test",
      UNOSEND_FROM_EMAIL: "test@test.com",
    },
  },
  resolve: {
    conditions: ["bun", "node", "import"],
  },
});
