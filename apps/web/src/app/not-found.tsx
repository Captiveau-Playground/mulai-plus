import type { Route } from "next";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      {/* Large decorative 404 */}
      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 rounded-full bg-brand-navy/5 blur-3xl" />
        </div>
        <div className="relative flex items-center justify-center">
          <span className="font-bold font-bricolage text-[10rem] text-brand-navy/10 leading-none sm:text-[14rem]">
            404
          </span>
        </div>
      </div>

      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-orange/10">
        <svg
          className="h-8 w-8 text-brand-orange"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      </div>

      {/* Title */}
      <h1 className="mb-2 font-bold font-bricolage text-3xl text-text-main sm:text-4xl">Halaman Tidak Ditemukan</h1>

      {/* Description */}
      <p className="mb-8 max-w-md text-center font-manrope text-base text-text-muted-custom">
        Halaman yang Anda cari tidak tersedia atau telah dipindahkan. Silakan periksa kembali URL atau kembali ke
        beranda.
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={"/" as Route}
          className="btn-brand-navy flex items-center justify-center gap-2 rounded-full px-8 py-4 font-bold font-manrope text-sm shadow-md transition-all hover:translate-y-[-1px] hover:shadow-lg"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
          </svg>
          Kembali ke Beranda
        </Link>

        <Link
          href={"#featured-programs" as Route}
          className="flex items-center justify-center gap-2 rounded-full border border-gray-200 px-8 py-4 font-manrope font-medium text-sm text-text-main transition-all hover:border-brand-navy/30 hover:bg-brand-navy/5"
        >
          Lihat Program
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>

      {/* Footer hint */}
      <p className="mt-12 font-manrope text-text-muted-custom text-xs">
        MULAI+ — Mulai dari sini, tumbuh bersama kami.
      </p>
    </div>
  );
}
