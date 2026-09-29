"use client";

import { useEffect } from "react";
import { trackEvent, usePageViewTracking } from "@/lib/analytics";
import { ensureUtm, getUtmFromUrl } from "@/lib/utm";

/**
 * Pelacak link & tombol di seluruh halaman front (public).
 *  - Klik <a> apa pun → event `front_link_click` (page, text, href, campaign asal).
 *  - Bila href belum punya UTM, ditambahkan otomatis (source=mulaiplus_web,
 *    medium=front, campaign=halaman, content=teks) sebelum navigasi.
 *  - Halaman view tracking (GA) utk jalur front.
 *
 * SEO note: UTM tidak di-render ke HTML (hanya diterapkan saat klik runtime),
 * sehingga tidak membuat URL duplikat di cache/ISR maupun canonical.
 */
export function FrontLinkTracker() {
  usePageViewTracking();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const a = target?.closest?.("a");
      if (!a) return;

      const href = a.getAttribute("href") || "";
      const text = (a.textContent ?? "").trim().slice(0, 80);
      const page = window.location.pathname;

      trackEvent("front_link_click", {
        page,
        link_text: text,
        link_href: href.slice(0, 200),
        campaign: getUtmFromUrl()?.campaign ?? undefined,
      });

      // Tambah UTM bila belum ada (kecuali anchor/mailto/tel/hash)
      const finalHref = ensureUtm(href, text || page);
      if (finalHref !== href) {
        e.preventDefault();
        window.location.href = finalHref;
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
