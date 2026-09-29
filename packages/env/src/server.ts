import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

function createStrictEnv() {
  return createEnv({
    server: {
      DATABASE_URL: z.string().min(1),
      BETTER_AUTH_SECRET: z.string().min(32),
      BETTER_AUTH_URL: z.url(),
      CORS_ORIGIN: z.url(),
      NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      APP_URL: z.string().url().default("https://mulaiplus.id"),
      PAYMENT_API_URL: z.string().min(1),
      PAYMENT_API_KEY: z.string().min(1),
      UNOSEND_API_KEY: z.string().min(1).optional(),
      UNOSEND_FROM_EMAIL: z.string().email().optional(),
      RESEND_API_KEY: z.string().min(1).optional(),
      RESEND_FROM_EMAIL: z.string().email().optional(),
      GOOGLE_CLIENT_ID: z.string().min(1),
      GOOGLE_CLIENT_SECRET: z.string().min(1),
      PORT: z.coerce.number().default(3000),
      // Cloudflare R2
      R2_ACCOUNT_ID: z.string().min(1),
      R2_ACCESS_KEY_ID: z.string().min(1),
      R2_SECRET_ACCESS_KEY: z.string().min(1),
      R2_BUCKET_NAME: z.string().min(1),
      R2_PUBLIC_URL: z.string().min(1),
      // AI Service
      AI_SERVICE_URL: z.string().url().optional(),
      // Origin web yang dipercaya meneruskan x-user-id (csv, opsional)
      WEB_ORIGINS: z.string().optional(),
      AI_API_KEY: z.string().optional(),
      // Hermes Agent API Key
      HERMES_API_KEY: z.string().min(16).optional(),
      // Cookie domain untuk session (subdomain sharing)
      COOKIE_DOMAIN: z.string().optional(),
      // E-Sign
      ESIGN_SECRET: z.string().min(16).default("mulai-plus-esign-secret-change-in-production"),
      // Discord webhook (notifikasi event penting). Kosong → tidak ada notif.
      DISCORD_WEBHOOK_URL: z.string().url().optional(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
  });
}

type StrictServerEnv = ReturnType<typeof createStrictEnv>;

function buildServerEnv(): StrictServerEnv {
  try {
    return createStrictEnv();
  } catch (err) {
    // Cloudflare preflight/bundling & CI hanya menyuntikkan VARS (bukan SECRETS) ke
    // process.env → validasi ketat pasti gagal. Jangan crash saat import; di runtime
    // secrets & vars lengkap. Zod validasi bisnis tetap berjalan di tempat pemakaian.
    console.warn("[env] schema validation skipped (partial env):", (err as Error).message?.split("\n")[0] ?? err);
    return createEnv({
      server: {
        DATABASE_URL: z.string().min(1),
        BETTER_AUTH_SECRET: z.string().min(32).optional(),
        BETTER_AUTH_URL: z.string().url().optional(),
        CORS_ORIGIN: z.string().url().optional(),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
        APP_URL: z.string().url().default("https://mulaiplus.id"),
        PAYMENT_API_URL: z.string().min(1).optional(),
        PAYMENT_API_KEY: z.string().min(1).optional(),
        UNOSEND_API_KEY: z.string().min(1).optional(),
        UNOSEND_FROM_EMAIL: z.string().email().optional(),
        RESEND_API_KEY: z.string().min(1).optional(),
        RESEND_FROM_EMAIL: z.string().email().optional(),
        GOOGLE_CLIENT_ID: z.string().min(1).optional(),
        GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
        PORT: z.coerce.number().default(3000),
        R2_ACCOUNT_ID: z.string().min(1).optional(),
        R2_ACCESS_KEY_ID: z.string().min(1).optional(),
        R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
        R2_BUCKET_NAME: z.string().min(1).optional(),
        R2_PUBLIC_URL: z.string().min(1).optional(),
        AI_SERVICE_URL: z.string().url().optional(),
        WEB_ORIGINS: z.string().optional(),
        AI_API_KEY: z.string().optional(),
        HERMES_API_KEY: z.string().min(16).optional(),
        COOKIE_DOMAIN: z.string().optional(),
        ESIGN_SECRET: z.string().min(16).default("mulai-plus-esign-secret-change-in-production"),
        DISCORD_WEBHOOK_URL: z.string().url().optional(),
      },
      runtimeEnv: process.env,
      emptyStringAsUndefined: true,
      skipValidation: true,
    }) as StrictServerEnv;
  }
}

export const env = buildServerEnv();

// R2 Config helper for server-side use
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

export function getR2Config(): R2Config {
  // Runtime (worker/local): secrets & vars lengkap — fallback hanya utk preflight.
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    publicUrl: env.R2_PUBLIC_URL,
  };
}
