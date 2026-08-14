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
