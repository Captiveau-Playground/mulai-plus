"use client";

import { GooeyToaster } from "goey-toast";
import { useEffect, useState } from "react";

/**
 * Toast gooey — posisi berdasar KONTEKS (perangkat):
 *  - DESKTOP → bottom-right (gaya "feedback" — tidak menutup hero/CTA/konten,
 *    dekat scroll & aksi; default library).
 *  - MOBILE  → top-center (tidak menutup bottom-nav/keyboard; dekat status).
 * Konteks non-posisi diekspresikan per tipe: richColors + fillColor brand,
 * durasi lebih lama untuk error/aksi, progress bar untuk proses panjang.
 *
 * CATATAN: goy-toast memakai satu toaster global (tanpa posisi per-toast),
 * jadi pemilihan konteks dilakukan di level perangkat + per tipe (warna/durasi),
 * bukan per pesan.
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
      position={isMobile ? "top-center" : "bottom-right"}
      richColors
      showProgress
      toastOptions={{
        style: { "--width": isMobile ? "min(92vw, 380px)" : "380px" } as React.CSSProperties,
      }}
      duration={4000}
    />
  );
}
