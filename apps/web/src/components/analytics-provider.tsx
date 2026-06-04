"use client";

import { env } from "@mulai-plus/env/web";
import { usePathname, useSearchParams } from "next/navigation";

import { Suspense } from "react";
import { usePageViewTracking } from "@/lib/analytics";
import { ClarityProvider } from "./clarity-provider";
import { CookieConsentBanner, useConsent } from "./cookie-consent";

/**
 * Separate component that accesses useSearchParams.
 * Must be wrapped in <Suspense> for Next.js static generation compat.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

  usePageViewTracking(fullPath);

  return null;
}

/**
 * Injects the GA4 script tag and tracks page views on route changes.
 * Only loads GA after user gives cookie consent.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const gaId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const { consent, accept, reject } = useConsent();

  const shouldLoadGa = gaId && consent === "accepted";

  return (
    <>
      {/* Page view tracking — wrapped in Suspense for static generation safety */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>

      {/* GA4 script — only loaded after consent */}
      {shouldLoadGa && (
        <>
          <script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script id="ga-init">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', {
                debug_mode: ${env.NEXT_PUBLIC_GA_DEBUG_MODE},
              });
            `}
          </script>
        </>
      )}

      {children}

      {/* Microsoft Clarity — only loaded after consent, front/student pages only */}
      <ClarityProvider consent={consent} />

      {/* Consent banner — floating bottom bar */}
      <CookieConsentBanner consent={consent} onAccept={accept} onReject={reject} />
    </>
  );
}
