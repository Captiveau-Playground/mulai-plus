"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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
    const onReset = () => setConsent("undecided");
    window.addEventListener("mulaiplus-consent-reset", onReset);
    return () => window.removeEventListener("mulaiplus-consent-reset", onReset);
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
 * Modal consent cookie — tengah layar, gaya profesional (satu keputusan: setuju/tolak).
 * Hanya tampil saat user belum memutuskan.
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
      role="dialog"
      aria-modal="true"
      aria-label="Persetujuan cookie"
      className="fade-in fixed inset-0 z-[100] flex animate-in items-center justify-center bg-brand-navy/40 px-4 backdrop-blur-sm duration-300"
    >
      <div className="fade-in zoom-in-95 w-full max-w-md animate-in rounded-2xl border border-gray-100 bg-white shadow-2xl duration-300">
        {/* header */}
        <div className="border-gray-100 border-b p-6 pb-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-orange/10">
            <ShieldCheck className="size-5 text-brand-orange" />
          </span>
          <h2 className="mt-3 font-bold font-bricolage text-brand-navy text-lg">Kami menghargai privasi Anda</h2>
          <p className="mt-1.5 font-manrope text-[13px] text-muted-foreground leading-relaxed">
            Kami menggunakan cookie dari Google Analytics dan Microsoft Clarity untuk memahami bagaimana pengunjung
            memakai MULAI+, sehingga kami bisa memperbaikinya. Data tetap anonim dan tidak menjual informasi Anda ke
            pihak lain.
          </p>
        </div>

        {/* actions */}
        <div className="grid grid-cols-2 gap-2.5 p-6 pt-4">
          <Button
            variant="outline"
            onClick={onReject}
            className="h-11 rounded-xl border-gray-300 font-manrope font-semibold text-text-muted-custom text-xs hover:bg-gray-50"
          >
            Tolak Semua
          </Button>
          <Button
            onClick={onAccept}
            className="h-11 rounded-xl bg-brand-navy font-manrope font-semibold text-white text-xs hover:bg-brand-navy/90"
          >
            Setuju Semua
          </Button>
        </div>

        {/* footer links */}
        <div className="flex items-center justify-center gap-4 border-gray-100 border-t px-6 py-3">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-manrope text-[11px] text-muted-foreground underline underline-offset-2 hover:text-brand-navy"
          >
            Kebijakan Privasi
          </a>
          <span className="size-1 rounded-full bg-gray-300" />
          <a
            href="/privacy#assessment"
            target="_blank"
            rel="noopener noreferrer"
            className="font-manrope text-[11px] text-muted-foreground underline underline-offset-2 hover:text-brand-navy"
          >
            Cara kami memproses data
          </a>
        </div>
      </div>
    </div>
  );
}
