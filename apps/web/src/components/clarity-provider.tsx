"use client";

import { env } from "@mulai-plus/env/web";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    clarity?: (command: string, ...args: unknown[]) => void;
  }
}

/**
 * Microsoft Clarity Provider (void component — no children)
 *
 * Tracks user behavior (session recordings, heatmaps, insights).
 * Only activates when consent is "accepted" and page is front/student (not admin).
 */

const EXCLUDED_PATTERNS = ["/admin", "/mentor", "/program-manager", "/api", "/_next", "/rpc"];

function shouldTrackClarity(pathname: string): boolean {
  return !EXCLUDED_PATTERNS.some((p) => pathname.startsWith(p));
}

interface ClarityProviderProps {
  consent: "undecided" | "accepted" | "rejected";
}

export function ClarityProvider({ consent }: ClarityProviderProps) {
  const clarityId = env.NEXT_PUBLIC_CLARITY_ID;
  const pathname = usePathname();
  const initialized = useRef(false);

  const shouldLoad = Boolean(clarityId) && consent === "accepted" && shouldTrackClarity(pathname);

  useEffect(() => {
    if (!shouldLoad || initialized.current) return;

    const script = document.createElement("script");
    script.textContent = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${clarityId}");
    `;
    document.head.appendChild(script);
    initialized.current = true;

    return () => {
      script.remove();
      initialized.current = false;
    };
  }, [shouldLoad]);

  // Track page changes
  useEffect(() => {
    if (typeof window.clarity !== "function") return;
    if (consent === "accepted" && shouldTrackClarity(pathname)) {
      window.clarity("set", "page", pathname);
    }
  }, [pathname, consent]);

  return null;
}

/**
 * Identify a user to Clarity after login. Safe no-op if Clarity not loaded.
 */
export function identifyClarityUser(userId: string, userName?: string) {
  if (typeof window === "undefined") return;
  if (typeof window.clarity !== "function") return;
  window.clarity("identify", userId, undefined, undefined, userName || userId);
}

/**
 * Track a custom event in Clarity.
 */
export function trackClarityEvent(name: string) {
  if (typeof window === "undefined") return;
  if (typeof window.clarity !== "function") return;
  window.clarity("event", name);
}
