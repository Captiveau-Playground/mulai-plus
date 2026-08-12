"use client";

import { env } from "@mulai-plus/env/web";
import { useEffect } from "react";
import { useConsent } from "@/components/cookie-consent";
import { authClient } from "@/lib/auth-client";

// Fallback key — sebaiknya diatur lewat NEXT_PUBLIC_AMPLITUDE_API_KEY di env
const FALLBACK_API_KEY = "4b58c01dd72032ca4a3e30482f149d27";

let initialized = false;
let amplitudeModule: typeof import("@amplitude/unified") | null = null;

/**
 * Muat SDK Amplitude hanya sekali & on-demand (setelah consent diterima).
 * → Menghapus ~429KB SDK dari jalur kritikal SEMUA halaman (hanya dimuat saat dibutuhkan).
 */
async function loadAmplitude() {
  if (!amplitudeModule) {
    amplitudeModule = await import("@amplitude/unified");
  }
  return amplitudeModule;
}

/**
 * Inisialisasi Amplitude (analytics + session replay).
 * - Hanya jalan di production
 * - Hanya setelah user MENERIMA consent (sama seperti GA & Clarity)
 * - User teridentifikasi via auth session (setUserId)
 */
export function AmplitudeInit() {
  const { consent } = useConsent();
  // Session watcher: identitas user untuk analitik (login/logout/restore)
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (consent !== "accepted") return;
    const userId = session?.user?.id;
    if (userId) identifyAmplitudeUser(userId);
    else resetAmplitudeUser();
  }, [consent, session?.user?.id]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (initialized) return;
    if (consent !== "accepted") return;

    const apiKey =
      env.NEXT_PUBLIC_AMPLITUDE_API_KEY && !env.NEXT_PUBLIC_AMPLITUDE_API_KEY.includes("<")
        ? env.NEXT_PUBLIC_AMPLITUDE_API_KEY
        : FALLBACK_API_KEY;
    initialized = true;

    loadAmplitude()
      .then((amp) =>
        amp.initAll(apiKey, {
          analytics: {
            autocapture: {
              pageViews: true,
              sessions: true,
              attribution: true,
              // klik/form di-track manual via trackEvent — hindari noise
              elementInteractions: false,
              formInteractions: false,
              fileDownloads: false,
            },
          },
          sessionReplay: {
            sampleRate: 0.5,
          },
        }),
      )
      .catch((e) => {
        // jangan sampai gagal init merusak app
        console.error("Amplitude init failed", e);
        initialized = false;
      });
  }, [consent]);

  return null;
}

/** Set identitas user setelah login/session tersedia */
export async function identifyAmplitudeUser(userId: string) {
  try {
    const amp = await loadAmplitude();
    amp.setUserId(userId);
  } catch {
    // noop
  }
}

/** Hapus identitas user saat logout */
export async function resetAmplitudeUser() {
  try {
    const amp = await loadAmplitude();
    amp.reset();
  } catch {
    // noop
  }
}
