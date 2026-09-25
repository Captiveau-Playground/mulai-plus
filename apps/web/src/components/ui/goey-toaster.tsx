"use client";

import { GooeyToaster } from "goey-toast";

/**
 * Mount global toast gooey (morphing) — gaya Vercel/Goey dengan palet brand MULAI+.
 * Semua `toast`/`notify` di aplikasi dirender di sini.
 */
export function GooeyToasterMount() {
  return (
    <GooeyToaster
      position="top-center"
      theme="light"
      closeButton
      richColors
      showProgress
      gap={10}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast: "font-manrope rounded-2xl shadow-xl backdrop-blur-md border",
          title: "text-sm font-semibold tracking-tight",
          description: "text-xs text-muted-foreground leading-relaxed",
        },
      }}
    />
  );
}
