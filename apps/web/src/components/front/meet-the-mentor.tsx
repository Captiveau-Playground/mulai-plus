"use client";

import Image from "next/image";

// Mock data for mentors - 7 cards as requested
const MENTORS = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Senior Mentor",
    image: "/mentors/1.png",
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Tech Lead",
    image: "/mentors/2.png",
  },
  {
    id: 3,
    name: "Jessica Williams",
    role: "Admission Consultant",
    image: "/mentors/1.png",
  },
  {
    id: 4,
    name: "David Kim",
    role: "Career Coach",
    image: "/mentors/2.png",
  },
  {
    id: 5,
    name: "Emily Davis",
    role: "Data Scientist",
    image: "/mentors/1.png",
  },
  {
    id: 6,
    name: "James Wilson",
    role: "Product Manager",
    image: "/mentors/2.png",
  },
  {
    id: 7,
    name: "Anna Martinez",
    role: "UX Researcher",
    image: "/mentors/1.png",
  },
];

export function MeetTheMentor() {
  return (
    <section className="w-full bg-[#1A1F6D] py-16 lg:py-24">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-12 flex flex-col items-center gap-4 text-center md:mb-16">
          <span className="font-inter font-semibold text-[#FE9114] text-lg uppercase tracking-[0.25em] md:text-2xl">
            MEET THE MENTORS
          </span>
          <h2 className="max-w-5xl font-bold font-bricolage text-3xl text-white leading-tight md:text-5xl lg:text-[64px]">
            Belajar Bareng yang Pernah di Posisi Kamu
          </h2>
        </div>

        {/* Mentors Scroll Container */}
        {/* Using a horizontal scroll container to accommodate 7 fixed-width cards */}
        <div className="flex w-full snap-x snap-mandatory gap-9 overflow-x-auto pb-8 [-ms-overflow-style:none] [scrollbar-width:none] lg:justify-center [&::-webkit-scrollbar]:hidden">
          {MENTORS.map((mentor) => (
            <div
              key={mentor.id}
              className="group relative h-[414px] w-[200px] shrink-0 snap-center overflow-hidden rounded-[16px]"
            >
              {/* Background Image */}
              <Image
                src={mentor.image}
                alt={mentor.name}
                fill
                className="object-cover transition-transform duration-500"
              />

              {/* Top White Gradient Overlay (from Figma fill_ZSTGY9) */}
              {/* <div className="absolute inset-0 bg-linear-to-b from-white/50 to-transparent opacity-100 pointer-events-none" /> */}

              {/* Bottom Dark Gradient Overlay (from Figma fill_4VXRF5) */}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-55% via-[#1A1F6D]/0 to-[#1A1F6D]" />

              {/* Content */}
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
