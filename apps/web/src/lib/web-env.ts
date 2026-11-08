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
  const url = env.NEXT_PUBLIC_SERVER_URL;
  if (url === "http://localhost:3000" || url.includes("localhost")) return "development";
  if (url.includes("staging")) return "staging";
  return "production";
}

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
