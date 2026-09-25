"use client";

import { GooeyToaster } from "goey-toast";
import { useEffect, useState } from "react";

/**
 * Toast gooey — minimal & top-center (Vercel style) untuk desktop & mobile.
 *
 * UIUX reasoning:
 *  - TOP-CENTER: tidak menutup konten utama / bottom-nav / keyboard;
 *    konsisten antar viewport, dekat dengan alur "notifikasi".
 *  - MINIMAL: tanpa kartu bg solid — blob gooey + shadow lembut yang muncul,
 *    merepresentasikan warna tipe (success/error/warning/info) tanpa blok tebal.
 *  - Mobile: lebar ~92vw, preset subtle (halus), swipe-to-dismiss.
 *  - Desktop: 380px, preset bouncy + progress bar.
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
      position="top-center"
      theme="light"
      closeButton
      richColors
      showProgress
      gap={isMobile ? 8 : 12}
      visibleToasts={isMobile ? 3 : 4}
      offset={isMobile ? 10 : 20}
      swipeToDismiss
      closeOnEscape
      preset={isMobile ? "subtle" : "bouncy"}
      spring
      bounce={0.35}
      toastOptions={{
        style: {
          "--width": isMobile ? "min(92vw, 380px)" : "380px",
        } as React.CSSProperties,
        classNames: {
          toast: "font-manrope rounded-2xl shadow-lg backdrop-blur-md",
          title: "text-sm font-semibold tracking-tight",
          description: "text-xs text-muted-foreground leading-relaxed",
          actionButton: "rounded-full bg-brand-navy text-white px-3 py-1 font-medium hover:opacity-90",
          cancelButton: "rounded-full text-muted-foreground px-3 py-1 hover:bg-gray-100",
        },
      }}
    />
  );
}
