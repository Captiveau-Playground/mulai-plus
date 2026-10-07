"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, PlayCircle, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import ProfileGate, { useProfileGate } from "@/components/student/profile-gate";
import { ProgressCharts } from "@/components/student/progress-charts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { orpc, client } from "@/utils/orpc";

const TEST_META: Record<string, { emoji: string; color: string; desc: string; xp: string; href: string }> = {
  interest: {
    emoji: "🧠",
    color: "from-violet-500 to-purple-600",
    desc: "10 soal pilihan aktivitas — cari tahu tipe minatmu (Holland RIASEC)",
    xp: "+50 XP",
    href: "/dashboard/student/assessment/take/interest" as const,
  },
  ability: {
    emoji: "💡",
    color: "from-mentor-teal to-teal-700",
    desc: "10 soal kemampuan: numerik, verbal, logika, spasial & ketelitian",
    xp: "+100 XP",
    href: "/dashboard/student/assessment/take/ability" as const,
  },
};

function TestCard({ test, pid }: { test: any; pid: string }) {
  const raw = client as any;
  const qP = useQuery({ queryKey: ["pend", test.code, pid], enabled: !!pid, queryFn: () => raw.discover.pending({ studentId: pid, code: test.code }) });
  const pd = (qP.data as any)?.present === true ? qP.data as any : null;
  const meta =
    test.family === "minat"
      ? { emoji: "🧠", color: "from-violet-500 to-purple-600", desc: "Pilih aktivitas yang paling menggambarkanmu — cari tahu tipe minatmu (Holland RIASEC)", xp: `+${test.xp} XP`, href: `/dashboard/student/assessment/take/${test.code}` }
      : { emoji: "💡", color: "from-mentor-teal to-teal-700", desc: "Ukur kemampuan dasar: numerik, verbal, logika, spasial & ketelitian", xp: `+${test.xp} XP`, href: `/dashboard/student/assessment/take/${test.code}` };
  return (
    <div className="flex flex-col rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-md", meta.color)}>
          {meta.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-bold font-bricolage text-gray-900">{test.name}</h3>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold font-manrope text-[10px] text-amber-600">{meta.xp}</span>
          </div>
          <p className="mt-0.5 font-manrope text-gray-500 text-xs leading-relaxed">{meta.desc}</p>
          <p className="mt-1 font-manrope text-[10px] text-gray-400">{test.questions} soal · {test.sections} bagian</p>
        </div>
      </div>
      <div className="mt-4 flex-1" />
      {pd ? (
        <div className="space-y-1.5">
          {pd.fullyAnswered ? (
            <button onClick={async () => { try { await raw.discover.finish({ sessionId: pd.sessionId }); } catch { /* biarkan */ } window.location.href = "/dashboard/student/assessment/result"; }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3.5 font-bold font-manrope text-sm text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98]">
              <CheckCircle2 className="h-5 w-5" /> Selesaikan Test · {pd.answered}/{pd.total}
            </button>
          ) : (
            <Link href={meta.href as any} className="flex items-center justify-center gap-2 rounded-2xl bg-brand-orange px-4 py-3.5 font-bold font-manrope text-sm text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98]">
              <PlayCircle className="h-5 w-5" /> Lanjutkan · {pd.answered}/{pd.total} soal
            </Link>
          )}
          <button onClick={() => { void raw.discover.abandon({ studentId: pid, code: test.code }).then(() => qP.refetch()); }} className="w-full text-center font-manrope text-[10px] text-gray-400 hover:text-red-500">Bukan ini? Mulai ulang (buang progres)</button>
        </div>
      ) : (
        <Link href={meta.href as any} className="flex items-center justify-center gap-2 rounded-2xl bg-brand-navy px-4 py-3.5 font-bold font-manrope text-sm text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98]">
          <PlayCircle className="h-5 w-5" /> Mulai Test
        </Link>
      )}
    </div>
  );
}

