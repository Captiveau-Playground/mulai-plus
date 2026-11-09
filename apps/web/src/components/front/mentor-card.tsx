"use client";

import { ArrowUpRight, BadgeCheck, Briefcase, GraduationCap, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function menteeLabel(n: number) {
  if (!n) return null;
  return n < 10 ? `${n} mentee` : `${Math.floor(n / 10) * 10}+ mentee`;
}

/**
 * Kartu mentor gaya design system MULAI+:
 * foto 3:4 penuh (tajam), overlay gradient, badge kampus kaca di atas,
 * dan panel info "melayang" yang menumpuk foto (bukan kartu foto-kecil-di-atas-teks).
 */
export function MentorCard({ m }: { m: any }) {
  const mentee = menteeLabel(m.menteeCount ?? 0);
  return (
    <Link
      href={`/mentors/${m.slug ?? m.id}` as any}
      className="group relative block overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_-24px_rgba(13,148,136,0.45)] hover:ring-teal-500/30"
    >
      {/* Foto */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
        {m.image ? (
          <Image
            src={m.image}
            alt={m.name}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 300px"
            className="object-cover object-top transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-teal-50">
            <GraduationCap className="h-14 w-14 text-teal-300" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/25 to-transparent" />

        {/* Badge kampus (kaca) */}
        {m.kampus && (
          <span className="absolute top-3 left-3 inline-flex max-w-[82%] items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 font-manrope font-semibold text-[10px] text-brand-navy shadow-sm ring-1 ring-white/60 backdrop-blur">
            <GraduationCap className="h-3 w-3 shrink-0 text-teal-600" />
            <span className="truncate">{m.kampus}</span>
          </span>
        )}

        {/* Verified mini */}
        <span
          title="Verified Mentor by MULAI+"
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-teal-600 shadow-sm ring-1 ring-white/60 backdrop-blur"
        >
          <BadgeCheck className="h-4 w-4" />
        </span>

        {/* Nama di bawah foto */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-8">
          <p className="font-bold font-bricolage text-lg text-white leading-tight tracking-tight">{m.name}</p>
          <p className="mt-0.5 line-clamp-1 font-manrope text-[11px] text-white/75">{m.jurusan || "Mentor MULAI+"}</p>
        </div>
      </div>

      {/* Panel info melayang */}
      <div className="relative mx-3 -mt-6 mb-3 rounded-2xl bg-white/95 p-3 shadow-sm ring-1 ring-gray-100 backdrop-blur">
        {m.bidangPekerjaan ? (
          <p className="flex items-start gap-1.5 font-manrope text-[11px] text-gray-600 leading-snug">
            <Briefcase className="mt-0.5 h-3 w-3 shrink-0 text-teal-600" />
            <span className="line-clamp-2">{m.bidangPekerjaan}</span>
          </p>
        ) : (
          <p className="font-manrope text-[11px] text-gray-400">Mentor aktif MULAI+</p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-1.5">
            {mentee && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-manrope font-semibold text-[10px] text-teal-700">
                <Users className="h-2.5 w-2.5" /> {mentee}
              </span>
            )}
            {m.tahunMasuk && (
              <span className="truncate font-manrope text-[10px] text-gray-400">Angkatan {m.tahunMasuk}</span>
            )}
          </div>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white transition-all duration-300 group-hover:rotate-45 group-hover:bg-teal-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
