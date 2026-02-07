"use client";

import { GraduationCap, Network, Users } from "lucide-react";
import Image from "next/image";

export function AboutUs() {
  return (
    <section className="w-full bg-white py-16 lg:pb-32">
      <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-0">
        <div className="flex flex-col gap-16 lg:flex-row lg:items-center lg:gap-20">
          {/* Left Content */}
          <div className="flex flex-1 flex-col gap-10">
            {/* Header Group */}
            <div className="flex flex-col gap-6">
              <span className="font-inter font-semibold text-[#FE9114] text-sm tracking-widest md:text-base">
                ABOUT MULAI+
              </span>
              <div className="flex flex-col gap-6">
                <h2 className="font-bold font-bricolage text-4xl text-[#1A1F6D] leading-tight md:text-5xl lg:text-[64px]">
                  Bimbingan Nyata Untuk Keputusan Masa Depanmu
                </h2>
                <p className="max-w-2xl font-inter text-[#888888] text-lg md:text-xl lg:text-2xl">
                  MULAI+ menyediakan ruang untuk tumbuh dan berkembang dengan bimbingan mentor yang peduli dengan
                  perjalananmu.
                </p>
              </div>
            </div>

            {/* Points */}
            <div className="flex flex-col gap-6">
              {[
                {
                  icon: Users,
                  text: "Mentoring Personal Dari Para Ahli",
                  bg: "bg-[#F7EDE1]",
                  color: "text-[#FE9114]",
                },
                {
                  icon: GraduationCap,
                  text: "Panduan Memilih Universitas dan Jurusan",
                  bg: "bg-[#F6E2E5]",
                  color: "text-[#F93447]",
                },
                {
                  icon: Network,
                  text: "Komunitas Supportive & Networking",
                  bg: "bg-[#E0E0E9]",
                  color: "text-[#1A1F6D]",
                },
              ].map((point, index) => (
                <div key={index} className="flex items-center gap-6">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${point.bg}`}>
                    <point.icon className={`h-6 w-6 ${point.color}`} />
                  </div>
                  <span className="font-inter text-[#333333] text-lg md:text-xl lg:text-2xl">{point.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Images & Stats */}
          <div className="flex flex-1 justify-center lg:justify-end">
            <div className="flex flex-1 gap-4 sm:gap-6 md:gap-9">
              {/* Column 1 */}
              <div className="flex flex-1 flex-col gap-4 sm:gap-6 md:gap-9">
                <div className="relative h-[280px] w-full overflow-hidden rounded-2xl sm:h-[360px] sm:w-[220px] md:h-[454px] md:w-full">
                  <Image src="/about-us/image-1.png" alt="Mentoring Session" fill className="object-cover" />
                </div>
                <div className="flex h-[100px] w-full flex-col items-center justify-center rounded-2xl bg-[#FE9114] text-white sm:h-[120px] sm:w-[220px] md:h-[151px] md:w-full">
                  <span className="font-bold font-bricolage text-3xl md:text-5xl">500+</span>
                  <span className="font-inter font-medium text-sm md:text-xl">Siswa Berhasil</span>
                </div>
              </div>

              {/* Column 2 - Offset Top */}
              <div className="flex flex-1 flex-col gap-4 pt-12 sm:gap-6 sm:pt-16 md:gap-9 md:pt-24">
                <div className="flex h-[100px] w-full flex-col items-center justify-center rounded-2xl bg-[#F93447] text-white sm:h-[120px] sm:w-[220px] md:h-[151px] md:w-full">
                  <span className="font-bold font-bricolage text-3xl md:text-5xl">50+</span>
                  <span className="font-inter font-medium text-sm md:text-xl">Mentor Global</span>
                </div>
                <div className="relative h-[280px] w-full overflow-hidden rounded-2xl sm:h-[360px] sm:w-[220px] md:h-[454px] md:w-full">
                  <Image src="/about-us/image-2.png" alt="Global Community" fill className="object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
