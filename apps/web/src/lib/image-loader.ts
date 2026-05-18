/**
 * Custom Next.js Image Loader
 *
 * Bypasses Next.js optimization proxy and returns direct URL.
 * This prevents timeout issues when fetching from Cloudflare R2.
 *
 * Security: This loader only returns the URL - no transformation.
 * For production, consider implementing image transformation via Cloudflare Images.
 */

import type { ImageLoaderProps } from "next/image";

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  // If it's already a full URL, return as is
  if (src.startsWith("http://") || src.startsWith("https://")) {
    // Add width/quality params if the CDN supports it (optional)
    const _url = new URL(src);

    // Some CDNs support resizing via query params
    // Cloudflare: add ?width=xxx (handled by CDN, not here)

    return src;
  }

  // For relative paths, this shouldn't happen with our setup
  return src;
}
