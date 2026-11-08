"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

function EngineAttemptHistory() {
  const { data: authSession } = authClient.useSession();
  const sid = authSession?.user?.id ?? "";
  const raw = client as any;
  const qA = useQuery({ queryKey: ["eh", sid], enabled: !!sid, queryFn: () => raw.discover.attempts({ studentId: sid }) });
  const attempts: any[] = (qA.data as any)?.attempts ?? [];
  if (!sid || attempts.length === 0) return null;
  return (
    <div className="mb-5">
      <p className="mb-2 font-bold font-bricolage text-sm text-gray-800">Percobaan Tes Engine</p>
      <div className="space-y-2">
        {[...attempts].reverse().map((r: any, idx: number) => {
          const n = attempts.length - idx;
          const parts = [
            r.hollandCode ? `Minat ${r.hollandCode}` : "Minat –",
            r.hasAbility ? "Bakat ✓" : "Bakat –",
          ];
          return (
            <div key={r.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <p className="font-bold font-bricolage text-xs text-gray-900">
                  Percobaan ke-{n}{" "}
                  <span className={"ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold " + (r.complete ? "bg-teal-50 text-teal-600" : "bg-amber-50 text-amber-600")}>
                    {r.complete ? "Lengkap" : "Belum lengkap"}
                  </span>
                </p>
                <p className="mt-0.5 truncate font-manrope text-[11px] text-gray-500">
                  {parts.join(" · ")} · {new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              {r.complete ? (
                <Link href={`/dashboard/student/assessment/result?resultId=${r.id}`} className="inline-flex shrink-0 items-center gap-1 font-manrope text-xs font-semibold text-brand-navy">
                  Lihat <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <Link href={`/dashboard/student/assessment/take/${r.hollandCode ? "TALENT" : "DISCOVER"}`} className="shrink-0 rounded-lg bg-brand-navy px-3 py-1.5 font-manrope text-[11px] font-semibold text-white hover:brightness-110">
                  Lanjutkan
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
      <EngineAttemptHistory />
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
