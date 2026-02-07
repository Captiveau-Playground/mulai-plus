"use client";

import Image from "next/image";

// Mock data for mentors
const MENTORS = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Senior Mentor",
    company: "Harvard University",
    image: "/mentors/1.png",
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Tech Lead",
    company: "Google",
    image: "/mentors/2.png",
  },
  {
    id: 3,
    name: "Jessica Williams",
    role: "Admission Consultant",
    company: "Oxford University",
    image: "/mentors/1.png", // Reusing image for demo
  },
  {
    id: 4,
    name: "David Kim",
    role: "Career Coach",
    company: "McKinsey & Company",
    image: "/mentors/2.png", // Reusing image for demo
  },
];

export function MeetTheMentor() {
  return (
    <section className="w-full bg-white py-16 lg:py-24">
      <div className="container mx-auto px-6 md:px-16">
        {/* Section Header */}
        <div className="mb-12 flex flex-col items-center gap-4 text-center md:mb-16">
          <span className="font-inter font-semibold text-[#FE9114] text-sm tracking-widest md:text-base">
            MEET THE MENTOR
          </span>
          <h2 className="max-w-3xl font-bold font-bricolage text-3xl text-[#1A1F6D] leading-tight md:text-4xl lg:text-5xl">
            Belajar Langsung dari Mereka yang Berpengalaman
          </h2>
          <p className="max-w-2xl font-inter text-[#888888] text-lg md:text-xl">
            Mentor kami berasal dari universitas dan perusahaan terkemuka dunia, siap membimbing langkahmu.
          </p>
        </div>

        {/* Mentors Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MENTORS.map((mentor) => (
            <div
              key={mentor.id}
              className="group relative flex flex-col items-center overflow-hidden rounded-[24px] bg-[#F5F7FA] p-4 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Image Container */}
              <div className="relative mb-4 aspect-[3/4] w-full overflow-hidden rounded-[20px] bg-white">
                <Image
                  src={mentor.image}
                  alt={mentor.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Content */}
              <div className="flex w-full flex-col items-center text-center">
                <h3 className="font-bold font-bricolage text-[#1A1F6D] text-xl">{mentor.name}</h3>
                <span className="font-inter font-medium text-[#FE9114] text-sm">{mentor.role}</span>
                <span className="mt-1 font-inter text-[#888888] text-sm">{mentor.company}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
