"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative flex min-h-svh w-full flex-1 flex-col justify-between overflow-hidden bg-white pt-40">
      {/* Hero Content */}
      <div className="relative z-10 mx-auto flex max-w-[1052px] flex-col items-center gap-14 text-center">
        <div className="flex flex-col items-center gap-6">
          <h1 className="font-bold font-bricolage text-[#1A1F6D] text-[92px] leading-none tracking-tight">
            Start where you are.
            <br />
            Grow from here.
          </h1>
          <p className="max-w-[993px] font-manrope text-2xl text-[#888888]">
            MULAI+ membimbingmu memilih universitas dan jurusan yang tepat. Bersama mentor berpengalaman, temukan masa
            depan yang sesuai dengan impianmu.
          </p>
        </div>

        <Button className="rounded-full border-none bg-linear-to-r from-[#F93447] to-[#FE9114] px-9 py-6 font-bold font-inter text-base text-white hover:opacity-90">
          Daftar Sekarang
        </Button>
      </div>

      {/* Background Image Placeholder */}
      <div className="absolute bottom-0 left-0 z-20 h-[80%] min-w-full">
        <Image src="/hero-image.png" alt="Hero Background" fill className="object-cover object-bottom" priority />
      </div>
    </section>
  );
}
