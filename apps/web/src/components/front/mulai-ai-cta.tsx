"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";
import { mulaiAiUrl } from "@/lib/utm";

type Variant = "primary" | "outline" | "ghost";

const STYLES: Record<Variant, string> = {
  primary:
    "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-orange px-8 py-3.5 font-bold font-manrope text-sm text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:brightness-105 sm:w-auto",
  outline:
    "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-brand-navy/15 px-8 py-3.5 font-bold font-manrope text-sm text-brand-navy transition-all duration-300 hover:border-brand-navy/30 hover:bg-brand-navy/5 sm:w-auto",
  ghost:
    "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/5 px-8 py-3.5 font-bold font-manrope text-sm text-brand-orange transition-all duration-300 hover:bg-brand-orange/10 sm:w-auto",
};

/**
 * CTA Mul.ai dengan UTM + event analytics `mul_ai_cta_click`.
 * `placement` = posisi tombol (hero / home-section / ai-page-hero …).
 */
export function MulAiCta({
  to,
  content,
  placement,
  variant = "primary",
  children,
}: {
  to: string;
  content: string;
  placement: string;
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <Link href={mulaiAiUrl(to, content) as any}>
      <button
        type="button"
        data-tracked="1"
        onClick={() =>
          trackEvent("mul_ai_cta_click", {
            campaign: "mulaiai_launch",
            placement,
            cta_content: content,
            cta_to: to,
          })
        }
        className={STYLES[variant]}
      >
        {children}
      </button>
    </Link>
  );
}
