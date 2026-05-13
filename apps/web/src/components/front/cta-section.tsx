"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="w-full bg-white py-16 md:py-20 lg:py-24" id="cta">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
        <div className="relative overflow-hidden rounded-none bg-[#1A1F6D] md:rounded-[48px]">
          {/* Grid Pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Image - full bleed behind everything */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <Image src="/cta.webp" alt="" fill className="object-cover object-center" sizes="100vw" priority />
          </div>

          {/* Gradient bridge: biru solid (kiri) → transparan (kanan) */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-0% from-[#1A1F6D] to-100% to-transparent" />

          {/* Mobile: gradasi bottom-up */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-0% from-[#1A1F6D]/80 via-25% via-45% via-[#1A1F6D]/10 via-[#1A1F6D]/30 to-60% to-transparent lg:hidden" />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="relative z-10 flex max-w-2xl flex-col justify-center gap-8 px-6 py-16 md:px-14 md:py-20 lg:px-16 lg:py-28"
          >
            <h2 className="font-bold font-bricolage text-4xl text-white leading-tight tracking-tight md:text-5xl lg:text-[64px] lg:leading-[1.1]">
              Siap Mulai <span className="text-[#FE9114]">Langkah Pertamamu</span>?
            </h2>

            <p className="max-w-lg font-manrope text-[#BFD6FF]/60 text-base leading-relaxed md:text-lg">
              Daftar Mentoring Scholarship sekarang. Mentor berpengalaman, program terstruktur, dan beasiswa untuk masa
              depanmu.
            </p>

            <Link href="#featured-programs">
              <Button className="group h-auto w-fit cursor-pointer rounded-full bg-[#FE9114] px-10 py-5 font-bold font-inter text-base text-white shadow-[#FE9114]/30 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#e68212] hover:shadow-[#FE9114]/40 hover:shadow-xl md:px-12 md:py-6 md:text-xl lg:text-2xl">
                Daftar Sekarang
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 md:h-6 md:w-6" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
