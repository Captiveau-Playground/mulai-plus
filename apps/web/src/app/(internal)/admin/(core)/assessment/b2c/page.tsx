"use client";

// Halaman Statistik B2C — ringkasan pengguna mandiri yang mengikuti Test Minat Bakat.
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, ClipboardList, History, Inbox, Target, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { AssessmentPageHeader, EmptyBlock, SkeletonRows, StatCard } from "@/components/admin/assessment-page-header";
import { buttonVariants } from "@/components/ui/button";
import { HOLLAND_ORDER, holland } from "@/lib/holland";
import { orpc } from "@/utils/orpc";

export default function AdminB2cStatsPage() {
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.b2c.stats.queryOptions({ input: {} }),
  });

  const dist = new Map((data?.hollandDistribution ?? []).map((h) => [h.code, h.count]));
  const totalWithCode = (data?.hollandDistribution ?? []).reduce((a, h) => a + h.count, 0);
  const maxCount = Math.max(1, ...(data?.hollandDistribution ?? []).map((h) => h.count));

  return (
    <div className="space-y-5">
      <AssessmentPageHeader
        title="Statistik B2C"
        description="Rekap pengguna mandiri: test selesai, sebaran kode minat, dan jurusan yang paling sering direkomendasikan."
        stats={
          <span className="rounded-full bg-gray-100 px-3 py-1 font-manrope font-semibold text-gray-600 text-xs">
            {data?.totalAssessments ?? 0} hasil
          </span>
        }
        actions={
          <Link
            href="/admin/assessment/b2c/history"
            className={buttonVariants({ variant: "outline", className: "rounded-xl" })}
          >
            <History className="mr-1.5 h-4 w-4" /> Lihat riwayat
          </Link>
        }
      />

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={Users} label="Pengguna" value={data?.totalUsers ?? 0} sub="punya hasil test" />
            <StatCard
              icon={CheckCircle2}
              label="Assessment selesai"
              value={data?.totalAssessments ?? 0}
              sub={`${data?.completedAttempts ?? 0} attempt tuntas`}
              tone="teal"
            />
            <StatCard
              icon={ClipboardList}
              label="Attempt test"
              value={data?.totalAttempts ?? 0}
              sub="minat + bakat"
              tone="violet"
            />
            <StatCard
              icon={Target}
              label="Rata-rata confidence"
              value={`${data?.avgConfidence ?? 0}%`}
              sub="tingkat keyakinan hasil"
              tone="amber"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            {/* Distribusi Holland — selalu tampil 6 tipe walau 0 */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold font-bricolage text-gray-900">
                  <BarChart3 className="h-4 w-4 text-brand-navy" /> Sebaran Kode Minat (Holland)
                </h2>
                <span className="font-manrope text-[11px] text-muted-foreground">kode utama</span>
              </div>
              {totalWithCode === 0 && (
                <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 font-manrope text-gray-500 text-xs">
                  Belum ada hasil test — bar akan terisi setelah ada yang menyelesaikan tes.
                </p>
              )}
              <div className="mt-4 space-y-2.5">
                {HOLLAND_ORDER.map((code) => {
                  const count = dist.get(code) ?? 0;
                  const meta = holland(code);
                  const pct = totalWithCode ? Math.round((count / totalWithCode) * 100) : 0;
                  return (
                    <div key={code} className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-bold font-bricolage text-xs ${meta.soft} ${meta.text}`}
                        title={`${meta.name} — ${meta.desc}`}
                      >
                        {code}
                      </span>
                      <span className="w-28 shrink-0 truncate font-manrope text-gray-700 text-xs" title={meta.name}>
                        {meta.name}
                      </span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <span
                          className={`block h-full rounded-full ${meta.bar}`}
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </span>
                      <span className="w-20 shrink-0 text-right font-manrope text-muted-foreground text-xs tabular-nums">
                        {count} · {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Jurusan terpopuler */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="flex items-center gap-2 font-bold font-bricolage text-gray-900">
                <Trophy className="h-4 w-4 text-amber-500" /> Jurusan Terpopuler
              </h2>
              <p className="mt-0.5 font-manrope text-[11px] text-muted-foreground">dari rekomendasi peringkat 1</p>
              {(data?.topMajors ?? []).length === 0 ? (
                <EmptyBlock icon={Inbox} title="Belum ada rekomendasi" description="Muncul setelah ada hasil test." />
              ) : (
                <ol className="mt-4 space-y-2">
                  {(data?.topMajors ?? []).map((m, i) => (
                    <li key={m.name} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold font-bricolage text-xs ${
                          i === 0
                            ? "bg-amber-400 text-white"
                            : i === 1
                              ? "bg-gray-300 text-white"
                              : i === 2
                                ? "bg-orange-300 text-white"
                                : "bg-white text-gray-500"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate font-manrope font-semibold text-gray-800 text-sm" title={m.name}>
                        {m.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-teal-500/10 px-2.5 py-0.5 font-bold font-manrope text-teal-700 text-xs">
                        {m.count}x
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
