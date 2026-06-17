"use client";

import { motion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section aria-label="Ajakan Bertindak" className="w-full bg-white py-16 md:py-20 lg:py-24" id="cta">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-6">
        <div className="relative overflow-hidden rounded-none bg-brand-navy md:rounded-[48px]">
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

          {/* Gradient overlay: solid navy (kiri) → transparan (kanan) */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-brand-navy via-brand-navy/80 to-transparent" />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="relative z-10 flex max-w-2xl flex-col justify-center gap-8 px-6 py-16 md:px-14 md:py-20 lg:px-16 lg:py-28"
          >
            <h2 className="font-bold font-bricolage text-4xl text-white leading-tight tracking-tight md:text-5xl lg:text-[64px] lg:leading-[1.1]">
              Siap Mulai <span className="text-brand-orange">Langkah Pertamamu</span>?
            </h2>

            <p className="max-w-lg font-manrope text-base text-text-lighter-blue/60 leading-relaxed md:text-lg">
              Daftar Mentoring Scholarship sekarang. Mentor berpengalaman, program terstruktur, dan beasiswa untuk masa
              depanmu.
            </p>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link href="#featured-programs">
                <Button className="group h-auto w-fit cursor-pointer rounded-full bg-brand-orange px-8 py-4 font-bold font-manrope text-base text-white shadow-brand-orange/25 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-brand-orange/90 hover:shadow-brand-orange/35 hover:shadow-xl active:scale-[0.98] md:px-12 md:py-5 md:text-lg">
                  Daftar Sekarang
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <a
                href="https://wa.me/6285730367310?text=Halo%20MULAI+%2C%20saya%20ingin%20tanya%20tentang%20program%20mentoring"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border-2 border-white/20 px-8 py-4 font-manrope font-semibold text-sm text-white/80 transition-all duration-300 hover:border-white/40 hover:bg-white/10 hover:text-white active:scale-[0.98] md:px-10 md:py-5 md:text-base"
              >
                <MessageCircle className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                Tanya via WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
