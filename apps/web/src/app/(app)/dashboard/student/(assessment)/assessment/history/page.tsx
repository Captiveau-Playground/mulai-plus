"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export default function AssessmentHistoryPage() {
  const { data, isLoading } = useQuery({
    ...orpc.tmb.result.history.queryOptions({ input: {} }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-gray-200 border-dashed bg-white px-6 py-16 text-center">
        <span className="text-5xl">🕘</span>
        <h3 className="mt-3 font-bold font-bricolage text-gray-900">Belum ada riwayat test</h3>
        <p className="mt-1 max-w-xs font-manrope text-gray-500 text-sm">
          Selesaikan Test Minat & Bakat untuk melihat riwayat assessment-mu di sini.
        </p>
        <Link
          href="/dashboard/student/assessment"
          className="mt-5 rounded-2xl bg-brand-navy px-6 py-3 font-bold font-bricolage text-white shadow-md transition-all hover:brightness-110"
        >
          Mulai Test
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((r: any) => {
        const isBatch = r.source?.kind === "batch";
        return (
          <Link
            key={r.id}
            href={`/dashboard/student/assessment/result?resultId=${r.id}`}
            className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-mentor-teal/40 hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5 font-bold font-bricolage text-brand-navy text-sm">
              {r.hollandCode}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-bold font-manrope text-[9px] uppercase",
                    isBatch ? "bg-amber-100 text-amber-700" : "bg-mentor-teal/10 text-teal-700",
                  )}
                >
                  {isBatch ? "🏫 Via Sekolah" : "🧭 Mandiri"}
                </span>
                {r.createdAt && (
                  <span className="font-manrope text-[10px] text-gray-400">
                    {format(new Date(r.createdAt), "dd MMM yyyy, HH:mm", { locale: id })}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate font-manrope font-semibold text-gray-800 text-sm">
                {isBatch ? `${r.source.schoolName ?? ""} — ${r.source.batchName ?? ""}` : "Tes Minat Bakat mandiri"}
              </p>
              <p className="font-manrope text-[11px] text-gray-400">
                {r.topMajor ?? "—"} · Confidence {r.confidenceScore}%
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-mentor-teal" />
          </Link>
        );
      })}
    </div>
  );
}
