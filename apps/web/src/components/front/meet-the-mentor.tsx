"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const MENTORS = [
  {
    id: 1,
    name: "Nimitta",
    role: "Universitas Brawijaya",
    image: "/mentors/nimitta.webp",
  },
  {
    id: 2,
    name: "Andhani",
    role: "Universitas Brawijaya",
    image: "/mentors/andani.webp",
  },
  {
    id: 3,
    name: "Billy",
    role: "Universitas Airlangga",
    image: "/mentors/billy.webp",
  },
  {
    id: 4,
    name: "Salma",
    role: "Universitas Gajah Mada",
    image: "/mentors/salma.webp",
  },
  {
    id: 5,
    name: "Nailir",
    role: "Universitas Negeri Semarang",
    image: "/mentors/nelly.webp",
  },
  { id: 6, name: "Hariz", role: "PENS", image: "/mentors/haris.webp" },
  {
    id: 7,
    name: "Febby",
    role: "UPN Veteran Jatim",
    image: "/mentors/febby.webp",
  },
  {
    id: 8,
    name: "Addina",
    role: "Universitas Airlangga",
    image: "/mentors/addina.webp",
  },
  {
    id: 9,
    name: "Dita",
    role: "UPN Veteran Jatim",
    image: "/mentors/dita.webp",
  },
  {
    id: 10,
    name: "Naily",
    role: "Universitas Gajah Mada",
    image: "/mentors/naily.webp",
  },
];

export function MeetTheMentor() {
  return (
    <section aria-label="Temui Mentor" className="w-full overflow-hidden bg-brand-navy py-16 lg:py-24" id="mentors">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        {/* Section Header */}
        <div className="mb-10 flex flex-col items-center gap-4 text-center md:mb-14">
          <span className="font-manrope font-semibold text-brand-orange text-lg uppercase tracking-[0.25em] md:text-2xl">
            MEET THE MENTORS
          </span>
          <h2 className="max-w-4xl font-bold font-bricolage text-3xl text-white leading-tight md:text-5xl lg:text-[64px]">
            Belajar Bareng yang Pernah di Posisi Kamu
          </h2>
          <p className="max-w-xl font-manrope text-base text-text-lighter-blue/60 leading-relaxed md:text-lg">
            10+ mentor dari berbagai universitas terbaik siap bimbing kamu 1-on-1, dari pemilihan jurusan sampai
            strategi masuk PTN.
          </p>
        </div>

        {/* Marquee */}
        <div className="marquee group relative w-full overflow-hidden rounded-lg pb-8">
          <div className="marquee__inner flex w-max gap-5 transition-all duration-700 group-hover:[animation-play-state:paused]">
            {MENTORS.concat(MENTORS).map((mentor, index) => (
              <div
                key={`${mentor.id}-${index}`}
                aria-hidden={index >= MENTORS.length}
                className="group/card relative h-64 w-44 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm md:h-96 md:w-56"
              >
                {/* Logo watermark */}
                <div className="pointer-events-none absolute top-3 right-3 z-10 opacity-20">
                  <Image src="/letter-icon-logo.svg" alt="" width={80} height={20} className="md:w-24" />
                </div>

                <Image
                  src={mentor.image}
                  alt={mentor.name}
                  fill
                  className="object-cover transition-all duration-500 group-hover/card:scale-105"
                  sizes="(max-width: 640px) 40vw, 224px"
                />

                {/* Bottom overlay — navy fade for premium contrast */}
                <div className="pointer-events-none absolute right-0 bottom-0 left-0 bg-gradient-to-t from-brand-navy/80 via-brand-navy/60 to-transparent px-4 pt-12 pb-3 md:pt-16 md:pb-4">
                  <h3 className="truncate font-manrope font-semibold text-white text-xl leading-tight md:text-2xl">
                    {mentor.name}
                  </h3>
                  <span className="truncate font-manrope font-medium text-text-light-blue text-xs leading-snug md:text-sm">
                    {mentor.role}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <style>{`
            .marquee__inner {
              animation: marquee-scroll 35s linear infinite;
              will-change: transform;
            }
            @keyframes marquee-scroll {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            @media (prefers-reduced-motion: reduce) {
              .marquee__inner { animation: none; }
            }
          `}</style>
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <Link href="/programs">
            <button
              type="button"
              className="group inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-white/20 px-8 py-4 font-bold font-manrope text-sm text-white transition-all duration-300 hover:border-white/40 hover:bg-white/10 active:scale-[0.98] md:px-10 md:py-4 md:text-base"
            >
              Lihat Semua Mentor &amp; Program
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
