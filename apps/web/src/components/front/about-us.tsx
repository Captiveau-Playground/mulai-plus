"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, Users } from "lucide-react";
import Image from "next/image";

const fadeUpLeft = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const fadeUpRight = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

function StatCard({
  icon: Icon,
  value,
  label,
  accent,
  delay,
}: {
  icon: any;
  value: string;
  label: string;
  accent: "orange" | "red";
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className={`group relative overflow-hidden rounded-2xl p-6 text-white sm:p-8 ${
        accent === "orange" ? "bg-brand-orange" : "bg-brand-red"
      }`}
    >
      {/* Decorative circle */}
      <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 transition-all duration-500 group-hover:scale-150" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-16 w-16 rounded-full bg-white/5 transition-all duration-500 group-hover:scale-150" />

      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold font-bricolage text-3xl md:text-5xl">{value}</span>
        <span className="font-manrope font-medium text-sm text-white/80 md:text-xl">{label}</span>
      </div>
    </motion.div>
  );
}

export function AboutUs() {
  return (
    <section aria-label="Tentang MULAI+" className="relative w-full bg-white py-16 lg:pb-32" id="about">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-navy/[0.02] blur-[100px]" />
      </div>

      <div className="container relative mx-auto max-w-7xl px-4 md:px-6 lg:px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col gap-16 lg:flex-row lg:items-center lg:gap-20"
        >
          {/* Left Content */}
          <motion.div variants={fadeUpLeft} className="flex flex-1 flex-col gap-8">
            {/* Header Group */}
            <div className="flex flex-col gap-5">
              <span className="inline-flex items-center gap-2 font-manrope font-semibold text-brand-orange text-sm tracking-widest md:text-base">
                <span className="h-px w-6 bg-brand-orange" />
                ABOUT MULAI+
              </span>
              <h2 className="font-bold font-bricolage text-4xl text-brand-navy leading-tight md:text-5xl lg:text-[64px]">
                Bimbingan Nyata Untuk <span className="text-brand-red">Keputusan Masa Depanmu</span>
              </h2>
            </div>

            {/* Content Text — concise, scannable */}
            <div className="flex flex-col gap-4 font-manrope text-base text-text-muted leading-relaxed md:text-lg">
              <p>
                <span className="font-semibold text-brand-navy">Bingung milih jurusan?</span> MULAI+ adalah platform
                pendampingan terstruktur yang bantu kamu mengambil keputusan akademik — dengan data real-time, mentor
                1-on-1, dan strategi yang terbukti.
              </p>
              <p>
                Bukan sekadar motivasi. Kami hadirkan sistem, refleksi, dan rencana masuk PTN yang matang. Tempat di
                mana kebingungan diolah jadi kejelasan, dan keraguan diubah jadi keputusan.
              </p>
            </div>
          </motion.div>

          {/* Right Content - Images & Stats */}
          <motion.div variants={fadeUpRight} className="flex flex-1 justify-center lg:justify-end">
            <div className="flex flex-1 gap-4 sm:gap-6 md:gap-9">
              {/* Column 1 */}
              <div className="flex flex-1 flex-col gap-4 sm:gap-6 md:gap-9">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                  className="relative h-[200px] w-full overflow-hidden rounded-2xl sm:h-[280px] sm:w-[220px] md:h-[454px] md:w-full"
                >
                  <div className="absolute inset-0 z-10 rounded-2xl ring-1 ring-black/5 ring-inset" />
                  <Image
                    src="/about-us/image-1.webp"
                    alt="Sesi mentoring MULAI+ bersama mentor berpengalaman"
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 25vw"
                  />
                </motion.div>

                <StatCard icon={Users} value="10+" label="Mentor Aktif" accent="orange" delay={0.35} />
              </div>

              {/* Column 2 - Offset Top */}
              <div className="flex flex-1 flex-col gap-4 pt-0 sm:gap-6 sm:pt-8 md:gap-9 md:pt-24">
                <StatCard
                  icon={LayoutDashboard}
                  value="6 Minggu"
                  label="Program Terstruktur"
                  accent="red"
                  delay={0.45}
                />

                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                  className="relative h-[200px] w-full overflow-hidden rounded-2xl sm:h-[280px] sm:w-[220px] md:h-[454px] md:w-full"
                >
                  <div className="absolute inset-0 z-10 rounded-2xl ring-1 ring-black/5 ring-inset" />
                  <Image
                    src="/about-us/image-2.webp"
                    alt="Komunitas MULAI+"
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 25vw"
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
