"use client";

import { env } from "@mulai-plus/env/web";
import { useEffect } from "react";

// ── GA4 gtag type declaration ──
declare global {
  interface Window {
    gtag: (command: string, target: string, config?: Record<string, unknown>) => void;
    dataLayer: unknown[];
  }
}

type EventParams = Record<string, string | number | boolean | undefined>;

const CONSENT_KEY = "mulaiplus_ga_consent";

/** Consent aktif? (client-only). Amplitude/event ketat ga boleh jalan tanpa ini. */
export function isConsented(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return true; // storage privat → jangan blok UX, tapi GA sudah atur consent mode
  }
}

/** Reset izin (UI "Kelola Izin") → banner muncul lagi. */
export function resetConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new Event("mulaiplus-consent-reset"));
  } catch {
    /* noop */
  }
}

// ── Amplitude (production only) ──
const isProd = typeof window !== "undefined" && process.env.NODE_ENV === "production";

/**
 * Track event ke GA4 (jika tersedia) DAN Amplitude (jika production) — independen.
 * Safe to call — no-ops jika layanan terkait tidak tersedia.
 */
export function trackEvent(action: string, params?: EventParams) {
  if (typeof window === "undefined") return;

  // GA4 — independen dari Amplitude
  const gaId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (gaId && analyticsEnabled() && typeof window.gtag === "function") {
    window.gtag("event", action, {
      ...params,
      send_to: gaId,
    });
  }

  // Amplitude — KETAT consent (tidak ada consent-mode di Amplitude):
  // hanya jalan setelah user "Terima". Dynamic import: SDK baru dimuat saat itu.
  if (isProd && isConsented()) {
    import("@amplitude/unified")
      .then((amp) => {
        try {
          amp.track(action, params);
        } catch {
          // noop
        }
      })
      .catch(() => {
        // noop
      });
  }
}

/**
 * Apakah GA boleh aktif di lingkungan ini?
 * Jangan kirim data dari lokal/preview ke properti produksi:
 *  - NEXT_PUBLIC_GA_MEASUREMENT_ID harus terisi
 *  - NEXT_PUBLIC_ANALYTICS_DISABLED=1 mematikan SEMUA analytics (GA + Clarity + Amplitude),
 *    dipakai lokal, staging, dan build e2e supaya tidak mencemari properti produksi
 *  - hostname localhost / 127.0.0.1 / *.local tidak pernah mengirim
 */
export function analyticsEnabled(): boolean {
  if (!env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return false;
  if (String(env.NEXT_PUBLIC_ANALYTICS_DISABLED ?? "") === "1") return false;
  if (typeof window === "undefined") return true; // SSR: keputusan diambil di client
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".local")) return false;
  return true;
}

/**
 * Hook that fires page_view on route changes.
 * Receives the full path including search params as a string.
 */
export function usePageViewTracking(pagePath?: string) {
  useEffect(() => {
    const gaId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!gaId || !analyticsEnabled()) return;
    if (typeof window.gtag !== "function") return;

    window.gtag("config", gaId, {
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
