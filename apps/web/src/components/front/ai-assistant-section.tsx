"use client";

import { motion } from "framer-motion";
import { BarChart3, Building2, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { AiMockChat } from "@/components/front/ai-mock-chat";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const FEATURES = [
  {
    icon: Building2,
    color: "text-brand-navy bg-brand-navy/10",
    title: "Skill per kebutuhan",
    desc: "Universitas, Prodi & Jurusan, Passing Grade, atau Mentoring — AI fokus mengikuti pilihanmu.",
  },
  {
    icon: BarChart3,
    color: "text-brand-orange bg-brand-orange/10",
    title: "Langkah tool transparan",
    desc: "Lihat step saat AI mengecek data (cari kampus/prodi/passing grade) dengan status berjalan → ✓.",
  },
  {
    icon: GraduationCap,
    color: "text-brand-navy bg-brand-navy/10",
    title: "Mulai Cerdas · Pintar · Bijak",
    desc: "Pilih kecepatan vs kedalaman; kuota harian jelas di meter.",
  },
  {
    icon: ShieldCheck,
    color: "text-brand-orange bg-brand-orange/10",
    title: "Privasi & kontrol",
    desc: "Profil & hasil tesmu dipakai untuk personalisasi, dengan kebijakan yang jelas.",
  },
];

export function AiAssistantSection() {
  return (
    <section className="relative overflow-hidden bg-brand-navy py-16 lg:py-24">
      {/* dekor */}
      <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-brand-orange/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 md:px-6 lg:grid-cols-2 lg:px-8">
        {/* Kiri: copy */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3.5 py-1.5 font-manrope font-medium text-[11px] text-brand-orange tracking-wide">
            <Sparkles className="size-3.5" /> Mul.ai — Asisten AI
          </span>
          <h2 className="mt-4 font-bold font-bricolage text-3xl text-white sm:text-4xl">
            Tanya apa saja seputar kuliahmu — <span className="text-brand-orange">dijawab langsung</span>
          </h2>
          <p className="mt-3 max-w-lg font-manrope text-sm text-white/70 leading-relaxed">
            Cari universitas, bandingkan passing grade, rekomendasi jurusan sesuai minat &amp; hasil tesmu — lengkap
            dengan langkah data, kuota harian transparan, dan model yang bisa kamu sesuaikan.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className={`flex size-8 items-center justify-center rounded-lg ${f.color}`}>
                  <f.icon className="size-4" />
                </span>
                <h3 className="mt-2 font-bold font-bricolage text-sm text-white">{f.title}</h3>
                <p className="mt-1 font-manrope text-[11px] text-white/55 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/explore/ai-assistant">
              <button
                type="button"
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-orange px-8 py-3.5 font-bold font-manrope text-sm text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:brightness-105 sm:w-auto"
              >
                <Sparkles className="size-4" /> Kenali Mul.ai
              </button>
            </Link>
            <Link href="/dashboard/student/assistant">
              <button
                type="button"
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-3.5 font-bold font-manrope text-sm text-white transition-all duration-300 hover:bg-white/20 sm:w-auto"
              >
                Buka Asisten
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Kanan: mock chat live */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white p-4 shadow-2xl">
            <div className="flex items-center gap-2 border-gray-100 border-b pb-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-navy/10 font-manrope text-brand-navy text-xs">
                M
              </span>
              <span className="font-bold font-bricolage text-brand-navy text-sm">Mul.ai</span>
              <span className="ml-auto rounded-full bg-brand-orange/10 px-2 py-0.5 font-manrope text-[10px] text-brand-orange">
                Skill: Prodi & Jurusan
              </span>
            </div>
            <div className="min-h-[16rem] py-3">
              <AiMockChat />
            </div>
          </div>
          <p className="mt-3 text-center font-manrope text-[11px] text-white/50">
            * Simulasi percakapan — data asli sesuai profil &amp; hasil tes kamu
          </p>
        </motion.div>
      </div>
    </section>
  );
}
