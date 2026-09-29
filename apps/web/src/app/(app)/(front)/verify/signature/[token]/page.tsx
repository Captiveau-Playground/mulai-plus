import { env } from "@mulai-plus/env/web";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

// ── Decode token (support both HMAC-signed and plain base64url) ──
function decodeToken(token: string): Record<string, string> | null {
  try {
    const parts = token.split(".");
    let b64 = parts[0].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const raw = Buffer.from(b64, "base64").toString("utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    program_manager: "Program Manager",
    founder: "Founder",
  };
  return labels[role] || role;
}

// ── Reusable error state ──
function ErrorState({ icon, title, message }: { icon: "warning" | "invalid"; title: string; message: string }) {
  const isWarn = icon === "warning";
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-bg-light px-4 py-16 sm:py-24">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 w-fit">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`h-32 w-32 rounded-full blur-2xl ${isWarn ? "bg-amber-50" : "bg-red-50"}`} />
          </div>
          <div
            className={`relative flex h-20 w-20 items-center justify-center rounded-2xl shadow-sm sm:h-24 sm:w-24 ${
              isWarn ? "bg-amber-50" : "bg-red-50"
            }`}
          >
            <svg
              className={`h-10 w-10 sm:h-12 sm:w-12 ${isWarn ? "text-amber-500" : "text-red-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              {isWarn ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              )}
            </svg>
          </div>
        </div>
        <h1
          className={`mb-2 font-bold font-bricolage text-2xl sm:text-3xl ${isWarn ? "text-amber-600" : "text-red-600"}`}
        >
          {title}
        </h1>
        <p className="mx-auto mb-8 max-w-sm font-manrope text-sm text-text-muted-custom sm:text-base">{message}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={"/" as Route}
            className="btn-brand-navy inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-bold font-manrope text-sm shadow-md transition-all hover:translate-y-[-1px] hover:shadow-lg sm:px-8 sm:py-3.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
            </svg>
            Kembali ke Beranda
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main verify component ──
async function VerifyContent({ token }: { token: string }) {
  const info = decodeToken(token);

  // Try API verification first (supports HMAC-signed tokens)
  let apiResult: {
    valid: boolean;
    signerName?: string;
    signerRole?: string;
    documentId?: string;
    documentDate?: string;
    verifiedAt?: string;
    totalVerifications?: number;
    message?: string;
  } | null = null;

  let _apiFailed = false;

  if (info) {
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/rpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "esign.verifySignature",
          params: [{ token }],
        }),
        cache: "no-store",
      });
      const json = await res.json();
      if (json.result) apiResult = json.result;
    } catch {
      _apiFailed = true;
    }
  }

  // ── HMAC invalid → token dirusak ──
  if (apiResult && !apiResult.valid) {
    return (
      <ErrorState
        icon="invalid"
        title="Tanda Tangan Tidak Valid"
        message="QR code yang Anda scan telah dirusak atau dipalsukan. Tanda tangan digital ini tidak dapat diverifikasi."
      />
    );
  }

  // ── Token format invalid ──
  if (!info) {
    return (
      <ErrorState
        icon="invalid"
        title="Tanda Tangan Tidak Dikenali"
        message="QR code yang Anda scan tidak sesuai dengan format tanda tangan digital MULAI+. Pastikan Anda memindai QR code yang benar."
      />
    );
  }

  // ── API menolak (token terdaftar sebagai invalid) ──
  if (apiResult && apiResult.valid === false) {
    return (
      <ErrorState
        icon="warning"
        title="Dokumen Tidak Ditemukan"
        message="Tanda tangan digital ini tidak dapat diverifikasi di sistem MULAI+. Dokumen mungkin telah dihapus atau token tidak lagi berlaku."
      />
    );
  }

  // ── SUCCESS: tampilkan detail ──
  const signerName = apiResult?.signerName || info.n || "—";
  const signerRole = apiResult?.signerRole || info.r || "—";
  const documentId = apiResult?.documentId || info.d || "—";
  const dateIssued = apiResult?.documentDate || info.t || "—";

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-bg-light px-4 py-16 sm:py-20 lg:py-28">
      <div className="w-full max-w-lg">
        {/* Verified Badge */}
        <div className="mb-8 text-center sm:mb-10">
          <div className="relative mx-auto mb-5 w-fit">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-28 w-28 rounded-full bg-green-50 blur-2xl sm:h-32 sm:w-32" />
            </div>
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-50 shadow-sm sm:h-24 sm:w-24">
              <svg
                className="h-10 w-10 text-green-500 sm:h-12 sm:w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-manrope font-semibold text-green-700 text-xs uppercase tracking-wider">
              Terverifikasi
            </span>
          </div>
          <h1 className="mt-4 font-bold font-bricolage text-2xl text-text-main sm:text-3xl lg:text-4xl">
            {roleLabel(signerRole)}
          </h1>
          <p className="mt-1.5 font-manrope text-sm text-text-muted-custom sm:text-base">
            Tanda tangan digital ini diterbitkan oleh <span className="font-semibold text-brand-navy">MULAI+</span>
          </p>
        </div>

        {/* Detail Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="mb-5 flex items-center gap-3 sm:mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy/10 sm:h-12 sm:w-12">
              <svg
                className="h-5 w-5 text-brand-navy sm:h-6 sm:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-bold font-bricolage text-base text-text-main sm:text-lg">Tanda Tangan Digital</h2>
              <p className="font-manrope text-text-muted-custom text-xs sm:text-sm">
                Summary Report · Laporan Mentoring
              </p>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider sm:text-xs">
                Ditandatangani oleh
              </span>
              <span className="font-bold font-manrope text-sm text-text-main sm:text-base">{signerName}</span>
            </div>
            <div className="h-px bg-gray-50" />
            <div className="flex items-center justify-between">
              <span className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider sm:text-xs">
                Jabatan
              </span>
              <span className="font-manrope font-medium text-sm text-text-main sm:text-base">
                {roleLabel(signerRole)}
              </span>
            </div>
            <div className="h-px bg-gray-50" />
            <div className="flex items-center justify-between">
              <span className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider sm:text-xs">
                ID Dokumen
              </span>
              <span className="font-medium font-mono text-text-main text-xs sm:text-sm">#{documentId}</span>
            </div>
            <div className="h-px bg-gray-50" />
            <div className="flex items-center justify-between">
              <span className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider sm:text-xs">
                Tanggal Terbit
              </span>
              <span className="font-manrope font-medium text-sm text-text-main sm:text-base">{dateIssued}</span>
            </div>
            {apiResult?.totalVerifications && (
              <>
                <div className="h-px bg-gray-50" />
                <div className="flex items-center justify-between">
                  <span className="font-manrope font-semibold text-[11px] text-text-muted-custom uppercase tracking-wider sm:text-xs">
                    Total Verifikasi
                  </span>
                  <span className="font-manrope font-medium text-sm text-text-main sm:text-base">
                    {apiResult.totalVerifications}x
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-center sm:mt-6 sm:py-3.5">
            <div className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 shrink-0 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="font-manrope font-medium text-green-700 text-xs sm:text-sm">
                Dokumen ini asli dan telah diterbitkan oleh MULAI+
              </p>
            </div>
            {apiResult?.verifiedAt && (
              <p className="mt-1 font-manrope text-[10px] text-green-600 sm:text-[11px]">
                Diverifikasi pada{" "}
                {new Date(apiResult.verifiedAt).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jakarta",
                })}{" "}
                WIB
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center font-manrope text-[10px] text-text-muted-custom sm:text-[11px]">
          Verifikasi ini disediakan oleh <span className="font-semibold text-brand-navy">MULAI+</span> — Bimbingan
          Universitas, Jurusan & Beasiswa
        </p>
      </div>
    </div>
  );
}

export default async function VerifySignaturePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!token || token.length < 5) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-bg-light px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-navy/20 border-t-brand-navy" />
            <p className="font-manrope text-sm text-text-muted-custom">Memverifikasi tanda tangan...</p>
          </div>
        </div>
      }
    >
      <VerifyContent token={token} />
    </Suspense>
  );
}
