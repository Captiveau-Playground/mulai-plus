"use client";

import { env } from "@mulai-plus/env/web";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect, useRef } from "react";
import { usePageViewTracking } from "@/lib/analytics";
import { ClarityProvider } from "./clarity-provider";
import { CookieConsentBanner, useConsent } from "./cookie-consent";

/**
 * Tracks page views and re-fires when GA becomes available after consent.
 */
function PageViewTracker({ gaReady, gaId }: { gaReady: boolean; gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

  // Track on route change (always runs, gaReady check inside hook)
  usePageViewTracking(fullPath);

  // Re-fire page_view when GA becomes ready after consent
  const prevGaReady = useRef(false);
  useEffect(() => {
    if (gaReady && !prevGaReady.current && typeof window.gtag === "function") {
      window.gtag("config", gaId, {
        page_path: fullPath,
        debug_mode: env.NEXT_PUBLIC_GA_DEBUG_MODE,
      });
    }
    prevGaReady.current = gaReady;
  }, [gaReady, fullPath, gaId]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const gaId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const { consent, accept, reject } = useConsent();
  const shouldLoadGa = gaId && consent === "accepted";

  return (
    <>
      {/* GA4 script — only loaded after consent */}
      {shouldLoadGa && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script
            id="ga-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  debug_mode: ${env.NEXT_PUBLIC_GA_DEBUG_MODE},
                });
              `,
            }}
          />
        </>
      )}

      {/* Page view tracking */}
      <Suspense fallback={null}>
        <PageViewTracker gaReady={!!shouldLoadGa} gaId={gaId || ""} />
      </Suspense>

      {children}

      <ClarityProvider consent={consent} />
      <CookieConsentBanner consent={consent} onAccept={accept} onReject={reject} />
    </>
  );
}
