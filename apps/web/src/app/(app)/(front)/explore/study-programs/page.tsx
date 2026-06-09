"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Building2, GraduationCap, MapPin, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { JsonLd } from "@/components/JsonLd";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

const api = orpc as any;

const accStyles: Record<string, string> = {
  Unggul: "border-green-500/20 bg-green-500/10 text-green-600",
  "Baik Sekali": "border-blue-500/20 bg-blue-500/10 text-blue-600",
  Baik: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function StudyProgramsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailName = searchParams.get("name");
  const urlQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(urlQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedQuery = useDebounce(query, 200);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  // Sync query → URL
  useEffect(() => {
    if (!detailName && query !== urlQuery) {
      const p = new URLSearchParams();
      if (query) p.set("q", query);
      const qs = p.toString();
      router.replace(`/study-programs${qs ? `?${qs}` : ""}` as any, {
        scroll: false,
      });
    }
  }, [query, detailName, urlQuery, router.replace]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestRef.current &&
        !suggestRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      )
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Search results
  const { data: _sd, isLoading: sl } = useQuery({
    ...api.pddikti.publicSearchPrograms.queryOptions({
      input: {
        query: detailName ? "" : debouncedQuery,
        page: page + 1,
        pageSize,
      },
    }),
    enabled: !detailName,
    staleTime: 1000 * 60 * 5,
  });
  const sd = _sd as any;
  const programs = sd?.data ?? [];
  const searchTotal = sd?.total ?? 0;

  const [levelFilter, setLevelFilter] = useState("");
  const { data: _lvl } = useQuery({
    ...api.pddikti.publicListProgramLevels.queryOptions(),
    enabled: !detailName,
    staleTime: 1000 * 60 * 5,
  });
  const levels = (_lvl as string[]) ?? [];

  // Suggestions
  const { data: _sg } = useQuery({
    ...api.pddikti.publicSearchPrograms.queryOptions({
      input: {
        query: debouncedQuery || "___",
        level: levelFilter || undefined,
        page: 1,
        pageSize: 5,
      },
    }),
    enabled: !detailName && debouncedQuery.length > 0,
    staleTime: 1000 * 30,
  });
  const suggestions = (_sg as any)?.data ?? [];

  // Detail
  const { data: _dd, isLoading: dl } = useQuery({
    ...api.pddikti.publicGetProgramBySlug.queryOptions({
      input: { slug: detailName || "" },
    }),
    enabled: !!detailName,
    staleTime: 1000 * 60 * 5,
  });
  const detail = _dd as any;

  // ═══════════════ SEARCH MODE ═══════════════
  if (!detailName) {
    return (
      <div className="min-h-screen bg-white">
        <section className="relative bg-brand-navy pt-20 sm:pt-24">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-navy to-brand-navy/80" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange shadow-lg">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
            </div>
            <h1 className="font-bold font-bricolage text-4xl text-white tracking-tight md:text-5xl">
              {query ? `Cari "${query}"` : "Jelajahi Program Studi"}
            </h1>
            <p className="mt-3 font-manrope text-lg text-white/70">
              {query ? `${searchTotal} jurusan ditemukan` : "Ketik nama jurusan untuk mulai mencari"}
            </p>

            {/* Search + Suggest */}
            <div className="relative mx-auto mt-8 w-full max-w-xl">
              <div className="relative flex items-center" ref={inputRef}>
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari jurusan, misal: Teknik Informatika"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => query && setShowSuggestions(true)}
                  className="w-full rounded-full border-0 bg-white/10 pl-10 text-sm text-white placeholder:text-white/40 focus-visible:ring-white/30"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setShowSuggestions(false);
                    }}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestRef}
                  className="absolute top-full right-0 left-0 z-[100] mt-1 overflow-hidden rounded-xl border bg-white shadow-lg"
                >
                  {suggestions.slice(0, 5).map((s: any) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        router.push(`/study-programs/${s.slug}` as any);
                        setShowSuggestions(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-navy/5"
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-brand-navy/40" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm text-text-main">{s.name}</p>
                        <p className="font-manrope text-[10px] text-text-muted-custom">
                          {s.uniCount} universitas · {s.levels?.join(", ")}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {!detailName && (
          <section className="border-b bg-white">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label className="font-manrope font-medium text-[10px] text-text-muted-custom uppercase tracking-wider">
                    Jenjang
                  </Label>
                  <Select
                    value={levelFilter || "all"}
                    onValueChange={(v) => {
                      setLevelFilter(v === "all" ? "" : (v ?? ""));
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[130px] rounded-xl border-gray-200 font-manrope text-xs">
                      <SelectValue placeholder="Semua Jenjang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Jenjang</SelectItem>
                      {levels.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {levelFilter && (
                  <button
                    type="button"
                    onClick={() => setLevelFilter("")}
                    className="pb-0.5 font-manrope text-brand-orange text-xs hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="py-8 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {sl && programs.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : programs.length === 0 && query ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <BookOpen className="h-12 w-12 text-text-muted-custom" />
                <p className="font-manrope text-lg text-text-muted-custom">
                  Jurusan &quot;{query}&quot; tidak ditemukan
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {programs.map((p: any) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => router.push(`/study-programs/${p.slug}` as any)}
                    className="w-full text-left"
                  >
                    <div className="group flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md">
                      <div className="flex flex-1 flex-col p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-navy/10 to-brand-orange/10">
                            <BookOpen className="h-4 w-4 text-brand-navy/60" />
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {p.levels?.map((l: string) => (
                              <span
                                key={l}
                                className="rounded-md bg-brand-navy/10 px-1.5 py-0.5 font-manrope font-semibold text-[9px] text-brand-navy"
                              >
                                {l}
                              </span>
                            ))}
                          </div>
                        </div>
                        <h3 className="line-clamp-2 font-bold font-bricolage text-brand-navy text-sm leading-snug transition-colors group-hover:text-brand-orange">
                          {p.name}
                        </h3>
                        <div className="mt-auto flex items-center gap-2 pt-3">
                          <GraduationCap className="h-3.5 w-3.5 text-text-muted-custom" />
                          <span className="font-manrope text-[10px] text-text-muted-custom">
                            {p.uniCount} universitas
                          </span>
                          <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-orange" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {true && (
              <div className="mt-8 flex items-center justify-center gap-2 sm:mt-12">
                <button
                  type="button"
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className="rounded-full border border-gray-200 px-3 py-1.5 font-manrope text-text-muted-custom text-xs transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  First
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-full border border-gray-200 px-3 py-1.5 font-manrope text-text-muted-custom text-xs transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="px-3 font-manrope text-text-muted-custom text-xs">
                  Page {page + 1} of {Math.ceil(searchTotal / pageSize)}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(Math.ceil(searchTotal / pageSize) - 1, p + 1))}
                  disabled={page >= Math.ceil(searchTotal / pageSize) - 1}
                  className="rounded-full border border-gray-200 px-3 py-1.5 font-manrope text-text-muted-custom text-xs transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.ceil(searchTotal / pageSize) - 1)}
                  disabled={page >= Math.ceil(searchTotal / pageSize) - 1}
                  className="rounded-full border border-gray-200 px-3 py-1.5 font-manrope text-text-muted-custom text-xs transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  Last
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // ═══════════════ DETAIL MODE ═══════════════
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Study Programs — MULAI+",
    description: "Jelajahi 18.881 program studi dari berbagai perguruan tinggi",
  };

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={jsonLd} />
      <div className="border-b bg-white pt-20 sm:pt-24">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-manrope text-text-muted-custom text-xs">
            <Link href={"/" as any} className="transition-colors hover:text-brand-navy">
              Home
            </Link>
            <span>/</span>
            <Link
              href={`/study-programs${urlQuery ? `?q=${encodeURIComponent(urlQuery)}` : ""}` as any}
              className="transition-colors hover:text-brand-navy"
            >
              Program Studi
            </Link>
            <span>/</span>
            <span className="text-text-main">{detail?.name ?? detailName}</span>
          </div>
        </div>
      </div>

      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              {dl ? (
                <Skeleton className="h-8 w-64" />
              ) : (
                <>
                  <h1 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight md:text-3xl">
                    {detail?.name ?? detailName}
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
          {dl ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : !detail?.levels?.length ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <Building2 className="h-12 w-12 text-text-muted-custom" />
              <p className="font-manrope text-text-muted-custom">Tidak ada data</p>
            </div>
          ) : (
            <div className="space-y-6">
              {detail.levels.map((group: any) => (
                <div key={group.level} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <div className="border-b bg-gradient-to-r from-brand-navy/5 to-brand-orange/5 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-brand-navy/10 px-2.5 py-0.5 font-bold font-bricolage text-brand-navy text-xs">
                        {group.level}
                      </span>
                      <span className="font-manrope text-text-muted-custom text-xs">{group.total} universitas</span>
                    </div>
                  </div>
                  <div className="divide-y">
                    {group.programs.map((item: any) => {
                      const u = item.university;
                      if (!u) return null;
                      return (
                        <Link
                          key={item.idSms}
                          href={
                            `/universities/${u.name
                              .toLowerCase()
                              .replace(/[^a-z0-9\s-]/g, "")
                              .replace(/\s+/g, "-")}-${u.idSp.substring(0, 6)}?prodi=${item.idSms}` as any
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
