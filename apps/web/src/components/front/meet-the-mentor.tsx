"use client";

import Image from "next/image";

// Mock data for mentors - 7 cards as requested
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
  {
    id: 6,
    name: "Hariz",
    role: "PENS",
    image: "/mentors/haris.webp",
  },
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
    <section className="w-full overflow-hidden bg-[#1A1F6D] py-16 lg:py-24" id="mentors">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Section Header */}
        <div className="mb-12 flex flex-col items-center gap-4 text-center md:mb-16">
          <span className="font-inter font-semibold text-[#FE9114] text-lg uppercase tracking-[0.25em] md:text-2xl">
            MEET THE MENTORS
          </span>
          <h2 className="max-w-5xl font-bold font-bricolage text-3xl text-white leading-tight md:text-5xl lg:text-[64px]">
            Belajar Bareng yang Pernah di Posisi Kamu
          </h2>
        </div>

        <div className="marquee relative w-full overflow-hidden rounded-lg pb-8">
          <div className="marquee__inner flex w-max gap-6">
            {MENTORS.concat(MENTORS).map((mentor, index) => (
              <div
                key={`${mentor.id}-${index}`}
                aria-hidden={index >= MENTORS.length}
                className="group relative h-112 w-48 shrink-0 overflow-hidden rounded-2xl"
              >
                <Image
                  src={mentor.image}
                  alt={mentor.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-55% via-[#1A1F6D]/0 to-[#1A1F6D]" />

                <div className="absolute right-4 bottom-7.5 left-4 z-10 flex flex-col items-start text-left">
                  <h3 className="font-inter font-semibold text-2xl text-white leading-[1.2]">{mentor.name}</h3>
                  <span className="mt-1 font-[0.75rem] font-inter text-white/75 italic">{mentor.role}</span>
                </div>
              </div>
            ))}
          </div>

          <style jsx>{`
            .marquee__inner {
              animation: marquee-scroll 35s linear infinite;
            }

            @keyframes marquee-scroll {
              from {
                transform: translateX(0);
              }
              to {
                transform: translateX(-50%);
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .marquee__inner {
                animation: none;
              }
            }
          `}</style>
        </div>
      </div>
    </section>
  );
}
