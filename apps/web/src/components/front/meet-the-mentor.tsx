"use client";

import Image from "next/image";

// Mock data for mentors - 7 cards as requested
const MENTORS = [
  {
    id: 1,
    name: "Nimitta",
    role: "Universitas Brawijaya",
    image: "/mentors/nimitta.jpg",
  },
  {
    id: 2,
    name: "Andhani",
    role: "Universitas Brawijaya",
    image: "/mentors/andani.jpg",
  },
  {
    id: 3,
    name: "Billy",
    role: "Universitas Airlangga",
    image: "/mentors/billy.jpg",
  },
  {
    id: 4,
    name: "Salma",
    role: "Universitas Gajah Mada",
    image: "/mentors/salma.jpg",
  },
  {
    id: 5,
    name: "Nailir",
    role: "Universitas Negeri Semarang",
    image: "/mentors/nelly.jpg",
  },
  {
    id: 6,
    name: "Hariz",
    role: "PENS",
    image: "/mentors/haris.jpg",
  },
  {
    id: 7,
    name: "Febby",
    role: "UPN Veteran Jatim",
    image: "/mentors/febby.jpg",
  },
  {
    id: 8,
    name: "Addina",
    role: "Universitas Airlangga",
    image: "/mentors/addina.jpg",
  },
];

export function MeetTheMentor() {
  return (
    <section className="w-full overflow-hidden bg-[#1A1F6D] py-16 lg:py-24">
      <div className="container mx-auto max-w-7xl px-4 md:px-8">
        {/* Section Header */}
        <div className="mb-12 flex flex-col items-center gap-4 text-center md:mb-16">
          <span className="font-inter font-semibold text-[#FE9114] text-lg uppercase tracking-[0.25em] md:text-2xl">
            MEET THE MENTORS
          </span>
          <h2 className="max-w-5xl font-bold font-bricolage text-3xl text-white leading-tight md:text-5xl lg:text-[64px]">
            Belajar Bareng yang Pernah di Posisi Kamu
          </h2>
        </div>

        <div className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto pb-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MENTORS.map((mentor) => (
            <div
              key={mentor.id}
              className="group relative h-[414px] w-[200px] shrink-0 snap-center overflow-hidden rounded-[16px]"
            >
              <Image
                src={mentor.image}
                alt={mentor.name}
                fill
                className="object-cover transition-transform duration-500"
              />

              <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-55% via-[#1A1F6D]/0 to-[#1A1F6D]" />

              <div className="absolute right-4 bottom-[30px] left-4 z-10 flex flex-col items-start text-left">
                <h3 className="font-inter font-semibold text-2xl text-white leading-[1.2]">{mentor.name}</h3>
                <span className="mt-1 font-inter font-normal text-base text-white/75">{mentor.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
