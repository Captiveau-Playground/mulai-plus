"use client";

import { GooeyToaster } from "goey-toast";
import { useEffect, useState } from "react";

/**
 * Mount global toast gooey — responsif mobile vs desktop.
 *
 * Desktop : bottom-right, lebar 380px, preset bouncy, progress bar.
 * Mobile  : bottom-center, lebar ~92vw, preset subtle (perf), swipe-to-dismiss.
 * Semua tipe (default/success/error/warning/info) pakai palet brand MULAI+
 * (via richColors + CSS vars dibawah).
 */
function useIsMobile(query = "(max-width: 640px)"): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}

export function GooeyToasterMount() {
  const isMobile = useIsMobile();

  return (
    <GooeyToaster
      position={isMobile ? "bottom-center" : "bottom-right"}
      theme="light"
      closeButton
      richColors
      showProgress
      gap={10}
      visibleToasts={isMobile ? 3 : 4}
      offset={isMobile ? 12 : 24}
      swipeToDismiss
      closeOnEscape
      preset={isMobile ? "subtle" : "bouncy"}
      spring
      bounce={0.4}
      toastOptions={{
        style: {
          // Palet brand MULAI+ — sonner/gooey read CSS vars ini
          "--normal-bg": "#ffffff",
          "--normal-border": "#E5E7EB",
          "--normal-color": "#1E1B4B",
          "--success-bg": "#F0FDFA",
          "--success-border": "#0D9488",
          "--success-color": "#065F46",
          "--error-bg": "#FFF1F2",
          "--error-border": "#F93447",
          "--error-color": "#9F1239",
          "--warning-bg": "#FFF7ED",
          "--warning-border": "#FE9114",
          "--warning-color": "#9A3412",
          "--info-bg": "#EEF2FF",
          "--info-border": "#1A1F6D",
          "--info-color": "#1E1B4B",
          "--width": isMobile ? "min(92vw, 380px)" : "380px",
        } as React.CSSProperties,
        classNames: {
          toast: "font-manrope rounded-2xl shadow-xl backdrop-blur-md border",
          title: "text-sm font-semibold tracking-tight",
          description: "text-xs text-muted-foreground leading-relaxed",
          actionButton: "rounded-full bg-brand-navy text-white px-3 py-1 font-medium hover:opacity-90",
          cancelButton: "rounded-full text-muted-foreground px-3 py-1 hover:bg-gray-100",
        },
      }}
    />
  );
}
