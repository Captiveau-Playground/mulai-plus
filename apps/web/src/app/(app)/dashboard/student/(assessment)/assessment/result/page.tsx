"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, Download, Loader2, Map as MapIcon, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FutureCareerMap } from "@/components/front/future-career-map";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { authClient } from "@/lib/auth-client";
import { buildResultMindMap } from "@/lib/future-career";
import { generateTmbReportPdf } from "@/lib/tmb-report-pdf";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const HOLLAND_INFO: Record<string, { name: string; emoji: string; desc: string }> = {
  R: { name: "Realistic", emoji: "🔧", desc: "Suka bekerja dengan mesin, alat, dan aktivitas praktis" },
  I: { name: "Investigative", emoji: "🔬", desc: "Suka riset, analisis, dan memecahkan masalah" },
  A: { name: "Artistic", emoji: "🎨", desc: "Suka berkarya, desain, dan ekspresi kreatif" },
  S: { name: "Social", emoji: "🤝", desc: "Suka membantu, mengajar, dan berinteraksi" },
  E: { name: "Enterprising", emoji: "🚀", desc: "Suka memimpin, bisnis, dan persuasi" },
  C: { name: "Conventional", emoji: "📋", desc: "Suka keteraturan, data, dan administrasi" },
};

const ABILITY_INFO: Record<string, { label: string; emoji: string }> = {
  numerical: { label: "Numerik", emoji: "🔢" },
  verbal: { label: "Verbal", emoji: "💬" },
  logical: { label: "Logika", emoji: "🧩" },
  spatial: { label: "Spasial", emoji: "🧊" },
  clerical: { label: "Ketelitian", emoji: "🔍" },
};

const LEVEL_COLOR: Record<string, string> = {
  high: "bg-green-500",
  medium: "bg-amber-400",
  low: "bg-red-400",
};

