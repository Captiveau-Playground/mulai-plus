"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Compass,
  GraduationCap,
  Info,
  Loader2,
  Map as MapIcon,
  Search,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { FutureCareerMap } from "@/components/front/future-career-map";
import { buildCareerMindMap, type FutureCareerResult } from "@/lib/future-career";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const POPULAR = [
  "Dokter",
  "Software Engineer",
  "Psikolog",
  "Arsitek",
  "Guru",
  "Data Scientist",
  "UI/UX Designer",
  "Pengacara",
  "Chef",
  "Akuntan",
];

const FIT_META = {
  cocok: {
    icon: CheckCircle2,
    ring: "border-teal-200 bg-teal-50/70",
    badge: "bg-teal-600",
    title: "Sejalan dengan profilmu",
    text: "Karir impianmu selaras dengan minat & bakatmu — jalur ini adalah pilihan yang kuat untuk dikejar.",
  },
  cukup: {
    icon: TrendingUp,
    ring: "border-amber-200 bg-amber-50/70",
    badge: "bg-amber-500",
    title: "Cukup sejalan — masih bisa dikejar",
    text: "Jalur ini agak di luar zona nyaman profilmu. Dengan pengembangan kemampuan, kamu tetap bisa menempuhnya.",
  },
  kurang: {
    icon: Info,
    ring: "border-rose-200 bg-rose-50/70",
    badge: "bg-rose-500",
    title: "Minat & bakatmu kurang cocok dengan jalur ini",
    text: "Kamu tetap bisa mengejarnya, tapi pertimbangkan jalur yang lebih natural bagi profilmu di bawah.",
  },
} as const;

