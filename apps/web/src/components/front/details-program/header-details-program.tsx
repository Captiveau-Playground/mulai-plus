"use client";

import Image from "next/image";

interface HeaderDetailsProgramProps {
  title?: string;
  batch?: string;
  startDate?: string;
}

export function HeaderDetailsProgram({
  title = "Mentoring Scholarship Program 2026",
  batch = "BATCH 1",
  startDate = "28 MARET 2026",
}: HeaderDetailsProgramProps) {
  return (
    <section className="relative flex min-h-svh w-full flex-1 flex-col justify-between overflow-hidden bg-white pt-28 md:pt-32 lg:pt-40">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {/* Placeholder: Replace with actual image from Figma export */}
        <Image src="/hero-image.png" alt={`${title} Background`} fill className="object-cover" priority />
        {/* Gradient Overlay */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(-90deg, rgba(254, 145, 20, 0.15) 36%, rgba(249, 52, 71, 0.65) 56%, rgba(26, 31, 109, 0.8) 76%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="container relative z-20 mx-auto flex h-full flex-col px-4 pt-32 pb-16 md:px-8 lg:pt-32">
        {/* Top Section: Welcome & Title */}
        <div className="flex flex-col items-start gap-4">
          <p className="font-manrope font-normal text-lg text-white tracking-[0.15em] md:text-2xl lg:text-4xl">
            WELCOME TO
          </p>
          <h1 className="w-[60%] font-bold font-bricolage text-5xl text-white leading-none md:text-7xl lg:text-[96px]">
            {title}
          </h1>
        </div>

        {/* Bottom Section: Label & Date */}
        <div className="mt-12 flex flex-col items-start gap-6">
          {/* Label */}
          <div className="inline-flex items-center justify-center rounded-2xl bg-[#F93447] px-6 py-4 shadow-lg">
            <span className="font-bold font-manrope text-2xl text-white leading-none tracking-[-0.05em] md:text-4xl lg:text-[48px]">
              {batch}
            </span>
          </div>
          {/* Date */}
          <p className="font-manrope font-normal text-base text-white tracking-[0.15em] md:text-xl lg:text-2xl">
            {startDate}
          </p>
        </div>
      </div>
    </section>
  );
}
