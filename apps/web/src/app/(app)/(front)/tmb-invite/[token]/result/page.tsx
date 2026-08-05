"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

const ABILITY_NAME: Record<string, string> = {
  numerical: "Numerik",
  verbal: "Verbal",
  logical: "Logika",
  spatial: "Spasial",
  clerical: "Ketelitian",
};

export default function TmbInviteResultPage() {
  const params = useParams();
  const token = params.token as string;

  const { data, isLoading } = useQuery({
    queryKey: ["tmb-guest-result", token],
    queryFn: () => client.tmbGuest.result({ token }),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
      </div>
    );
  }

  if (!data?.result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl">🧭</span>
        <h1 className="mt-4 font-bold font-bricolage text-gray-900 text-xl">Belum ada hasil</h1>
        <p className="mt-2 max-w-xs font-manrope text-gray-500 text-sm">Selesaikan kedua test dulu ya!</p>
        <Link
          href={`/tmb-invite/${token}`}
          className="mt-6 rounded-2xl bg-brand-navy px-6 py-3.5 font-bold font-bricolage text-white shadow-lg"
        >
          Lanjut Test
        </Link>
      </div>
    );
  }

  const result = data.result;
  const majors = (data.recommendations ?? []).filter((x: any) => x.type === "major");
  const careers = (data.recommendations ?? []).filter((x: any) => x.type === "career");
  const abilityScores = (result.abilityScores as any)?.scores ?? {};
  const abilityLevels = (result.abilityScores as any)?.levels ?? {};

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#fafafc] px-4 py-6">
      <div className="space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-5 text-center text-white"
        >
          <p className="font-manrope text-[10px] text-white/60 uppercase tracking-wide">Hasil Test Minat Bakat</p>
          <h1 className="mt-1 font-bold font-bricolage text-2xl">{data.student?.name ?? "Peserta"}</h1>
          <p className="mt-2 font-bold font-bricolage text-4xl text-amber-300">{result.hollandCode}</p>
          <p className="mt-1 font-manrope text-white/70 text-xs">Confidence: {result.confidenceScore}%</p>
        </motion.div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold font-bricolage text-gray-900">Kemampuan</h2>
          <div className="mt-3 space-y-2.5">
            {Object.entries(ABILITY_NAME).map(([key, label]) => {
              const s = abilityScores[key] ?? { correct: 0, total: 0 };
              const level = abilityLevels[key] ?? "medium";
              const pct = s.total ? (s.correct / s.total) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between">
                    <span className="font-manrope text-gray-700 text-sm">{label}</span>
                    <span
                      className={cn(
                        "font-bold font-manrope text-xs uppercase",
                        level === "high" ? "text-green-600" : level === "medium" ? "text-amber-600" : "text-red-500",
                      )}
                    >
                      {s.correct}/{s.total}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        level === "high" ? "bg-green-500" : level === "medium" ? "bg-amber-400" : "bg-red-400",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold font-bricolage text-gray-900">🎯 Jurusan yang Cocok</h2>
          <div className="mt-3 space-y-2.5">
            {majors.map((m: any, i: number) => (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-brand-navy font-bold font-bricolage text-white text-xs">
                  {i + 1}
                </span>
                <span className="flex-1 font-manrope font-semibold text-gray-800 text-sm">{m.itemName}</span>
                <span className="font-bold font-manrope text-mentor-teal text-xs">{m.confidence}%</span>
              </div>
            ))}
          </div>
          {careers.length > 0 && (
            <>
              <h3 className="mt-4 font-bold font-bricolage text-gray-900 text-sm">💼 Karier</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {careers.map((c: any) => (
                  <span
                    key={c.id}
                    className="rounded-full border border-mentor-teal/30 bg-mentor-teal/5 px-3 py-1 font-manrope text-teal-800 text-xs"
                  >
                    {c.itemName}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="pb-8 text-center">
          <p className="font-manrope text-[11px] text-gray-400">
            Hasil ini dikirim ke sekolahmu sebagai bahan bimbingan karier.
          </p>
        </div>
      </div>
    </div>
  );
}
