"use client";

import { Wrench, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { env } from "@mulai-plus/env/web";

const API = env.NEXT_PUBLIC_SERVER_URL || "";
const DISMISS_KEY = "maint-banner-dismissed";

interface Status {
  maintenance?: boolean;
  message?: string | null;
  endsAt?: string | null;
}

/** Banner kecil di halaman depan saat maintenance aktif — tidak menghalangi navigasi. */
export function MaintenanceBanner() {
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
      return;
    }
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(`${API}/meta/status`, { cache: "no-store" });
        const data = (await res.json()) as Status;
        if (alive) setStatus(data);
      } catch {
        if (alive) setStatus({ maintenance: false });
      }
    };
    check();
    const t = setInterval(check, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const active = status?.maintenance === true;
  if (!active || dismissed) return null;

  const eta = status.endsAt
    ? new Date(status.endsAt).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex items-center gap-2 border-b border-brand-orange/20 bg-brand-navy px-3 py-1.5 sm:px-4">
      <Wrench className="h-3.5 w-3.5 shrink-0 text-brand-orange" />
      <p className="min-w-0 flex-1 truncate font-manrope text-[11px] font-medium text-white/90 sm:text-xs">
        🔧 Kami sedang melakukan pemeliharaan{eta ? ` — perkiraan selesai ${eta}` : ""}.
        <Link
          href="https://status.mulaiplus.id"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 inline-flex items-center gap-0.5 font-semibold text-brand-orange underline-offset-2 hover:underline"
        >
          Cek status
        </Link>
      </p>
      <button
        aria-label="Tutup banner"
        onClick={() => {
          try {
            sessionStorage.setItem(DISMISS_KEY, "1");
          } catch {}
          setDismissed(true);
        }}
        className="shrink-0 rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}