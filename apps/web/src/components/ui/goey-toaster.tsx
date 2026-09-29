"use client";

import { GooeyToaster } from "goey-toast";
import { useEffect, useState } from "react";

/**
 * Toast gooey — posisi berdasar KONTEKS (perangkat):
 *  - DESKTOP → top-right (dekat status/judul — tidak menutup bottom action,
 *    tetap terlihat saat scroll di chat/composer).
 *  - MOBILE  → top-center (dekat status; tidak menutup bottom-nav/keyboard).
 * Error panjang dikelola di lib/toast (deskripsi scrollable + tombol copy),
 * jadi tidak pernah lebih tinggi dari layar.
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
      position={isMobile ? "top-center" : "top-right"}
      richColors
      showProgress
      offset={isMobile ? 12 : 16}
      toastOptions={{
        style: { "--width": isMobile ? "min(92vw, 380px)" : "420px" } as React.CSSProperties,
      }}
      duration={4000}
    />
  );
}
