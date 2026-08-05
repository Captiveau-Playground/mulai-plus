"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const HOLLAND_NAME: Record<string, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};
const ABILITY_NAME: Record<string, string> = {
  numerical: "Numerik",
  verbal: "Verbal",
  logical: "Logika",
  spatial: "Spasial",
  clerical: "Ketelitian",
};

export default function StudentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.students.detail.queryOptions({ input: { id } }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
      </div>
    );
  }

  if (!data?.student) {
    return (
      <div className="py-20 text-center">
        <p className="font-manrope text-gray-500">Siswa tidak ditemukan.</p>
        <Link href="/admin/assessment" className="mt-3 inline-block font-bold font-manrope text-mentor-teal text-sm">
          ← Kembali
        </Link>
      </div>
    );
  }

  const { student, result } = data;
  const r = result?.result;
  const majors = (result?.recommendations ?? []).filter((x: any) => x.type === "major");
  const careers = (result?.recommendations ?? []).filter((x: any) => x.type === "career");

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/assessment"
          className="flex items-center gap-1 font-manrope font-semibold text-gray-400 text-xs hover:text-gray-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kelola Sekolah
        </Link>
        <h1 className="mt-1 font-bold font-bricolage text-gray-900 text-xl">{student.name}</h1>
        <p className="font-manrope text-gray-500 text-xs">
          {student.nis ? `NIS ${student.nis}` : ""}
          {student.email ? ` · ${student.email}` : ""}
        </p>
      </div>

      {!r ? (
        <div className="rounded-3xl border border-gray-200 border-dashed bg-white p-8 text-center">
          <span className="text-4xl">⏳</span>
          <p className="mt-2 font-manrope text-gray-500 text-sm">Siswa ini belum menyelesaikan test.</p>
          <span
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-manrope font-semibold text-xs",
              student.status === "in_progress" ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-500",
            )}
          >
            {student.status === "in_progress" ? "🟡 Sedang Mengerjakan" : "⚪ Belum Mulai"}
          </span>
        </div>
      ) : (
        <>
          <div className="rounded-3xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-5 text-white">
            <p className="font-manrope text-[10px] text-white/60 uppercase tracking-wide">Kode Minat</p>
            <p className="font-bold font-bricolage text-3xl">{r.hollandCode}</p>
            <p className="mt-1 font-manrope text-white/70 text-xs">
              {r.hollandCode
                ?.split("")
                .map((l: string) => HOLLAND_NAME[l])
                .filter(Boolean)
                .join(" → ")}
            </p>
            <div className="mt-3 flex gap-2">
              <span className="rounded-full bg-white/10 px-2.5 py-1 font-manrope text-[10px]">
                Confidence: {r.confidenceScore}%
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="font-bold font-bricolage text-gray-900 text-sm">Kemampuan</h3>
            <div className="mt-2 space-y-2">
              {Object.entries(ABILITY_NAME).map(([key, label]) => {
                const s = (r.abilityScores as any)?.scores?.[key] ?? { correct: 0, total: 0 };
                const level = (r.abilityScores as any)?.levels?.[key] ?? "medium";
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="font-manrope text-gray-600 text-xs">{label}</span>
                    <span
                      className={cn(
                        "font-bold font-manrope text-xs",
                        level === "high" ? "text-green-600" : level === "medium" ? "text-amber-600" : "text-red-500",
                      )}
                    >
                      {s.correct}/{s.total} ·{" "}
                      {level === "high" ? "Tinggi" : level === "medium" ? "Sedang" : "Perlu Pengembangan"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="font-bold font-bricolage text-gray-900 text-sm">Rekomendasi</h3>
            <div className="mt-2 space-y-1.5">
              {majors.map((m: any, i: number) => (
                <div key={m.id} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-navy font-bold font-manrope text-[10px] text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1 font-manrope font-semibold text-gray-800 text-xs">{m.itemName}</span>
                  <span className="font-bold font-manrope text-[10px] text-mentor-teal">{m.confidence}%</span>
                </div>
              ))}
            </div>
            {careers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {careers.map((c: any) => (
                  <span
                    key={c.id}
                    className="rounded-full bg-mentor-teal/10 px-2.5 py-1 font-manrope font-medium text-[10px] text-teal-800"
                  >
                    {c.itemName}
                  </span>
                ))}
              </div>
            )}
            {result?.summary && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3">
                <p className="font-bold font-manrope text-[10px] text-amber-700">AI SUMMARY</p>
                <p className="mt-1 font-manrope text-gray-600 text-xs leading-relaxed">
                  {result.summary.slice(0, 300)}
                  {result.summary.length > 300 ? "…" : ""}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
