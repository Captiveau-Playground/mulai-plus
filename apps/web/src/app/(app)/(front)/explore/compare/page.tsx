"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthGate } from "@/components/front/auth-gate";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const api = orpc as any;

const accStyles: Record<string, string> = {
  Unggul: "border-green-500/20 bg-green-500/10 text-green-600",
  "Baik Sekali": "border-blue-500/20 bg-blue-500/10 text-blue-600",
  Baik: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600",
};

interface CompareItem {
  id: string;
  name: string;
  type?: string;
  province?: string;
  accreditation?: string;
  shortName?: string;
  programCount?: number;
  // Gated data
  tuition?: string;
  graduationRate?: string;
  studentCount?: string;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "university";
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  // Clear floating bar after navigating to compare
  useEffect(() => {
    if (ids.length > 0) {
      try {
        localStorage.removeItem("mulaiplus-compare");
      } catch {}
      window.dispatchEvent(new Event("compare-updated"));
    }
  }, [ids.length]);

  // Fetch slugs for example comparisons
  const { data: _allSlugs } = useQuery({
    ...api.pddikti.publicGetUniversitySlugs.queryOptions(),
    staleTime: 1000 * 60 * 60,
  });
  const allSlugs = (_allSlugs as any[]) ?? [];

  const _slugToId = (slug: string) => allSlugs.find((s: any) => s.slug === slug)?.id ?? slug;

  // Fixed-size hooks array — use max 10 slots to keep hook count stable
  const MAX_COMPARE = 10;
  const querySlots = Array.from({ length: MAX_COMPARE }, (_, i) => ids[i] ?? "");
  const queries = querySlots.map((id) =>
    // biome-ignore lint/correctness/useHookAtTopLevel: fixed-size array keeps hooks stable
    useQuery({
      ...api.pddikti.publicGetUniversity.queryOptions({ input: { id } }),
      enabled: type === "university" && !!id && ids.includes(id),
      staleTime: 1000 * 60 * 5,
    }),
  );

  const activeIds = ids.filter((id) => !removedIds.includes(id));
  const activeQueries = queries.filter((_, i) => ids[i] && !removedIds.includes(ids[i] as string));

  const items: CompareItem[] = activeQueries
    .map((q) => {
      const d = q.data as any;
      if (!d) return null;
      return {
        id: d.idSp,
        name: d.name,
        type: d.type,
        province: d.province,
        accreditation: d.accreditation,
        shortName: d.shortName,
        programCount: d.studyPrograms?.length ?? d.totalPrograms,
        tuition: d.tuitionFees?.avgTuition,
        graduationRate: d.graduationRates?.graduationRate,
        studentCount: d.studentStats?.totalStudents,
      } as CompareItem;
    })
    .filter(Boolean) as CompareItem[];

