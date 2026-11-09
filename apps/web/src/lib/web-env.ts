import { env } from "@mulai-plus/env/web";

export type WebEnv = "development" | "staging" | "production";

/**
 * Classify the runtime environment from NEXT_PUBLIC_SERVER_URL.
 *
 * Covers BOTH API domains (dual-run setup):
 * - VPS:     https://api-staging.mulaiplus.id
 * - Workers: https://api-staging-workers.mulaiplus.id
 * - Prod:    https://api-prod.mulaiplus.id / https://api-prod-workers.mulaiplus.id
 */
export function getWebEnv(): WebEnv {
  // Defensif: `NEXT_PUBLIC_SERVER_URL` di-inline saat build. Kalau kosong (build lokal tanpa
  // .env, atau secret CI belum terpasang) JANGAN sampai layout crash — dulu `url.includes`
  // melempar TypeError dan SEMUA halaman jadi 500.
  const url = String(env.NEXT_PUBLIC_SERVER_URL ?? "").toLowerCase();
  if (!url) return process.env.NODE_ENV === "production" ? "production" : "development";
  if (url.includes("localhost") || url.includes("127.0.0.1")) return "development";
  if (url.includes("staging")) return "staging";
  return "production";
}

/**
 * Base URL API untuk pemakaian di klien (tanpa trailing slash).
 * Fallback ke localhost HANYA bila env tidak ter-inline saat build — supaya URL tidak
 * menjadi "undefined/rpc" (dulu menyebabkan request gagal tanpa pesan jelas).
 */
export const SERVER_URL = (String(env.NEXT_PUBLIC_SERVER_URL ?? "").trim() || "http://localhost:3000").replace(
  /\/$/,
  "",
);

/** True when the web build is pointed at a staging API (VPS or Workers). */
export const isStaging = getWebEnv() === "staging";

/**
 * Release tag/version that was baked at build time (e.g. "v1.2.3-staging.1").
 * Diisi CI dari job `tag` (NEXT_PUBLIC_RELEASE_TAG). Kosong saat build lokal/manual.
 */
export const RELEASE_TAG = (env.NEXT_PUBLIC_RELEASE_TAG ?? "").trim();

/**
 * Versi aplikasi yang DITAMPILKAN di UI.
 * Urutan: tag rilis CI (mis. "v1.4.0-staging.2") → versi `package.json` (di-inline
 * next.config) → "dev" saat build lokal tanpa env. Jangan hardcode versi di komponen.
 */
export const APP_VERSION = (env.NEXT_PUBLIC_APP_VERSION ?? "").trim();

export const VERSION_LABEL =
  RELEASE_TAG || (APP_VERSION ? (APP_VERSION.startsWith("v") ? APP_VERSION : `v${APP_VERSION}`) : "dev");
