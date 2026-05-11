"use client";

import { env } from "@mulai-plus/env/web";
import Script from "next/script";
import { usePageViewTracking } from "@/lib/analytics";
import { CookieConsentBanner, useConsent } from "./cookie-consent";

/**
 * Injects the GA4 script tag and tracks page views on route changes.
 * Only loads GA after user gives cookie consent.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const gaId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const { consent, accept, reject } = useConsent();

  // Track page views on every route change (always, even without GA)
  usePageViewTracking();

  const shouldLoadGa = gaId && consent === "accepted";

  return (
    <>
      {/* GA4 script — only loaded after consent */}
      {shouldLoadGa && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', {
                debug_mode: ${env.NEXT_PUBLIC_GA_DEBUG_MODE},
              });
            `}
          </Script>
        </>
      )}

      {children}

      {/* Consent banner — floating bottom bar */}
      <CookieConsentBanner consent={consent} onAccept={accept} onReject={reject} />
    </>
  );
}
