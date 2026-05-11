"use client";

import { env } from "@mulai-plus/env/web";
import { useEffect } from "react";

// GA4 gtag type declaration
declare global {
  interface Window {
    gtag: (command: string, target: string, config?: Record<string, unknown>) => void;
    dataLayer: unknown[];
  }
}

type EventParams = Record<string, string | number | boolean | undefined>;

/**
 * Track a GA4 event imperatively from anywhere.
 * Safe to call — no-ops if GA is not loaded or measurement ID not set.
 */
export function trackEvent(action: string, params?: EventParams) {
  if (typeof window === "undefined") return;
  if (!env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;
  if (typeof window.gtag !== "function") return;

  window.gtag("event", action, {
    ...params,
    send_to: env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  });
}

/**
 * Hook that fires page_view on route changes.
 * Receives the full path including search params as a string.
 */
export function usePageViewTracking(pagePath?: string) {
  useEffect(() => {
    if (!env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;
    if (typeof window.gtag !== "function") return;

    window.gtag("config", env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: pagePath,
      debug_mode: env.NEXT_PUBLIC_GA_DEBUG_MODE,
    });
  }, [pagePath]);
}

/**
 * Hook that returns a track function pre-bound to a page/context.
 */
export function useAnalytics(context?: string) {
  const track = (action: string, params?: EventParams) => {
    trackEvent(action, {
      page_context: context,
      ...params,
    });
  };
  return { track };
}
