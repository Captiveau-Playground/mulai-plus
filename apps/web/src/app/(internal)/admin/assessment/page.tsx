"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  ClipboardList,
  GraduationCap,
  History,
  ListChecks,
  Users,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const ENTRY_CARDS = [
  {
    href: "/admin/assessment/schools" as const,
    icon: Building2,
    title: "Sekolah & Batch",
    desc: "Kelola sekolah partner, buat batch test, undangan, dan rekap siswa B2B.",
    accent: "bg-brand-navy/5 text-brand-navy",
    arrow: "text-brand-navy",
    group: "b2b",
    statLabel: "sekolah · batch · siswa",
  },
  {
    href: "/admin/assessment/b2c" as const,
    icon: BarChart3,
    title: "Statistik B2C",
    desc: "Rekap pengguna mandiri: test selesai, kode Holland, dan distribusi minat.",
    accent: "bg-teal-500/10 text-teal-600",
    arrow: "text-teal-600",
    group: "b2c",
    statLabel: "hasil · test selesai",
  },
  {
    href: "/admin/assessment/b2c/history" as const,
    icon: History,
    title: "History B2C",
    desc: "Riwayat hasil test semua pengguna mandiri, lengkap dengan sumbernya.",
    accent: "bg-violet-500/10 text-violet-600",
    arrow: "text-violet-600",
    group: "b2c",
    statLabel: "riwayat per pengguna",
  },
  {
    href: "/admin/assessment/questions" as const,
    icon: BookOpen,
    title: "Konten Test",
    desc: "Bank soal minat & bakat, pola jurusan (Holland + bobot), dan mapping karier.",
    accent: "bg-brand-orange/10 text-brand-orange",
    arrow: "text-brand-orange",
    group: "content",
    statLabel: "soal · pola · karier",
  },
];

export default function AdminAssessmentHub() {
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.overview.queryOptions({ input: {} }),
  });

  const o = data;
  const stats = [
    { icon: Users, label: "Siswa batch", value: o?.b2b.students ?? 0, cls: "from-brand-navy to-brand-navy-light" },
    {
      icon: GraduationCap,
      label: "Test selesai (B2C)",
      value: o?.b2c.testsCompleted ?? 0,
      cls: "from-mentor-teal to-teal-700",
    },
    { icon: ListChecks, label: "Hasil assessment", value: o?.b2c.results ?? 0, cls: "from-violet-500 to-purple-700" },
    {
      icon: ClipboardList,
      label: "Sekolah aktif",
      value: o?.b2b.activeSchools ?? 0,
      cls: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-navy p-6 text-white md:p-8">
        <div
          className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-mentor-teal/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-brand-orange/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="font-manrope text-[11px] text-white/60 uppercase tracking-wide">Admin · Assessment</p>
          <h1 className="mt-1 font-bold font-bricolage text-2xl md:text-3xl">Dashboard Assessment</h1>
          <p className="mt-2 max-w-xl font-manrope text-sm text-white/70">
            Pusat kendali Test Minat Bakat: sekolah & batch (B2B), pengguna mandiri (B2C), dan konten test.
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className={cn("rounded-2xl bg-gradient-to-br p-4 text-white", s.cls)}
          >
            <s.icon className="h-5 w-5 opacity-80" />
            <p className="mt-2 font-bold font-bricolage text-2xl">
              {isLoading ? "…" : s.value.toLocaleString("id-ID")}
            </p>
            <p className="font-manrope text-[11px] text-white/70">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Entry points */}
      <div>
        <h2 className="mb-3 font-bold font-bricolage text-gray-900 text-lg">Menu Assessment</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {ENTRY_CARDS.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + 0.06 * i }}
              >
                <Link
                  href={c.href}
                  className="group flex h-full items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-500/30 hover:shadow-md"
                >
                  <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", c.accent)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold font-bricolage text-base text-gray-900">{c.title}</h3>
                      <span className="rounded-full bg-gray-50 px-2 py-0.5 font-manrope font-semibold text-[10px] text-gray-500">
                        {c.group === "b2b" ? "B2B" : c.group === "b2c" ? "B2C" : "Konten"}
                      </span>
                    </div>
                    <p className="mt-1 font-manrope text-gray-500 text-sm leading-relaxed">{c.desc}</p>
                    <p className="mt-2 font-manrope font-medium text-[11px] text-gray-400">
                      {c.statLabel}:{" "}
                      <b className="text-gray-600">
                        {isLoading
                          ? "…"
                          : c.group === "b2b"
                            ? `${o?.b2b.schools ?? 0} · ${o?.b2b.batches ?? 0} · ${o?.b2b.students ?? 0}`
                            : c.group === "b2c"
                              ? `${o?.b2c.results ?? 0} · ${o?.b2c.testsCompleted ?? 0}`
                              : `${(o?.content.interestQuestions ?? 0) + (o?.content.abilityQuestions ?? 0)} · ${o?.content.patterns ?? 0} · ${o?.content.careers ?? 0}`}
                      </b>
                    </p>
                  </div>
                  <ArrowRight
                    className={cn("mt-3 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1", c.arrow)}
                  />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Konten Test sub-entries */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-brand-orange" />
          <h3 className="font-bold font-bricolage text-base text-gray-900">Langsung ke Konten Test</h3>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            {
              href: "/admin/assessment/questions" as const,
              label: "Soal",
              desc: `${o?.content.interestQuestions ?? 0} minat · ${o?.content.abilityQuestions ?? 0} bakat`,
              icon: BookOpen,
            },
            {
              href: "/admin/assessment/patterns" as const,
              label: "Pola Jurusan",
              desc: `${o?.content.patterns ?? 0} kategori`,
              icon: Brain,
            },
            {
              href: "/admin/assessment/careers" as const,
              label: "Mapping Karier",
              desc: `${o?.content.careers ?? 0} profesi`,
              icon: ClipboardList,
            },
          ].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3 transition-colors hover:border-teal-500/30 hover:bg-teal-500/5"
            >
              <s.icon className="h-4 w-4 shrink-0 text-brand-orange" />
              <div className="min-w-0">
                <p className="font-bold font-manrope text-gray-800 text-sm">{s.label}</p>
                <p className="font-manrope text-[11px] text-gray-400">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
