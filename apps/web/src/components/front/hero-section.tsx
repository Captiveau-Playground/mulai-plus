"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative flex min-h-svh w-full flex-1 flex-col justify-between overflow-hidden bg-white pt-28 md:pt-32 lg:pt-40">
      {/* Hero Content */}
      <div className="container relative z-30 mx-auto flex max-w-263 flex-col items-start gap-6 px-4 text-center md:gap-8 md:px-6 lg:items-center lg:gap-10 lg:px-0">
        <div className="flex flex-col items-start gap-4 md:gap-6 lg:items-center">
          <h1 className="text-left font-bold font-bricolage text-4xl text-[#1A1F6D] leading-none tracking-tight md:text-7xl lg:text-center lg:text-[92px]">
            Start where you are.
            <br />
            Grow from here.
          </h1>
          <p className="max-w-248.25 text-left font-manrope text-[#888888] text-lg md:text-xl lg:text-center lg:text-2xl">
            MULAI+ membimbingmu memilih universitas dan jurusan yang tepat. Bersama mentor berpengalaman, temukan masa
            depan yang sesuai dengan impianmu.
          </p>
        </div>

        <Link href="#featured-programs">
          <Button className="rounded-full border-none bg-linear-to-r from-[#F93447] to-[#FE9114] px-9 py-6 font-bold font-inter text-base text-white hover:opacity-90">
            Daftar Sekarang
          </Button>
        </Link>
      </div>

      {/* Background Image Placeholder */}
      <div className="absolute bottom-0 left-0 z-20 h-[90%] w-full">
        <Image
          src="/hero-image.webp"
          alt="Hero Background"
          fill
          className="object-cover object-bottom"
          priority
          sizes="100vw"
        />
      </div>
    </section>
  );
}
