"use client";

import { CheckCircle2, ChevronDown, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

const WA_LINK =
  "https://wa.me/6285730367310?text=Halo%20MULAI%2B%2C%20saya%20ingin%20jadwalkan%20demo%20Test%20Minat%20Bakat%20untuk%20sekolah%20kami";
const LOGIN_CB = "/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment";

export function AssessmentPricingSection() {
  return (
    <section aria-label="Registrasi" className="mx-auto max-w-7xl bg-white px-5 py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-bold font-manrope text-mentor-teal text-xs uppercase tracking-widest">Registrasi</p>
        <h2 className="mt-2 font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">
          Gratis untuk Kamu, Demo untuk Sekolah
        </h2>
        <p className="mt-3 font-manrope text-gray-500">Dua jalur, satu tujuan: siswa yang lebih paham arahnya.</p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {/* B2C */}
        <div className="flex flex-col rounded-[2rem] border-2 border-mentor-teal/30 bg-white p-7 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-mentor-teal/10 px-3 py-1 font-bold font-manrope text-[11px] text-teal-700">
              UNTUK DIRI SENDIRI
            </span>
            <span className="rounded-full bg-green-100 px-3 py-1 font-bold font-manrope text-[11px] text-green-700">
              GRATIS
            </span>
          </div>
          <h3 className="mt-4 font-bold font-bricolage text-gray-900 text-xl">Siswa & Umum</h3>
          <p className="mt-2 font-manrope text-gray-500 text-sm">Ikuti test mandiri, dapat rekomendasi langsung.</p>
          <ul className="mt-4 space-y-2">
            {["Tanpa biaya, tanpa kartu", "Hasil instan + AI summary", "Laporan PDF", "Bisa diulang kapan saja"].map(
              (t) => (
                <li key={t} className="flex items-center gap-2 font-manrope text-gray-600 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-mentor-teal" /> {t}
                </li>
              ),
            )}
          </ul>
          <div className="flex-1" />
          <Link
            href={LOGIN_CB}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-4 font-bold font-bricolage text-white shadow-md transition-all hover:bg-brand-navy-light active:scale-[0.98]"
          >
            Daftar & Mulai Gratis
          </Link>
        </div>

        {/* B2B */}
        <div className="relative flex flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-navy to-brand-navy-light p-7 text-white shadow-xl">
          <div
            className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-brand-orange/20 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-1 flex-col">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-400/20 px-3 py-1 font-bold font-manrope text-[11px] text-amber-300">
                UNTUK SEKOLAH / INSTITUSI
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 font-bold font-manrope text-[11px] text-white/80">
                DEMO DULU
              </span>
            </div>
            <h3 className="mt-4 font-bold font-bricolage text-xl">Sekolah & Lembaga</h3>
            <p className="mt-2 font-manrope text-sm text-white/70">
              Kelola batch test khusus sekolahmu, pantau hasil seluruh siswa, dan dapatkan rekap analitik.
            </p>
            <ul className="mt-4 space-y-2">
              {[
                "Batch test per kelas/jurusan",
                "Undangan via link, QR, atau email",
                "Dashboard progres siswa",
                "Rekap & analitik distribusi minat",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 font-manrope text-sm text-white/80">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-300" /> {t}
                </li>
              ))}
            </ul>
            <div className="flex-1" />
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5" /> Jadwalkan Demo via WhatsApp
            </a>
            <p className="mt-3 text-center font-manrope text-[11px] text-white/50">
              Tim kami akan menghubungimu untuk penjadwalan demo & kerjasama.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AssessmentFaq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section aria-label="FAQ" className="mx-auto max-w-7xl bg-white px-5 py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-bold font-manrope text-mentor-teal text-xs uppercase tracking-widest">FAQ</p>
        <h2 className="mt-2 font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">
          Pertanyaan yang Sering Diajukan
        </h2>
      </div>

      <div className="mx-auto mt-10 max-w-3xl space-y-3">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-bold font-bricolage text-gray-900">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-mentor-teal transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen && (
                <div className="border-gray-100 border-t px-5 py-4">
                  <p className="font-manrope text-gray-500 text-sm leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