function EngineProgressCard() {
  const { data: authSession } = authClient.useSession();
  const sid = authSession?.user?.id ?? "";
  const raw = client as any;
  const qA = useQuery({ queryKey: ["ep", sid], enabled: !!sid, queryFn: () => raw.discover.attempts({ studentId: sid }) });
  const attempts: any[] = (qA.data as any)?.attempts ?? [];
  if (!sid) return null;
  if (attempts.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-3xl border border-gray-200 bg-white p-5">
        <div>
          <p className="font-bold font-bricolage text-sm text-gray-900">Belum ada attempt — mulai sekarang yuk 🧠</p>
          <p className="mt-1 font-manrope text-xs text-gray-500">Selesaikan Minat &amp; Bakat untuk laporan lengkap.</p>
        </div>
        <Link href="/dashboard/student/assessment/take/DISCOVER" className="shrink-0 rounded-xl bg-brand-navy px-4 py-2 font-manrope text-xs font-semibold text-white hover:brightness-110">Mulai Tes Baru →</Link>
      </div>
    );
  }
  const last = attempts[attempts.length - 1];
  const n = attempts.length;
  if (!last?.complete) {
    const needCode = last?.hollandCode ? "TALENT" : "DISCOVER";
    const needLabel = last?.hollandCode ? "Tes Bakat" : "Tes Minat";
    return (
      <div className="rounded-3xl border border-brand-orange/25 bg-brand-orange/5 p-5">
        <p className="font-bold font-bricolage text-sm text-gray-900">Ada attempt yang belum selesai — lanjutin yuk 💪 <span className="ml-1 rounded-full bg-brand-orange/15 px-2 py-0.5 text-[10px] text-brand-orange">Percobaan ke-{n}</span></p>
        <p className="mt-1 font-manrope text-xs text-gray-500">{last?.hollandCode ? "Minat ✓" : "Minat –"} · {last?.hasAbility ? "Bakat ✓" : "Bakat –"} — dua-duanya dibutuhkan buat rekomendasi lengkap.</p>
        <Link href={`/dashboard/student/assessment/take/${needCode}`} className="mt-3 inline-flex items-center gap-1 rounded-xl bg-brand-navy px-4 py-2 font-manrope text-xs font-semibold text-white hover:brightness-110">Lanjutkan ke {needLabel} →</Link>
      </div>
    );
  }
  return (
    <div className="rounded-3xl bg-gradient-to-br from-teal-600 to-teal-700 p-5 text-white shadow-md">
      <p className="font-bold font-bricolage text-base">Attempt ke-{n} selesai — 🎉</p>
      <p className="mt-1 font-manrope text-xs text-white/80">{last?.hollandCode ? `${last.hollandCode}` : ""} · Selesai {new Date(last?.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}. Mau coba lebih baik?</p>
      <Link href="/dashboard/student/assessment/result" className="mt-3 inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 font-manrope text-xs font-semibold text-teal-700 hover:brightness-95">Lihat Rekomendasi →</Link>
      <Link href="/dashboard/student/assessment/take/DISCOVER" onClick={() => raw.discover.purgeIncomplete({ studentId: sid })} className="mt-3 ml-2 inline-flex items-center gap-1 rounded-xl border border-white/40 px-4 py-2 font-manrope text-xs font-semibold text-white hover:bg-white/10">Tes Baru (ke-{n + 1})</Link>
    </div>
  );
}