export default function TmbResultPage() {
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const { data: session } = authClient.useSession();
  const searchParams = useSearchParams();
  const resultId = searchParams.get("resultId") ?? undefined;
  const { data, isLoading } = useQuery({
    ...orpc.tmb.result.get.queryOptions({ input: { resultId } }),
    retry: false,
  });

  const summaryMutation = useMutation({
    ...orpc.tmb.aiSummary.generate.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.tmb.result.get.key() });
    },
  });

  const result = data?.result;
  const recommendations = data?.recommendations ?? [];
  const majors = useMemo(() => recommendations.filter((r: any) => r.type === "major"), [recommendations]);
  const careers = useMemo(() => recommendations.filter((r: any) => r.type === "career"), [recommendations]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <span className="text-6xl">🧭</span>
        <h1 className="mt-4 font-bold font-bricolage text-gray-900 text-xl">Belum ada hasil</h1>
        <p className="mt-2 font-manrope text-gray-500 text-sm">
          Selesaikan kedua test dulu untuk melihat rekomendasi jurusan & kariermu.
        </p>
        <Link
          href="/dashboard/student/assessment"
          className="mt-6 rounded-2xl bg-brand-navy px-6 py-3.5 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Mulai Test
        </Link>
      </div>
    );
  }

  const hollandScores = (result.hollandScores ?? {}) as Record<string, number>;
  const abilityRaw = (result.abilityScores ?? {}) as {
    scores?: Record<string, { correct: number; total: number }>;
    levels?: Record<string, string>;
  };
  const abilityScores = abilityRaw.scores ?? {};
  const abilityLevels = abilityRaw.levels ?? {};
  const hollandCode = result.hollandCode ?? "---";
  const differentiation = result.differentiation ?? "moderate";

  const codeLetters = hollandCode.split("");

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await generateTmbReportPdf({
        studentName: session?.user?.name ?? "",
        schoolName: data?.profile?.schoolName ?? null,
        hollandCode,
        hollandScores,
        abilityScores,
        abilityLevels,
        differentiation,
        confidenceScore: result.confidenceScore ?? "0",
        majors: majors.map((m: any) => ({
          itemName: m.itemName,
          confidence: m.confidence,
          prodiRefs: m.prodiRefs,
        })),
        careers: careers.map((c: any) => c.itemName),
        summary: data?.summary,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `assessment-report-${hollandCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Laporan PDF diunduh!");
    } catch (_e) {
      toast.error("Gagal membuat PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-5 text-white"
      >
        <p className="font-manrope text-[11px] text-white/60 uppercase tracking-wide">Hasil Assessment</p>
        <h1 className="mt-1 font-bold font-bricolage text-2xl">Profil Minat & Bakatmu</h1>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 font-manrope text-xs">
            Kejelasan minat:{" "}
            <b className="text-amber-300">
              {differentiation === "strong" ? "Tinggi" : differentiation === "moderate" ? "Sedang" : "Perlu Eksplorasi"}
            </b>
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 font-manrope text-xs">
            Confidence: <b className="text-amber-300">{result.confidenceScore}%</b>
          </span>
        </div>
      </motion.div>

      {/* RIASEC + Ability — lg: 2 kolom */}
      <div className="grid gap-5 md:gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <h2 className="font-bold font-bricolage text-gray-900">
            Kode Minat: <span className="text-mentor-teal">{hollandCode}</span>
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {codeLetters.map((letter, i) => {
              const info = HOLLAND_INFO[letter];
              if (!info) return null;
              const score = Math.round((hollandScores[letter] ?? 0) * 100);
              return (
                <motion.div
                  key={letter}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * i }}
                  className="rounded-2xl bg-gray-50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{info.emoji}</span>
                    <span className="font-bold font-bricolage text-brand-navy text-lg">{letter}</span>
                  </div>
                  <p className="mt-1 font-manrope font-semibold text-gray-700 text-xs">{info.name}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-mentor-teal to-teal-400"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
          <p className="mt-3 font-manrope text-gray-500 text-xs leading-relaxed">
            {codeLetters
              .map((l) => HOLLAND_INFO[l]?.name)
              .filter(Boolean)
              .join(" → ")}{" "}
            — kombinasi minat utamamu
          </p>
        </motion.div>

        {/* Ability */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <h2 className="font-bold font-bricolage text-gray-900">Profil Kemampuan</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(ABILITY_INFO).map(([key, info]) => {
              const s = abilityScores[key] ?? { correct: 0, total: 0 };
              const level = abilityLevels[key] ?? "medium";
              const pct = s.total ? (s.correct / s.total) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between">
                    <span className="font-manrope font-medium text-gray-700 text-sm">
                      {info.emoji} {info.label}
                    </span>
                    <span className="font-manrope text-gray-400 text-xs">
                      {s.correct}/{s.total} ·{" "}
                      <b
                        className={cn(
                          "uppercase",
                          level === "high" ? "text-green-600" : level === "medium" ? "text-amber-600" : "text-red-500",
                        )}
                      >
                        {level === "high" ? "Tinggi" : level === "medium" ? "Sedang" : "Perlu Pengembangan"}
                      </b>
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      className={cn("h-full rounded-full", LEVEL_COLOR[level] ?? "bg-gray-400")}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.15 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {Object.entries(ABILITY_INFO).some(([key]) => (abilityLevels[key] ?? "medium") === "low") && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="font-bold font-bricolage text-gray-900 text-sm">
                  Ada{" "}
                  {Object.entries(ABILITY_INFO).filter(([key]) => (abilityLevels[key] ?? "medium") === "low").length}{" "}
                  kemampuan yang perlu pengembangan
                </p>
                <p className="mt-0.5 font-manrope text-gray-500 text-xs">
                  Ulangi Tes Bakat untuk mencoba lagi — skor terbaikmu yang tercatat.
                </p>
              </div>
              <Link
                href="/dashboard/student/assessment/take/ability"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 font-bold font-bricolage text-sm text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" /> Ulangi Tes Bakat
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* AI Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-orange" />
          <h2 className="font-bold font-bricolage text-gray-900">Ringkasan AI</h2>
        </div>
        {data?.summary ? (
          <div className="mt-3 rounded-2xl bg-white/70 p-4 font-manrope text-gray-700 text-sm leading-relaxed">
            <MarkdownRenderer>{data.summary}</MarkdownRenderer>
          </div>
        ) : summaryMutation.isPending ? (
          <div className="mt-3 flex items-center gap-2 font-manrope text-gray-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-brand-orange" /> Menyusun ringkasan…
          </div>
        ) : (
          <button
            type="button"
            onClick={() => summaryMutation.mutate({})}
            className="mt-3 flex items-center gap-2 rounded-2xl bg-brand-orange px-5 py-3 font-bold font-bricolage text-sm text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" /> Generate Ringkasan AI
          </button>
        )}
      </motion.div>

      {/* Top Majors */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
      >
        <h2 className="font-bold font-bricolage text-gray-900">🎯 Jurusan yang Cocok</h2>
        <div className="mt-3 space-y-3">
          {majors.map((m: any, i: number) => (
            <div key={m.id} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy font-bold font-bricolage text-sm text-white">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-bold font-bricolage text-gray-900">{m.itemName}</p>
                  <p className="font-manrope text-gray-400 text-xs">
                    Kecocokan <b className="text-mentor-teal">{m.confidence}%</b> · {m.count} prodi ditemukan
                  </p>
                </div>
              </div>

              {m.prodiRefs?.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {m.prodiRefs.map((p: any, j: number) => (
                    <Link
                      key={j}
                      href={p.link}
                      className="flex w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 transition-colors hover:bg-mentor-teal/5"
                    >
                      <span className="min-w-0 flex-1 truncate font-manrope text-gray-600 text-xs">
                        📚 {p.prodi} <span className="text-gray-400">({p.level})</span>
                        <span className="ml-1 text-gray-400">— {p.university}</span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-mentor-teal" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Careers */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
      >
        <h2 className="font-bold font-bricolage text-gray-900">💼 Karier yang Cocok</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {careers.map((c: any) => (
            <span
              key={c.id}
              className="rounded-full border border-mentor-teal/30 bg-mentor-teal/5 px-3.5 py-1.5 font-manrope font-medium text-sm text-teal-800"
            >
              {c.itemName}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Peta Rekomendasi (auto-generate dari hasil) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-gray-50 border-b px-5 py-4">
          <div className="flex items-center gap-2.5">
            <MapIcon className="h-5 w-5 text-mentor-teal" />
            <h2 className="font-bold font-bricolage text-gray-900">Peta Rekomendasi</h2>
          </div>
          <span className="rounded-full bg-gray-50 px-3 py-1 font-manrope text-[11px] text-gray-500">
            Dari profilmu · klik node prodi untuk detail
          </span>
        </div>
        <FutureCareerMap data={buildResultMindMap(hollandCode, majors as any, careers as any)} />
      </motion.div>

      {/* Download PDF */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange px-6 py-4 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
      >
        {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
        Download Laporan PDF
      </button>

      {/* Retake CTA */}
      <div className="flex flex-col gap-2 pb-4">
        <Link
          href="/dashboard/student/assessment/take/interest"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-6 py-3.5 font-bold font-manrope text-gray-600 text-sm transition-all hover:bg-gray-200"
        >
          🔄 Ulangi Test
        </Link>
      </div>
    </div>
  );
}
