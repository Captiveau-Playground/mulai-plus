"use client";

import { env } from "@mulai-plus/env/web";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

import { Suspense, useEffect } from "react";
import { usePageViewTracking } from "@/lib/analytics";
import { ClarityProvider } from "./clarity-provider";
import { CookieConsentBanner, useConsent } from "./cookie-consent";

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

  usePageViewTracking(fullPath);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const gaId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const { consent, accept, reject } = useConsent();

  // GA4 Consent Mode v2 — script dimuat selalu, tapi default DENIED.
  // `wait_for_update` memberi waktu sebelum event dikirim (halaman pertama).
  const gaInitScript = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'analytics_storage': 'denied',
      'wait_for_update': 500,
    });
    gtag('js', new Date());
    gtag('config', '${gaId}', {
      debug_mode: ${env.NEXT_PUBLIC_GA_DEBUG_MODE},
    });
  `;

  // Terapkan pilihan user ke Consent Mode ketika berubah.
  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    const granted = "granted";
    const denied = "denied";
    const s = consent === "accepted" ? granted : denied;
    window.gtag("consent", "update", {
      ad_storage: s,
      ad_user_data: s,
      ad_personalization: s,
      analytics_storage: s,
    });
  }, [consent]);

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>

      {children}

      {/* GA4 — Consent Mode v2: script dimuat selalu; storage mengikuti pilihan user */}
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: gaInitScript }} />

      <ClarityProvider consent={consent} />
      <CookieConsentBanner consent={consent} onAccept={accept} onReject={reject} />
    </>
  );
}
