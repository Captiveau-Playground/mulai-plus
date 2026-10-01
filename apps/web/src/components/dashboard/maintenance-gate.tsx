"use client";

import { Loader2, Wrench } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { env } from "@mulai-plus/env/web";

const API = env.NEXT_PUBLIC_SERVER_URL || "";

interface Status {
  maintenance: boolean;
  message?: string | null;
  endsAt?: string | null;
}

/** Gate dashboard — saat maintenance aktif, tampilkan info & sembunyikan konten aksi.
 *  exceptPaths: rute yang TETAP buka (mis. /admin untuk toggle maintenance). */
export function MaintenanceGate({
  children,
  exceptPaths = [],
}: {
  children: ReactNode;
  exceptPaths?: string[];
}) {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);

  // Rute yang di-exempt (admin) selalu buka tanpa cek flag
  if (exceptPaths.some((p) => pathname?.startsWith(p))) return <>{children}</>;

  useEffect(() => {
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

  if (status === null) return <>{children}</>; // belum tahu → biarkan dulu (no blank)
  if (!status.maintenance) return <>{children}</>;

  // Full-screen overlay: menutupi layout & sidebar — tidak ada yang bisa diklik.
  return (
    <div className="fixed inset-0 z-[999] flex min-h-full items-center justify-center overflow-y-auto bg-white px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-brand-orange/25 bg-white p-8 text-center shadow-2xl shadow-brand-navy/10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
          <Wrench className="h-7 w-7" />
        </span>
        <h1 className="mt-4 font-bold font-bricolage text-xl text-brand-navy">Dashboard sedang dipelihara</h1>
        <p className="mt-2 font-manrope text-sm leading-relaxed text-gray-500">
          {status.message ??
            "Kami sedang melakukan pembaruan sistem. Semua aksi di dashboard (tes, AI, laporan) akan aktif kembali sebentar lagi — data kamu aman."}
        </p>
        {status.endsAt && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 font-manrope text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Perkiraan selesai:{" "}
            {new Date(status.endsAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
        <a
          href="https://status.mulaiplus.id"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-navy px-6 py-3 font-manrope font-semibold text-sm text-white transition-all hover:bg-brand-navy-light"
        >
          Cek status layanan →
        </a>
      </div>
    </div>
  );
}