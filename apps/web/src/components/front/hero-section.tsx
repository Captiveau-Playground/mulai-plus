"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const imageReveal = {
  hidden: { scale: 1.12, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export function HeroSection() {
  return (
    <section className="relative flex min-h-svh w-full flex-1 flex-col justify-between overflow-hidden bg-white pt-28 md:pt-32 lg:pt-40">
      {/* Hero Content */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container relative z-30 mx-auto flex max-w-263 flex-col items-start gap-6 px-4 text-center md:gap-8 md:px-6 lg:items-center lg:gap-10 lg:px-0"
      >
        <div className="flex flex-col items-start gap-4 md:gap-6 lg:items-center">
          <motion.h1
            variants={item}
            className="text-left font-bold font-bricolage text-4xl text-[#1A1F6D] leading-none tracking-tight md:text-7xl lg:text-center lg:text-[92px]"
          >
            Start where you are.
            <br />
            Grow from here.
          </motion.h1>
          <motion.p
            variants={item}
            className="max-w-248.25 text-left font-manrope text-[#888888] text-lg md:text-xl lg:text-center lg:text-2xl"
          >
            MULAI+ membimbingmu memilih universitas dan jurusan yang tepat. Bersama mentor berpengalaman, temukan masa
            depan yang sesuai dengan impianmu.
          </motion.p>
        </div>

        <motion.div variants={item}>
          <Link href="#featured-programs">
            <Button className="rounded-full border-none bg-linear-to-r from-[#F93447] to-[#FE9114] px-9 py-6 font-bold font-inter text-base text-white hover:opacity-90">
              Daftar Sekarang
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Background Image */}
      <motion.div
        variants={imageReveal}
        initial="hidden"
        animate="show"
        className="absolute bottom-0 left-0 z-20 h-[90%] w-full"
      >
        <Image
          src="/hero-image.webp"
          alt="Hero Background"
          fill
          className="object-cover object-bottom"
          priority
          sizes="100vw"
        />
      </motion.div>
    </section>
  );
}
