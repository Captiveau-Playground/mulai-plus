/**
 * UTM link management for MULAI+.
 *
 * Usage:
 *   buildUtmUrl("/programs", { source: "instagram", medium: "social", campaign: "bio" })
 *   // → /programs?utm_source=instagram&utm_medium=social&utm_campaign=bio
 *
 * To track a custom event when a user arrives via a specific UTM:
 *   trackUtmVisit() // call in useEffect on landing page
 */

export type UTMParams = {
  source: string; // utm_source — e.g. instagram, linkedin, tiktok
  medium: string; // utm_medium — e.g. social, email, paid
  campaign?: string; // utm_campaign — e.g. bio, mentorship-scholarship
  term?: string; // utm_term — e.g. keyword
  content?: string; // utm_content — e.g. hero-banner, footer-cta
};

/**
 * Default UTM configs for known channels.
 * Update these whenever you change a social bio link.
 */
export const UTM_SOURCES = {
  instagram: {
    source: "instagram",
    medium: "social",
    campaign: "bio",
  },
  linkedin: {
    source: "linkedin",
    medium: "social",
    campaign: "bio",
  },
  youtube: {
    source: "youtube",
    medium: "social",
    campaign: "bio",
  },
  tiktok: {
    source: "tiktok",
    medium: "social",
    campaign: "bio",
  },
  twitter: {
    source: "twitter",
    medium: "social",
    campaign: "bio",
  },
  whatsapp: {
    source: "whatsapp",
    medium: "social",
    campaign: "share",
  },
  email: {
    source: "email",
    medium: "email",
    campaign: "newsletter",
  },
  google_ads: {
    source: "google",
    medium: "cpc",
    campaign: "google-ads",
  },
} as const;

/**
 * Build a URL with UTM parameters.
 *
 * @example
 *   buildUtmUrl("/programs", UTM_SOURCES.instagram)
 *   // → /programs?utm_source=instagram&utm_medium=social&utm_campaign=bio
 */
export function buildUtmUrl(path: string, utm: UTMParams): string {
  const params = new URLSearchParams();
  params.set("utm_source", utm.source);
  params.set("utm_medium", utm.medium);
  if (utm.campaign) params.set("utm_campaign", utm.campaign);
  if (utm.term) params.set("utm_term", utm.term);
  if (utm.content) params.set("utm_content", utm.content);

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${params.toString()}`;
}

/**
 * Generate the full absolute URL for use in social bios / external platforms.
 *
 * @example
 *   getFullUrl("/programs", UTM_SOURCES.instagram)
 *   // → https://mulaiplus.id/programs?utm_source=instagram&utm_medium=social&utm_campaign=bio
 */
export function getFullUrl(path: string, utm: UTMParams): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id";
  return `${base}${buildUtmUrl(path, utm)}`;
}

/**
 * Extract UTM params from the current URL (client-side).
 * Useful for firing a custom GA4 event when a user arrives via UTM.
 */
export function getUtmFromUrl(): UTMParams | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const source = params.get("utm_source");
  if (!source) return null;

  return {
    source,
    medium: params.get("utm_medium") ?? "referral",
    campaign: params.get("utm_campaign") ?? undefined,
    term: params.get("utm_term") ?? undefined,
    content: params.get("utm_content") ?? undefined,
  };
}
