"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Building2, ChevronDown, ChevronRight, GraduationCap, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

const api = orpc as any;

const accStyles: Record<string, string> = {
  Unggul: "border-green-500/20 bg-green-500/10 text-green-600",
  "Baik Sekali": "border-blue-500/20 bg-blue-500/10 text-blue-600",
  Baik: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600",
};

export default function StudyProgramSlugPage() {
  const params = useParams();
  const [openLevels, setOpenLevels] = useState<Set<string>>(new Set());
  const [showAllLevels, setShowAllLevels] = useState<Set<string>>(new Set());
  const [accFilter, setAccFilter] = useState("all");
  const [accSort, setAccSort] = useState(false);
  const slug = params.slug as string;

  const { data: _data, isLoading } = useQuery({
    ...api.pddikti.publicGetProgramBySlug.queryOptions({ input: { slug } }),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
  const detail = _data as any;

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16 sm:pt-20">
        <div className="text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-text-muted-custom" />
          <h2 className="mt-4 font-bold font-bricolage text-brand-navy text-lg">Program studi tidak ditemukan</h2>
          <Link
            href={"/explore/study-programs" as any}
            className="mt-2 inline-flex items-center gap-1 font-manrope text-brand-orange text-sm hover:underline"
          >
            <ArrowLeft className="h-3 w-3" /> Cari lagi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b bg-white pt-16 sm:pt-20">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-manrope text-text-muted-custom text-xs">
            <Link href={"/" as any} className="transition-colors hover:text-brand-navy">
              Home
            </Link>
            <span>/</span>
            <Link href={"/explore/study-programs" as any} className="transition-colors hover:text-brand-navy">
              Program Studi
            </Link>
            <span>/</span>
            <span className="text-text-main">{detail?.name ?? slug}</span>
          </div>
        </div>
      </div>

      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              {isLoading ? (
                <Skeleton className="h-8 w-64" />
              ) : (
                <>
                  <h1 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight md:text-3xl">
                    {detail?.name ?? "Tidak ditemukan"}
                  </h1>
                  {detail && (
                    <p className="mt-1 font-manrope text-sm text-text-muted-custom">
                      {detail.totalUniversities} universitas · {detail.levels?.length} jenjang
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <Building2 className="h-12 w-12 text-text-muted-custom" />
              <p className="font-manrope text-text-muted-custom">Program studi tidak ditemukan</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Accreditation Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-manrope font-medium text-[10px] text-text-muted-custom uppercase tracking-wider">
                  Akreditasi:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["all", "Unggul", "Baik Sekali", "Baik", "Terakreditasi"].map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        setAccFilter(a);
                        setOpenLevels(new Set());
                      }}
                      className={`rounded-lg px-2.5 py-1 font-manrope text-[10px] transition-all ${accFilter === a ? "bg-brand-navy text-white shadow-sm" : "bg-gray-100 text-text-muted-custom hover:bg-gray-200"}`}
                    >
                      {a === "all" ? "Semua" : a}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAccSort(!accSort)}
                    className={`rounded-lg px-2.5 py-1 font-manrope text-[10px] transition-all ${accSort ? "bg-brand-orange text-white shadow-sm" : "bg-gray-100 text-text-muted-custom hover:bg-gray-200"}`}
                  >
                    {accSort ? "↑ Unggul dulu" : "↓ Acak"}
                  </button>
                </div>
              </div>

              {detail.levels.map((group: any) => {
                const isOpen = openLevels.has(group.level);
                let items = group.programs;
                if (accFilter !== "all") items = items.filter((p: any) => p.accreditation === accFilter);
                if (accSort)
                  items = [...items].sort((a: any, b: any) => {
                    const order = ["Unggul", "Baik Sekali", "Baik", "Terakreditasi"];
                    return order.indexOf(a.accreditation) - order.indexOf(b.accreditation);
                  });
                if (!items.length) return null;

                return (
                  <div key={group.level} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(openLevels);
                        if (isOpen) next.delete(group.level);
                        else next.add(group.level);
                        setOpenLevels(next);
                      }}
                      className="flex w-full items-center justify-between border-b bg-gradient-to-r from-brand-navy/5 to-brand-orange/5 px-5 py-3 text-left transition-colors hover:from-brand-navy/10 hover:to-brand-orange/10"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-brand-navy/10 px-2.5 py-0.5 font-bold font-bricolage text-brand-navy text-xs">
                          {group.level}
                        </span>
                        <span className="font-manrope text-text-muted-custom text-xs">
                          {items.length} dari {group.total} universitas
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-gray-300" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="divide-y">
                        {(showAllLevels.has(group.level) ? items : items.slice(0, 10)).map((item: any) => {
                          const u = item.university;
                          if (!u) return null;
                          return (
                            <Link
                              key={item.idSms}
                              href={
                                `/explore/universities/${u.name
                                  .toLowerCase()
                                  .replace(/[^a-z0-9\s-]/g, "")
                                  .replace(
                                    /\s+/g,
                                    "-",
                                  )}-${u.idSp.substring(0, 6)}/prodi/${encodeURIComponent(item.idSms)}` as any
                              }
                            >
                              <div className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-brand-navy/5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-navy/10 to-brand-orange/10">
                                  <Building2 className="h-4 w-4 text-brand-navy/60" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-bricolage font-semibold text-brand-navy text-sm transition-colors group-hover:text-brand-orange">
                                    {u.name}
                                  </p>
                                  <div className="mt-0.5 flex items-center gap-2">
                                    {u.type && (
                                      <span className="font-manrope text-[10px] text-text-muted-custom">{u.type}</span>
                                    )}
                                    {u.province && (
                                      <span className="font-manrope text-[10px] text-text-muted-custom">
                                        <MapPin className="mr-0.5 inline h-3 w-3" />
                                        {u.province}
                                      </span>
                                    )}
                                    {item.accreditation && (
                                      <Badge
                                        variant="outline"
                                        className={`font-manrope text-[10px] ${accStyles[item.accreditation] ?? ""}`}
                                      >
                                        {item.accreditation}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-orange" />
                              </div>
                            </Link>
                          );
                        })}
                        {!showAllLevels.has(group.level) && items.length > 10 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(showAllLevels);
                              next.add(group.level);
                              setShowAllLevels(next);
                            }}
                            className="w-full px-5 py-2.5 text-center font-manrope text-[10px] text-brand-orange transition-colors hover:bg-brand-orange/5"
                          >
                            Tampilkan semua ({items.length})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
