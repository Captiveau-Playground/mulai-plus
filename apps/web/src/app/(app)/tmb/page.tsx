"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, PlayCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const TEST_META: Record<string, { emoji: string; color: string; desc: string; xp: string }> = {
  interest: {
    emoji: "🧠",
    color: "from-violet-500 to-purple-600",
    desc: "10 soal pilihan aktivitas — cari tahu tipe minatmu (Holland)",
    xp: "+50 XP",
  },
  ability: {
    emoji: "💡",
    color: "from-mentor-teal to-teal-700",
    desc: "10 soal kemampuan: numerik, verbal, logika, spasial & ketelitian",
    xp: "+100 XP",
  },
};

export default function TmbDashboardPage() {
  const { data, isLoading } = useQuery({
    ...orpc.tmb.assessment.list.queryOptions({ input: {} }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
      </div>
    );
  }

  const stats = data?.stats ?? { xp: 0, level: 1, streak: 0, testsCompleted: 0 };
  const tests = data?.tests ?? [];
  const status = data?.status ?? {};
  const hasResult = !!data?.latestResult;

  // Progress menuju level berikutnya
  const xpToNext = (stats.level + 1) * 150;
  const levelProgress = Math.min(100, ((stats.xp - (stats.level - 1) * 150) / 150) * 100);

  return (
    <div className="space-y-5">
      {/* Hero / level card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-5 text-white"
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-mentor-teal/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-brand-orange/20 blur-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-manrope text-[11px] text-white/60 uppercase tracking-wide">Level {stats.level}</p>
              <h1 className="font-bold font-bricolage text-2xl">
                Halo, petualang! <span className="inline-block animate-bounce">👋</span>
              </h1>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl backdrop-blur">
              🏆
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between font-manrope text-white/70 text-xs">
              <span>{stats.xp} XP</span>
              <span>{xpToNext} XP</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-orange to-amber-400"
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 font-manrope text-xs">
              🔥 <b>{stats.streak}</b> hari streak
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 font-manrope text-xs">
              ✅ <b>{stats.testsCompleted}</b> test selesai
            </div>
          </div>
        </div>
      </motion.div>

      {/* Test cards */}
      <div className="space-y-3">
        <h2 className="font-bold font-bricolage text-base text-gray-800">Pilih Test</h2>

        {tests.map((test, i) => {
          const meta = TEST_META[test.code] ?? { emoji: "📝", color: "bg-gray-500", desc: "", xp: "" };
          const done = status[test.code]?.completed;
          const inProgress = status[test.code]?.inProgress;
          const _bothDone = done && Object.values(status).every((s) => s.completed);

          return (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-md",
                    meta.color,
                  )}
                >
                  {meta.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold font-bricolage text-gray-900">{test.name}</h3>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold font-manrope text-[10px] text-amber-600">
                      {meta.xp}
                    </span>
                  </div>
                  <p className="mt-0.5 font-manrope text-gray-500 text-xs leading-relaxed">{meta.desc}</p>
                  <p className="mt-1 font-manrope text-[10px] text-gray-400">{test.totalQuestions} soal</p>
                </div>
              </div>

              <div className="mt-3">
                {done ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="flex-1 font-manrope font-semibold text-green-700 text-sm">Selesai! 🎉</span>
                    <Link
                      href={`/tmb/test/${test.code}`}
                      className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 font-bold font-manrope text-gray-600 text-xs shadow-sm"
                    >
                      <RotateCcw className="h-3 w-3" /> Ulangi
                    </Link>
                  </div>
                ) : inProgress ? (
                  <Link
                    href={`/tmb/test/${test.code}`}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-brand-orange px-4 py-3 font-bold font-manrope text-sm text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98]"
                  >
                    <PlayCircle className="h-5 w-5" /> Lanjutkan Test
                  </Link>
                ) : (
                  <Link
                    href={`/tmb/test/${test.code}`}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-brand-navy px-4 py-3 font-bold font-manrope text-sm text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
                  >
                    <PlayCircle className="h-5 w-5" /> Mulai Test
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Result CTA */}
      {hasResult && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            href="/tmb/result"
            className="group flex items-center gap-3 rounded-3xl border-2 border-mentor-teal/30 bg-mentor-teal/5 p-4 transition-all hover:bg-mentor-teal/10"
          >
            <span className="text-3xl">📊</span>
            <div className="flex-1">
              <p className="font-bold font-bricolage text-gray-900">Lihat Hasil & Rekomendasi</p>
              <p className="font-manrope text-gray-500 text-xs">Top jurusan & karier untukmu sudah siap</p>
            </div>
            <ArrowRight className="h-5 w-5 text-mentor-teal transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      )}

      {/* Sekolah CTA */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          href="/tmb/admin"
          className="group flex items-center gap-3 rounded-3xl border-2 border-brand-navy/10 bg-brand-navy/5 p-4 transition-all hover:bg-brand-navy/10"
        >
          <span className="text-3xl">🏫</span>
          <div className="flex-1">
            <p className="font-bold font-bricolage text-gray-900">Untuk Sekolah</p>
            <p className="font-manrope text-gray-500 text-xs">Kelola batch, undang siswa, pantau hasil</p>
          </div>
          <ArrowRight className="h-5 w-5 text-brand-navy transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </div>
  );
}
