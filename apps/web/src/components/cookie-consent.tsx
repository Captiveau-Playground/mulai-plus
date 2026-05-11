"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "mulaiplus_ga_consent";

type ConsentState = "undecided" | "accepted" | "rejected";

function getStoredConsent(): ConsentState {
  if (typeof window === "undefined") return "undecided";
  return (localStorage.getItem(CONSENT_KEY) as ConsentState) || "undecided";
}

function setStoredConsent(state: ConsentState) {
  localStorage.setItem(CONSENT_KEY, state);
}

/**
 * Returns the current consent state and a setter.
 * Used by AnalyticsProvider to decide whether to load GA.
 */
export function useConsent() {
  const [consent, setConsent] = useState<ConsentState>("undecided");

  useEffect(() => {
    setConsent(getStoredConsent());
  }, []);

  const accept = () => {
    setStoredConsent("accepted");
    setConsent("accepted");
  };

  const reject = () => {
    setStoredConsent("rejected");
    setConsent("rejected");
  };

  return { consent, accept, reject };
}

/**
 * Floating bottom banner asking for analytics consent.
 * Only shows when user hasn't decided yet.
 */
export function CookieConsentBanner({
  consent,
  onAccept,
  onReject,
}: {
  consent: ConsentState;
  onAccept: () => void;
  onReject: () => void;
}) {
  if (consent !== "undecided") return null;

  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 left-0 z-[100]",
        "border-gray-200 border-t bg-white/95 shadow-lg backdrop-blur-md",
        "fade-in slide-in-from-bottom-4 animate-in duration-300",
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-4 sm:flex-row sm:px-6 sm:py-3">
        <p className="flex-1 text-center font-manrope text-sm text-text-main sm:text-left">
          Kami menggunakan cookie dari Google Analytics untuk memahami cara Anda menggunakan platform ini dan
          meningkatkan pengalaman Anda.{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-navy underline hover:text-brand-orange"
          >
            Kebijakan Privasi
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            className="rounded-full border-gray-300 font-manrope text-text-muted-custom text-xs hover:bg-gray-100"
          >
            Tolak
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            className="rounded-full bg-brand-navy font-manrope text-white text-xs hover:bg-brand-navy/90"
          >
            Terima
          </Button>
        </div>
      </div>
    </div>
  );
}
