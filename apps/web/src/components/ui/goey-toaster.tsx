"use client";

import { GooeyToaster } from "goey-toast";
import { useEffect, useState } from "react";

/**
 * Toast gooey — layout DEFAULT library (position satu-satunya disesuaikan
 * fungsi: TOP-CENTER — confirmasi/error/promise tidak menutup bottom-nav
 * ataupun keyboard di mobile), hanya responsif lebar & warna brand.
 * Tidak ada override class/preset/spring (biar library yang tampil natural).
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
      richColors
      showProgress
      style={{ "--width": isMobile ? "min(92vw, 380px)" : "380px" } as React.CSSProperties}
    />
  );
}
