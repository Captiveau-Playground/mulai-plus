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
      const el = target?.closest?.("a, button") as HTMLElement | null;
      if (!el) return;
      // CTA yang sudah punya event tersendiri (di-tandai data-tracked) — jangan double-fire.
      if (el.dataset?.tracked === "1") return;

      const text = (el.textContent ?? "").trim().slice(0, 80);
      const page = window.location.pathname;

      if (el.tagName === "A") {
        const href = el.getAttribute("href") || "";
        trackEvent("front_link_click", {
          page,
          link_text: text,
          link_href: href.slice(0, 200),
          campaign: getUtmFromUrl()?.campaign ?? undefined,
        });
        // UTM hanya utk link eksternal — atribusi internal tetap bersih.
        const finalHref = ensureUtm(href, text || page);
        if (finalHref !== href) {
          e.preventDefault();
          window.location.href = finalHref;
        }
      } else {
        // Tombol <button> tanpa event khusus → dicatat sebagai CTA.
        trackEvent("front_cta_click", { page, cta_text: text, element: "button" });
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
