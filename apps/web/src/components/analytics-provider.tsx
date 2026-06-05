"use client";

import { env } from "@mulai-plus/env/web";
import { usePathname, useSearchParams } from "next/navigation";

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

  // Inject GA4 scripts via DOM (same approach as Clarity — guaranteed to execute)
  useEffect(() => {
    if (!shouldLoad || gaLoaded.current) return;

    // Load GA4 library
    const libScript = document.createElement("script");
    libScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    libScript.async = true;
    document.head.appendChild(libScript);

    // Init GA4
    const initScript = document.createElement("script");
    initScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', {
        debug_mode: ${env.NEXT_PUBLIC_GA_DEBUG_MODE},
      });
    `;
    document.head.appendChild(initScript);

    gaLoaded.current = true;
  }, [shouldLoad]);

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>

      {children}

      <ClarityProvider consent={consent} />
      <CookieConsentBanner consent={consent} onAccept={accept} onReject={reject} />
    </>
  );
}