  const isLoading = activeQueries.some((q) => q.isLoading);
  const hasItems = items.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero — branded header for navbar contrast */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-brand-navy/95 pt-16 sm:pt-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <div className="mb-4 flex items-center gap-2 font-manrope text-white/40 text-xs">
            <Link href="/" className="transition-colors hover:text-white/80">
              Home
            </Link>
            <span>/</span>
            <Link href="/explore" className="transition-colors hover:text-white/80">
              Explore
            </Link>
            <span>/</span>
            <span className="text-white/60">Bandingkan</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-orange to-brand-red shadow-brand-orange/20 shadow-xl">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold font-bricolage text-2xl text-white sm:text-3xl">
                Bandingkan {type === "university" ? "Universitas" : "Program Studi"}
              </h1>
              <p className="mt-1 font-manrope text-sm text-white/50">
                {activeIds.length} item dipilih &middot; Side-by-side comparison
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Compare Table */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : !hasItems ? (
            <div className="mx-auto max-w-2xl py-16 sm:py-20">
              {/* Guide */}
              <div className="rounded-2xl border border-brand-navy/20 border-dashed bg-gradient-to-br from-brand-navy/[0.02] to-brand-orange/[0.02] p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy/80 shadow-lg">
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                <h2 className="font-bold font-bricolage text-brand-navy text-lg sm:text-xl">Bandingkan Universitas</h2>
                <p className="mx-auto mt-2 max-w-md font-manrope text-sm text-text-muted-custom leading-relaxed">
                  Pilih 2 universitas atau lebih untuk melihat perbandingan side-by-side. Cukup klik tombol{" "}
                  <strong>&ldquo;Bandingkan&rdquo;</strong> di halaman detail universitas.
                </p>

                {/* Steps */}
                <div className="mx-auto mt-8 grid max-w-sm gap-4 text-left sm:max-w-none sm:grid-cols-3">
                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy/10 font-bold font-bricolage text-brand-navy text-sm">
                      1
                    </div>
                    <p className="font-manrope font-medium text-text-main text-xs">
                      Cari universitas yang ingin dibandingkan
                    </p>
                  </div>
                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy/10 font-bold font-bricolage text-brand-navy text-sm">
                      2
                    </div>
                    <p className="font-manrope font-medium text-text-main text-xs">
                      Klik &ldquo;Bandingkan&rdquo; di setiap halaman
                    </p>
                  </div>
                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy/10 font-bold font-bricolage text-brand-navy text-sm">
                      3
                    </div>
                    <p className="font-manrope font-medium text-text-main text-xs">
                      Klik tombol floating &ldquo;Bandingkan&rdquo; untuk lihat hasil
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent("compare_cta_click", {
                        target: "explore_universities",
                        page: window.location.pathname,
                      });
                      window.location.href = "/explore/universities";
                    }}
                    className="rounded-xl bg-brand-navy px-6 py-3 font-manrope font-semibold text-sm text-white shadow-sm transition-all hover:bg-brand-navy/90"
                  >
                    Jelajahi Universitas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent("compare_cta_click", { target: "study_programs", page: window.location.pathname });
                      window.location.href = "/explore/study-programs";
                    }}
                    className="rounded-xl border border-gray-200 px-6 py-3 font-manrope font-semibold text-sm text-text-main shadow-sm transition-all hover:bg-gray-50"
                  >
                    Cari Program Studi
                  </button>
                </div>
              </div>

              {/* Example comparisons */}
              <div className="mt-12">
                <h3 className="mb-4 text-center font-bold font-bricolage text-brand-navy text-sm">
                  Coba lihat contoh perbandingan
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "UI vs ITB", name1: "Universitas Indonesia", name2: "Institut Teknologi Bandung" },
                    { label: "UGM vs UB", name1: "Universitas Gadjah Mada", name2: "Universitas Brawijaya" },
                    { label: "Unpad vs Undip", name1: "Universitas Padjadjaran", name2: "Universitas Diponegoro" },
                    {
                      label: "ITS vs Telkom",
                      name1: "Institut Teknologi Sepuluh Nopember",
                      name2: "Universitas Telkom",
                    },
                  ].map((ex) => {
                    const s1 = allSlugs.find((s: any) => s.name === ex.name1);
                    const s2 = allSlugs.find((s: any) => s.name === ex.name2);
                    if (!s1 || !s2) return null;
                    return (
                      <button
                        key={ex.label}
                        type="button"
                        onClick={() => {
                          trackEvent("compare_example_click", { pair: ex.label, page: window.location.pathname });
                          window.location.href = `/explore/compare?type=university&ids=${s1.id},${s2.id}`;
                        }}
                        className="group w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:border-brand-navy/30 hover:shadow-md"
                      >
                        <p className="font-bold font-bricolage text-brand-navy text-sm group-hover:text-brand-orange">
                          {ex.label}
                        </p>
                        <p className="mt-1 font-manrope text-text-muted-custom text-xs">
                          {ex.name1} vs {ex.name2}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th className="sticky left-0 z-10 min-w-[100px] bg-gray-50/80 p-2 text-left font-manrope font-semibold text-[10px] text-text-muted-custom uppercase tracking-wider sm:min-w-[160px] sm:p-4 sm:text-xs">
                      {type === "university" ? "Universitas" : "Program Studi"}
                    </th>
                    {items.map((item) => (
                      <th key={item.id} className="min-w-[140px] p-2 text-left sm:min-w-[200px] sm:p-4">
                        <div className="flex items-start justify-between gap-1 sm:gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold font-bricolage text-[11px] text-brand-navy sm:text-sm">
                              {item.name}
                            </p>
                            {item.shortName && (
                              <p className="font-manrope text-[8px] text-text-muted-custom sm:text-[10px]">
                                {item.shortName}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              trackEvent("compare_remove_item", { item: item.name, page: window.location.pathname });
                              setRemovedIds((prev) => [...prev, item.id]);
                            }}
                            className="shrink-0 rounded-full p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 sm:p-1"
                            title="Hapus"
                          >
                            ✕
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Row: Type */}
                  <Row label="Jenis" items={items} render={(i) => i.type ?? "-"} />

                  {/* Row: Province */}
                  <Row label="Provinsi" items={items} render={(i) => i.province ?? "-"} />

                  {/* Row: Accreditation */}
                  <Row
                    label="Akreditasi"
                    items={items}
                    render={(i) =>
                      i.accreditation ? (
                        <Badge
                          variant="outline"
                          className={cn("font-manrope text-[10px]", accStyles[i.accreditation] ?? "")}
                        >
                          {i.accreditation}
                        </Badge>
                      ) : (
                        "-"
                      )
                    }
                  />

                  {/* Row: Program Count */}
                  <Row label="Program Studi" items={items} render={(i) => String(i.programCount ?? "-")} />

                  {/* Separator */}
                  <tr className="bg-amber-50/50">
                    <td
                      className="p-4 font-manrope font-semibold text-amber-800 text-xs uppercase tracking-wider"
                      colSpan={items.length + 1}
                    >
                      <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
                      Data Detail — Login untuk akses
                    </td>
                  </tr>

                  {/* Gated Rows */}
                  {[
                    { label: "Biaya Kuliah", key: "tuition" },
                    { label: "Rata-rata Lulusan", key: "graduationRate" },
                    { label: "Total Mahasiswa", key: "studentCount" },
                    { label: "Rasio Lulusan", key: "graduationRate" },
                  ].map((col) => (
                    <tr key={col.key}>
                      <td className="sticky left-0 z-10 bg-white p-2 font-manrope font-medium text-[10px] text-text-main sm:p-4 sm:text-xs">
                        {col.label}
                      </td>
                      {items.map((item) => (
                        <td key={item.id} className="p-4 font-manrope text-sm">
                          <AuthGate gateName={`compare_${type}`}>
                            <span>{item[col.key as keyof CompareItem] ?? "Data tidak tersedia"}</span>
                          </AuthGate>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  items,
  render,
}: {
  label: string;
  items: CompareItem[];
  render: (item: CompareItem) => React.ReactNode;
}) {
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="sticky left-0 z-10 bg-white p-2 font-manrope font-medium text-[10px] text-text-main sm:p-4 sm:text-xs">
        {label}
      </td>
      {items.map((item) => (
        <td key={item.id} className="p-2 font-manrope text-xs sm:p-4 sm:text-sm">
          {render(item)}
        </td>
      ))}
    </tr>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center pt-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-navy border-t-transparent" />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
