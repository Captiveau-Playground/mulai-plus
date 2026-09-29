"use client";

import { useEffect } from "react";

/**
 * Safety net: redirect ke halaman asal setelah login dari chatbot.
 * Hanya aktif di NON-login page, biar gak loop.
 */
export function RedirectHandler() {
  useEffect(() => {
    try {
      // Skip di login page — user belum login
      if (window.location.pathname.startsWith("/login")) return;

      const redirect = localStorage.getItem("chatbot_redirect");
      if (redirect) {
        localStorage.removeItem("chatbot_redirect");
        const current = window.location.pathname + window.location.search;
        if (current !== redirect && !redirect.startsWith(window.location.pathname)) {
          window.location.href = redirect;
        }
      }
    } catch {}
  }, []);

  return null;
}
