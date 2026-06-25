"use client";

import { env } from "@mulai-plus/env/web";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

import { Suspense, useEffect, useRef } from "react";
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
  const gaLoaded = useRef(false);

  const shouldLoad = Boolean(gaId) && consent === "accepted";

  // GA initialization script — loaded after user consent
  useEffect(() => {
    if (!shouldLoad || gaLoaded.current) return;
    gaLoaded.current = true;
    // gtag is defined by the inline Script below
  }, [shouldLoad]);

  const gaInitScript = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}', {
      debug_mode: ${env.NEXT_PUBLIC_GA_DEBUG_MODE},
    });
  `;

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>

      {children}

      {/* GA4 — loaded with afterInteractive so it doesn't block rendering */}
      {shouldLoad && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: gaInitScript }} />
        </>
      )}

      <ClarityProvider consent={consent} />
      <CookieConsentBanner consent={consent} onAccept={accept} onReject={reject} />
    </>
  );
}
