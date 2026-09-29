"use client";

import { Check, ShieldCheck } from "lucide-react";
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
        <div className="p-6 pb-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-orange/10">
            <ShieldCheck className="size-5 text-brand-orange" />
          </span>
          <h2 className="mt-3 font-bold font-bricolage text-brand-navy text-lg">Kami menghargai privasi Anda</h2>
          <p className="mt-1.5 font-manrope text-[13px] text-muted-foreground leading-relaxed">
            Kami menggunakan cookie untuk keperluan analitik dan peningkatan pengalaman — supaya MULAI+ terasa lebih
            baik untuk Anda. Tidak ada data pribadi yang dibagikan ke pihak lain.
          </p>

          {/* reassurance */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["anonim", "Data anonim"],
              ["niet-verkocht", "Tidak dijual"],
              ["edit", "Bisa diubah"],
            ].map(([k, label]) => (
              <div key={k} className="flex items-center justify-center gap-1 rounded-lg bg-gray-50 px-2 py-1.5">
                <span className="flex size-3.5 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="size-2.5 text-emerald-600" />
                </span>
                <span className="font-manrope font-medium text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* actions — accept dominan */}
        <div className="px-6 pb-2">
          <Button
            onClick={onAccept}
            className="h-12 w-full rounded-xl bg-brand-navy font-manrope font-semibold text-sm text-white shadow-lg transition-all duration-200 hover:scale-[1.01] hover:bg-brand-navy/90 active:scale-[0.99]"
          >
            Ya, saya setuju
          </Button>
          <p className="mt-1.5 text-center font-manrope text-[10px] text-muted-foreground/70">
            Lanjut menikmati fitur MULAI+ tanpa gangguan.
          </p>
        </div>

        {/* reject — sekunder tapi jujur & mudah diakses */}
        <div className="px-6 py-3">
          <button
            type="button"
            onClick={onReject}
            className="w-full cursor-pointer py-1 text-center font-manrope text-[11px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-brand-navy"
          >
            Hanya cookie yang wajib (tanpa analitik)
          </button>
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