export default function FutureCareerPage() {
  const [careerText, setCareerText] = useState("");
  const [result, setResult] = useState<FutureCareerResult | null>(null);

  const matchMutation = useMutation({
    ...orpc.tmb.futureCareer.match.mutationOptions(),
    onSuccess: (data) => {
      setResult(data as FutureCareerResult);
    },
    onError: () => toast.error("Gagal memproses. Coba lagi sebentar ya."),
  });

  const submit = (text: string) => {
    const t = text.trim();
    if (t.length < 2) {
      toast.error("Tulis dulu karir impianmu, misal: 'aku mau jadi dokter'");
      return;
    }
    matchMutation.mutate({ careerText: t });
  };

  const fit = result?.fit?.hasResult ? result.fit : null;
  const fitMeta = fit?.level ? FIT_META[fit.level] : null;

  return (
    <div className="flex flex-col gap-5">
      {/* INPUT */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
      >
        <div className="flex items-start gap-3 p-5 md:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-white">
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold font-bricolage text-gray-900 text-lg">Punya Karir Impian?</h2>
            <p className="mt-0.5 font-manrope text-gray-500 text-sm">
              Tulis profesi yang kamu idamkan — kami petakan jalur kuliahnya: jurusan, prodi, dan kampus yang tepat.
            </p>
          </div>
        </div>

        <div className="border-gray-50 border-t p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(careerText);
            }}
            className="flex flex-col gap-2.5 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={careerText}
                onChange={(e) => setCareerText(e.target.value)}
                placeholder="Contoh: aku mau jadi game developer…"
                maxLength={140}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/60 py-3.5 pr-4 pl-10 font-manrope text-gray-800 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-teal-500/50 focus:bg-white focus:ring-2 focus:ring-teal-500/10"
              />
            </div>
            <button
              type="submit"
              disabled={matchMutation.isPending}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-6 py-3.5 font-bold font-bricolage text-sm text-white shadow-brand-navy/15 shadow-lg transition-all hover:bg-brand-navy-light active:scale-[0.98] disabled:opacity-60"
            >
              {matchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapIcon className="h-4 w-4" />}
              Petakan Jalurnya
            </button>
          </form>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            <span className="font-manrope text-gray-400 text-xs">Coba:</span>
            {POPULAR.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setCareerText(p);
                  submit(p);
                }}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 font-manrope text-gray-600 text-xs transition-colors hover:border-teal-500/40 hover:bg-teal-500/5 hover:text-teal-700"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* LOADING */}
      {matchMutation.isPending && (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-gray-100 bg-white shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
          <p className="font-manrope text-gray-500 text-sm">Memetakan jalur kuliah dari 18.000+ prodi…</p>
        </div>
      )}

      {/* UNMATCHED */}
      {result && !result.matched && !matchMutation.isPending && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-bold font-bricolage text-gray-900 text-lg">
            Hmm, belum ketemu persis "{result.query}"
          </h3>
          <p className="mx-auto mt-1.5 max-w-md font-manrope text-gray-500 text-sm">
            Kami belum punya data jalur untuk profesi itu. Tapi salah satu karier di bawah ini mungkin yang kamu maksud?
          </p>
          {result.suggestions.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {result.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setCareerText(s);
                    submit(s);
                  }}
                  className="rounded-full border border-teal-500/30 bg-teal-500/5 px-4 py-2 font-manrope font-medium text-sm text-teal-700 transition-colors hover:bg-teal-500/10"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {result.suggestions.length === 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {POPULAR.slice(0, 5).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setCareerText(s);
                    submit(s);
                  }}
                  className="rounded-full border border-gray-200 px-4 py-2 font-manrope text-gray-600 text-sm transition-colors hover:border-teal-500/40 hover:text-teal-700"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* MATCHED */}
      {result?.matched && !matchMutation.isPending && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
          {/* FIT NOTE */}
          {fit && fitMeta && (
            <div className={cn("flex flex-col gap-3 rounded-3xl border p-5 md:flex-row md:items-center", fitMeta.ring)}>
              <div className="flex items-start gap-3 md:items-center">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm",
                    fitMeta.badge,
                  )}
                >
                  <fitMeta.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="flex items-center gap-2 font-bold font-bricolage text-base text-gray-900">
                    {fitMeta.title}
                    <span className="rounded-full bg-white/80 px-2.5 py-0.5 font-bold font-manrope text-gray-700 text-xs shadow-sm">
                      {fit.score}% selaras
                    </span>
                  </p>
                  <p className="mt-0.5 font-manrope text-gray-600 text-sm">{fitMeta.text}</p>
                </div>
              </div>
              {fit.level === "kurang" && fit.suggestedMajors.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 md:ml-auto md:max-w-xs">
                  <span className="font-manrope font-semibold text-gray-500 text-xs">Lebih natural untukmu:</span>
                  {fit.suggestedMajors.map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-gray-200 bg-white px-2.5 py-1 font-manrope font-medium text-gray-700 text-xs"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {!fit && (
            <div className="flex items-center gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <Sparkles className="h-5 w-5 shrink-0 text-teal-600" />
              <p className="font-manrope text-gray-600 text-sm">
                Selesaikan <b>Test Minat Bakat</b> untuk melihat seberapa cocok jalur karir impianmu dengan profilmu.
              </p>
              <Link
                href="/dashboard/student/assessment"
                className="ml-auto shrink-0 rounded-xl bg-brand-navy px-4 py-2 font-bold font-bricolage text-white text-xs transition-colors hover:bg-brand-navy-light"
              >
                Ikuti Test
              </Link>
            </div>
          )}

          {/* MIND MAP */}
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2 border-gray-50 border-b px-5 py-4">
              <div className="flex items-center gap-2.5">
                <MapIcon className="h-5 w-5 text-mentor-teal" />
                <h3 className="font-bold font-bricolage text-base text-gray-900">Peta Jalur Kuliah</h3>
              </div>
              <span className="rounded-full bg-gray-50 px-3 py-1 font-manrope font-medium text-[11px] text-gray-500">
                Klik node prodi untuk lihat detail · seret untuk menjelajah
              </span>
            </div>
            <FutureCareerMap data={buildCareerMindMap(result.query, result.paths)} />
          </div>

          {/* PATH CARDS */}
          <div className="grid min-w-0 gap-4">
            {result.paths.map((p, i) => (
              <div key={p.categoryKey} className="min-w-0 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy font-bold font-bricolage text-white text-xs">
                    {i + 1}
                  </span>
                  <h4 className="font-bold font-bricolage text-gray-900 text-lg">{p.categoryName}</h4>
                  <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 font-bold font-manrope text-[11px] text-teal-700">
                    {p.careerName}
                  </span>
                </div>

                {p.otherCareers.length > 1 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.otherCareers.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-manrope text-[11px] text-gray-600"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid gap-2">
                  {p.prodis.length === 0 && (
                    <p className="font-manrope text-gray-400 text-sm">Data prodi kategori ini sedang dilengkapi.</p>
                  )}
                  {p.prodis.map((pr) => (
                    <Link
                      key={pr.link}
                      href={pr.link as Route}
                      className="group flex w-full min-w-0 max-w-full items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 transition-colors hover:border-teal-500/30 hover:bg-teal-500/5"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <GraduationCap className="h-4 w-4 shrink-0 text-mentor-teal" />
                        <span className="min-w-0 flex-1 truncate font-manrope text-gray-700 text-sm">
                          {pr.prodi}
                          {pr.level ? <span className="text-gray-400"> ({pr.level})</span> : null}
                          <span className="ml-1 text-gray-400">— {pr.university}</span>
                        </span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-mentor-teal" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* FOOTER CTA */}
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-brand-navy p-6 text-center text-white md:flex-row md:justify-between md:text-left">
            <div>
              <p className="flex items-center justify-center gap-2 font-bold font-bricolage text-lg md:justify-start">
                <Target className="h-5 w-5 text-brand-orange" /> Yakin dengan arahmu?
              </p>
              <p className="mt-1 font-manrope text-sm text-white/70">
                Lihat rekomendasi jurusan & karier lengkap dari hasil testmu.
              </p>
            </div>
            <Link
              href="/dashboard/student/assessment/result"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-orange px-6 py-3 font-bold font-bricolage text-sm text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
            >
              Lihat Hasil Test <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* EMPTY (belum pernah search) */}
      {!result && !matchMutation.isPending && (
        <div className="rounded-3xl border border-gray-200 border-dashed bg-white/50 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-mentor-teal">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-bold font-bricolage text-gray-900 text-xl">Bagaimana Cara Kerjanya?</h3>
          <div className="mx-auto mt-6 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Tulis karir impian",
                desc: 'Bebas, dengan bahasa sehari-hari — misal "aku mau jadi dokter hewan".',
              },
              {
                icon: MapIcon,
                title: "Kami petakan jalurnya",
                desc: "Karir dicocokkan ke jurusan, prodi, dan kampus dari 18.000+ data.",
              },
              {
                icon: Target,
                title: "Cek keselarasannya",
                desc: "Jalur dibandingkan dengan hasil minat-bakatmu — lihat yang paling natural.",
              },
            ].map((s) => (
              <div key={s.title}>
                <s.icon className="h-5 w-5 text-mentor-teal" />
                <p className="mt-2.5 font-bold font-bricolage text-gray-900 text-sm">{s.title}</p>
                <p className="mt-1 font-manrope text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