export default function AssessmentHomePage() {
  // Dialog "masih development" — tampil SEKALI (dismiss tersimpan spt cookie), tidak muncul lagi di kunjungan berikut
  const [infoOpen, setInfoOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem("mulai-dev-info-v1") !== "1");
  const closeInfo = () => { try { localStorage.setItem("mulai-dev-info-v1", "1"); } catch { /* abaikan */ } setInfoOpen(false); };
  const { data: authSession } = authClient.useSession();
  const sid = authSession?.user?.id ?? "";
  const gate = useProfileGate();
  const { data } = useQuery({
    ...orpc.tmb.assessment.list.queryOptions({ input: {} }),
    enabled: true,
  });
  const { data: liveTests } = useQuery({
    queryKey: ["assess-live-tests"],
    queryFn: () => (client as any).discover.liveTests(),
    staleTime: 30_000,
  });

  const stats = data?.stats ?? { xp: 0, level: 1, streak: 0, testsCompleted: 0 };
  const tests = data?.tests ?? [];
  const status = data?.status ?? {};
  const hasResult = !!data?.latestResult;
  const progress = data?.progress ?? [];

  const xpToNext = (stats.level + 1) * 150;
  const levelProgress = Math.min(100, ((stats.xp - (stats.level - 1) * 150) / 150) * 100);

  if (gate.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
      </div>
    );
  }
  if (!gate.ready) {
    return (
      <div className="space-y-6">
        <ProfileGate />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info: masih development — dialog brand (bukan base-ui) */}
      <Dialog open={infoOpen} onOpenChange={(v) => { if (!v) closeInfo(); else setInfoOpen(true); }}>
        <DialogContent className="overflow-hidden! gap-0! border-border! bg-card! p-0! shadow-2xl! sm:max-w-[26rem]">
          {/* Header brand */}
          <div className="relative overflow-hidden bg-gradient-to-r from-brand-navy to-brand-navy-light px-6 py-5 text-white">
            <div className="absolute -top-6 -right-6 size-24 rounded-full bg-brand-orange/25 blur-2xl" />
            <div className="absolute -bottom-8 left-10 size-20 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <TriangleAlert className="size-5 text-brand-orange" />
                </span>
                <div>
                  <span className="inline-flex rounded-full bg-brand-orange/25 px-2 py-0.5 font-manrope font-semibold text-[10px] text-brand-orange uppercase tracking-wide">
                    Development
                  </span>
                  <h3 className="mt-1 font-bold font-bricolage text-base leading-tight">
                    Tes Minat &amp; Bakat masih dalam pengembangan
                  </h3>
                </div>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={closeInfo}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2.5 px-6 py-5">
            <p className="flex items-start gap-2.5 font-manrope text-sm text-text-main leading-relaxed">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-orange" />
              Hasil yang tampil bisa berubah dan belum menjadi acuan final — pakai sebagai gambaran awal.
            </p>
            <p className="flex items-start gap-2.5 font-manrope text-sm text-text-main leading-relaxed">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-orange" />
              Jawaban tes dipakai untuk profil RIASEC & rekomendasi jurusan/karier yang dipersonalisasi.
            </p>
            <p className="flex items-start gap-2.5 font-manrope text-sm text-text-main leading-relaxed">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-orange" />
              Rekomendasi bersifat informasional — bukan pengganti pendampingan mentor.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-border border-t px-6 py-4">
            <Link
              href="/privacy#assessment"
              className="font-manrope font-semibold text-brand-navy text-xs underline decoration-brand-orange/60 underline-offset-2 hover:opacity-80"
            >
              Kebijakan Privasi · bab Assessment
            </Link>
            <Button
              type="button"
              onClick={() => setInfoOpen(false)}
              className="rounded-xl bg-brand-navy px-5 font-manrope font-semibold text-sm text-white transition-colors hover:bg-brand-navy-light"
            >
              Mengerti
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hero + stat */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-6 text-white lg:col-span-2"
        >
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-mentor-teal/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-brand-orange/20 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-manrope text-[11px] text-white/60 uppercase tracking-wide">Level {stats.level}</p>
                <h2 className="font-bold font-bricolage text-2xl md:text-3xl">
                  Halo, petualang! <span className="inline-block animate-bounce">👋</span>
                </h2>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl backdrop-blur">
                🏆
              </div>
            </div>
            <div className="mt-5">
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
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🔥", label: "Streak", value: `${stats.streak} hari`, cls: "from-orange-50 to-amber-50" },
            { icon: "✅", label: "Test Selesai", value: `${stats.testsCompleted}`, cls: "from-green-50 to-teal-50" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className={cn("rounded-3xl bg-gradient-to-br p-4", s.cls)}
            >
              <p className="text-2xl">{s.icon}</p>
              <p className="mt-1 font-bold font-bricolage text-gray-800 text-lg">{s.value}</p>
              <p className="font-manrope text-gray-500 text-xs">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Test cards */}
      <div>
        <h2 className="mb-3 font-bold font-bricolage text-base text-gray-800 md:text-lg">Pilih Test</h2>
        <div className="mb-4"><EngineProgressCard /></div>
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {((liveTests?.items ?? []) as any[]).map((test: any, i: number) => (
            <motion.div key={test.code} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <TestCard test={test} pid={sid} />
            </motion.div>
          ))}
          {((liveTests?.items ?? []) as any[]).length === 0 && (
            <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center font-manrope text-sm text-gray-400">Belum ada tes B2C yang dirilis — atur lewat Kelola Tes → Terbitkan.</p>
          )}
        </div>

        <p className="mt-2 text-center">
          <Link
            href="/dashboard/student/assessment/take/minat?demo=1&type=interest"
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/50 border-dashed px-4 py-2 font-manrope font-semibold text-brand-orange text-xs transition-colors hover:bg-brand-orange/5"
          >
            ⚡ Coba Simulasi Test (2 minat + 2 bakat) — tanpa disimpan
          </Link>
        </p>
      </div>

      {/* Progres */}
      {progress.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="mb-3">
            <h2 className="font-bold font-bricolage text-base text-gray-800 md:text-lg">Progres Kamu</h2>
            <p className="font-manrope text-gray-400 text-xs">Perkembangan skor tiap kali kamu mengulang test</p>
          </div>
          <ProgressCharts progress={progress} />
        </motion.div>
      )}

      {/* Result CTA */}
      {hasResult && (
        <Link
          href="/dashboard/student/assessment/result"
          className="group flex items-center gap-3 rounded-3xl border-2 border-mentor-teal/30 bg-mentor-teal/5 p-4 transition-all hover:bg-mentor-teal/10"
        >
          <span className="text-3xl">📊</span>
          <div className="flex-1">
            <p className="font-bold font-bricolage text-gray-900">Lihat Hasil & Rekomendasi</p>
            <p className="font-manrope text-gray-500 text-xs">Top jurusan & karier untukmu sudah siap</p>
          </div>
          <ArrowRight className="h-5 w-5 text-mentor-teal transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
