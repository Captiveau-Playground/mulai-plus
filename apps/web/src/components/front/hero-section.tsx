"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion } from "framer-motion";
import { BookOpen, ChevronDown, GraduationCap, MapPin, MessageCircleMore } from "lucide-react";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

function StatPill({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-brand-navy/5 px-3.5 py-1.5 font-manrope text-text-muted text-xs md:px-5 md:py-2 md:text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 text-brand-orange" />
      <span className="font-semibold text-brand-navy">{value}</span>
      <span className="text-text-muted/60">{label}</span>
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      aria-label="Hero"
      className="relative flex min-h-[90svh] w-full flex-col overflow-hidden bg-white pt-20 pb-8 md:min-h-svh md:pt-28 md:pb-12 lg:pt-36 lg:pb-16"
    >
      {/* ── Decorative orbs (solid, no gradient) ── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute -top-24 -right-24 h-[250px] w-[250px] rounded-full opacity-[0.08] md:-top-32 md:-right-32 md:h-[350px] md:w-[350px]"
          style={{ background: "var(--brand-orange)" }}
        />
        <div
          className="absolute -bottom-20 -left-20 h-[200px] w-[200px] rounded-full opacity-[0.05] md:-bottom-28 md:-left-28 md:h-[280px] md:w-[280px]"
          style={{ background: "var(--brand-navy)" }}
        />
      </div>

      <div className="container relative z-10 mx-auto flex max-w-7xl flex-1 flex-col justify-center gap-6 px-4 md:grid md:grid-cols-2 md:items-center md:gap-12 md:px-6 lg:px-6">
        {/* Left column: content */}
        <div className="flex flex-col gap-6 md:gap-8">
          {/* ── Eyebrow ── */}
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/20 bg-brand-orange/5 px-3.5 py-1.5 font-manrope font-medium text-[11px] text-brand-orange tracking-wide">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-orange" />
              </span>
              Bimbingan Universitas &amp; Beasiswa
            </span>
          </motion.div>

          {/* ── Heading ── */}
          <motion.h1
            custom={0.1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="max-w-3xl font-bold font-bricolage text-3xl text-brand-navy leading-[1.08] tracking-tight md:text-5xl lg:text-[72px] lg:leading-[1.05]"
          >
            <span className="text-brand-red">Temukan Jurusan &amp; PTN</span> Impianmu dengan Data Real-time &amp;
            Mentor Personal
          </motion.h1>

          {/* ── Description ── */}
          <motion.p
            custom={0.2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="max-w-xl font-manrope text-base text-text-muted leading-relaxed md:text-lg lg:text-xl"
          >
            Ribuan data passing grade, akreditasi, dan mentor 1-on-1 yang siap bimbing kamu menentukan masa depan.
          </motion.p>

          {/* ── Stats Row ── */}
          <motion.div
            custom={0.3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex flex-wrap items-center gap-2 md:gap-3"
          >
            <StatPill icon={GraduationCap} value="10k+" label="Program Studi" />
            <StatPill icon={MapPin} value="335+" label="Universitas" />
            <StatPill icon={BookOpen} value="38" label="Provinsi" />
          </motion.div>

          {/* ── CTAs ── */}
          <motion.div
            custom={0.4}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center"
          >
            <Link href="#featured-programs" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full cursor-pointer rounded-full bg-brand-red px-8 py-4 font-bold font-manrope text-base text-white shadow-brand-red/25 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-brand-red/90 hover:shadow-xl active:scale-[0.98] sm:px-10 sm:py-4"
              >
                Cari Program Mentoring
              </button>
            </Link>

            <Link href="/explore" className="w-full sm:w-auto">
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-brand-navy/15 px-8 py-4 font-bold font-manrope text-base text-brand-navy transition-all duration-300 hover:border-brand-navy/30 hover:bg-brand-navy/5 active:scale-[0.98] sm:px-10 sm:py-4"
              >
                <MessageCircleMore className="h-4 w-4" />
                Lihat Universitas
              </button>
            </Link>
          </motion.div>
        </div>

        {/* Right column: Lottie animation (hidden on mobile) */}
        <motion.div
          custom={0.2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="hidden md:flex md:items-center md:justify-center"
        >
          <div className="h-72 w-72 md:h-[320px] md:w-[320px] lg:h-[500px] lg:w-[500px] xl:h-[600px] xl:w-[600px]">
            <DotLottieReact
              src="https://lottie.host/46206dbd-ed4a-4090-9805-93d7a9390349/AlQyQScXbD.lottie"
              loop
              autoplay
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </motion.div>

        {/* ── Scroll Indicator ── */}
        <motion.div
          custom={0.5}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-4 flex items-center gap-2 font-manrope text-text-muted/50 text-xs md:col-span-2 md:mt-6"
        >
          <span className="animate-bounce">
            <ChevronDown className="h-4 w-4" />
          </span>
          Scroll untuk lihat program
        </motion.div>
      </div>

      {/* Background Image */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[55%] w-full bg-white md:h-[65%] lg:h-[75%]" />
    </section>
  );
}
