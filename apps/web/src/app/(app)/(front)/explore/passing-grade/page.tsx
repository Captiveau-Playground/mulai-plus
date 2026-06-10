"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, type LucideIcon, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { JsonLd } from "@/components/JsonLd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trackEvent } from "@/lib/analytics";
import { getProgramIcon } from "@/lib/program-icons";
import { orpc } from "@/utils/orpc";

// biome-ignore lint/suspicious/noExplicitAny: orpc inferred type is complex
const api = orpc as any;

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function PassingGradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const debounced = useDebounce(query, 300);
  const prevSearch = useRef("");
  useEffect(() => {
    if (debounced && debounced !== prevSearch.current) {
      trackEvent("search_query", { page: "passing_grade", query: debounced });
      prevSearch.current = debounced;
    }
  }, [debounced]);
  const [level, setLevel] = useState(searchParams.get("level") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "pg");

  // Sync query → URL
  useEffect(() => {
    if (query !== urlQuery) {
      const p = new URLSearchParams();
      if (query) p.set("q", query);
      if (level !== "all") p.set("level", level);
      if (sortBy !== "pg") p.set("sort", sortBy);
      const qs = p.toString();
      // biome-ignore lint/suspicious/noExplicitAny: dynamic route with query params
      router.replace(`/explore/passing-grade${qs ? `?${qs}` : ""}` as any, { scroll: false });
    }
  }, [query, level, sortBy, urlQuery, router.replace]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

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

  const [page, setPage] = useState(0);
  const pageSize = 12;

  const { data: _d, isLoading } = useQuery({
    ...api.pddikti.publicSearchPassingGrade.queryOptions({
      input: {
        query: debounced,
        level: level === "all" ? undefined : level,
        sortBy: sortBy as "name" | "pg" | "applicants",
        sortOrder: sortBy === "name" ? "asc" : "desc",
        page: page + 1,
        pageSize,
      },
    }),
    enabled: true,
    staleTime: 1000 * 60 * 5,
  });

  // Suggestions (faster debounce)
  const suggestDebounce = useDebounce(query, 200);
  const { data: _sg } = useQuery({
    ...api.pddikti.publicSearchPassingGrade.queryOptions({
      input: {
        query: suggestDebounce || "___",
        page: 1,
        pageSize: 5,
      },
    }),
    enabled: suggestDebounce.length > 0,
    staleTime: 1000 * 30,
  });
  // biome-ignore lint/suspicious/noExplicitAny: query result shape
  const suggestions = (_sg as any)?.data ?? [];
  const { data: _lv } = useQuery({ ...api.pddikti.publicListProgramLevels.queryOptions(), enabled: true });

  // biome-ignore lint/suspicious/noExplicitAny: query result shape
  const d = _d as any;
  const levels = (_lv as string[]) ?? [];
  const items = d?.data ?? [];
  const total = d?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    name: "Cek Passing Grade SNBP/SNBT — MULAI+",
    description:
      "Cek passing grade, daya tampung, dan tingkat keketatan SNBP/SNBT untuk ribuan program studi di 146 PTN Indonesia.",
  };

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={jsonLd} />

      <section className="relative bg-brand-navy pt-20 sm:pt-24">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy to-brand-navy/80" />
        <div
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange shadow-lg">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
          </div>
          <h1 className="font-bold font-bricolage text-4xl text-white leading-tight sm:text-5xl lg:text-6xl">
            Cek Passing Grade
          </h1>
          <p className="mt-3 font-manrope text-lg text-white/70">
            Cari tahu tingkat keketatan jurusan di setiap PTN. Data SNBP 5 tahun terakhir.
          </p>
          <div className="relative mx-auto mt-8 w-full max-w-xl">
            <div
              ref={inputRef}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.07] px-5 py-3.5 shadow-sm backdrop-blur-sm transition-all focus-within:border-white/30 focus-within:bg-white/[0.12]"
            >
              <Search className="h-4 w-4 shrink-0 text-white/50" />
              <Input
                placeholder="Cari jurusan, misal: Kedokteran"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                  setShowSuggestions(true);
                }}
                onFocus={() => query && setShowSuggestions(true)}
                className="h-auto min-w-0 flex-1 rounded-2xl border-0 bg-transparent px-1 font-manrope text-sm text-white shadow-none outline-none ring-0 placeholder:text-white/40 focus:outline-none focus:ring-0 focus-visible:ring-0"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setShowSuggestions(false);
                  }}
                  className="shrink-0 rounded-full p-0.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestRef}
                className="absolute top-full right-0 left-0 z-[100] mt-1 overflow-hidden rounded-xl border bg-white shadow-lg"
              >
                {
                  // biome-ignore lint/suspicious/noExplicitAny: suggestion shape
                  suggestions.slice(0, 5).map((s: any) => (
                    <button
                      key={`${s.name}-${s.level}`}
                      type="button"
                      onClick={() => {
                        router.push(`/explore/passing-grade?q=${encodeURIComponent(s.name)}`);
                        setQuery(s.name);
                        setShowSuggestions(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-navy/5"
                    >
                      {(() => {
                        const Icon: LucideIcon = getProgramIcon(s.name);
                        return <Icon className="h-4 w-4 shrink-0 text-brand-navy/40" />;
                      })()}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm text-text-main">{s.name}</p>
                        <p className="font-manrope text-[10px] text-text-muted-custom">
                          {s.level}
                          {s.minPg && s.maxPg ? ` · PG ${s.minPg}–${s.maxPg}` : ""}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="font-manrope font-medium text-[10px] text-text-muted-custom uppercase tracking-wider">
                Jenjang
              </Label>
              <Select
                value={level}
                onValueChange={(v) => {
                  setLevel(v ?? "all");
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-[130px] rounded-xl border-gray-200 font-manrope text-xs">
                  <SelectValue />
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
            <div className="space-y-1">
              <Label className="font-manrope font-medium text-[10px] text-text-muted-custom uppercase tracking-wider">
                Urutkan
              </Label>
              <Select
                value={sortBy}
                onValueChange={(v) => {
                  setSortBy(v ?? "pg");
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-[180px] rounded-xl border-gray-200 font-manrope text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pg">PG Terendah</SelectItem>
                  <SelectItem value="name">Nama A-Z</SelectItem>
                  <SelectItem value="applicants">Peminat Terbanyak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="ml-auto pb-0.5 font-manrope text-text-muted-custom text-xs">{total} program</p>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading && items.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <BarChart3 className="h-12 w-12 text-text-muted-custom" />
              <p className="font-manrope text-lg text-text-muted-custom">Tidak ada data</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* biome-ignore lint/suspicious/noExplicitAny: item shape from API */}
              {items.map((item: any) => {
                const pgNum = item.minPg ? Number.parseFloat(item.minPg) : null;
                return (
                  <Link
                    key={`${item.name}-${item.level}`}
                    href={`/explore/study-programs/${item.slug}`}
                    className="block"
                    onClick={() => trackEvent("pg_click_program", { program: item.name })}
                  >
                    <div className="group flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md">
                      <div className="flex flex-1 flex-col p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-navy/10 to-brand-orange/10">
                            {(() => {
                              const Icon: LucideIcon = getProgramIcon(item.name);
                              return <Icon className="h-4 w-4 text-brand-navy/60" />;
                            })()}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.level && (
                              <span className="rounded-md bg-brand-navy/10 px-1.5 py-0.5 font-manrope font-semibold text-[9px] text-brand-navy">
                                {item.level}
                              </span>
                            )}
                          </div>
                        </div>
                        <h3 className="line-clamp-2 font-bold font-bricolage text-brand-navy text-sm leading-snug transition-colors group-hover:text-brand-orange">
                          {item.name}
                        </h3>
                        <div className="mt-auto pt-3">
                          <div className="flex items-center justify-between">
                            <span className="font-manrope text-[10px] text-text-muted-custom">{item.uniCount} PTN</span>
                            {item.minPg && item.maxPg && (
                              <span className="font-bold font-bricolage text-brand-navy text-sm">
                                {item.minPg}–{item.maxPg}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            {item.avgApplicants > 0 && (
                              <span className="font-manrope text-[10px] text-text-muted-custom">
                                Ø {item.avgApplicants.toLocaleString()} peminat
                              </span>
                            )}
                            {pgNum !== null && (
                              <span
                                className={`font-manrope font-semibold text-[10px] ${pgNum <= 2 ? "text-green-600" : pgNum <= 5 ? "text-yellow-600" : pgNum <= 10 ? "text-orange-600" : "text-blue-600"}`}
                              >
                                {pgNum <= 2 ? "Terketat" : pgNum <= 5 ? "Ketat" : pgNum <= 10 ? "Sedang" : "Longgar"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2 sm:mt-12">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  trackEvent("pagination", { page: "passing_grade", action: "first" });
                  setPage(0);
                }}
                disabled={page === 0}
                className="rounded-full font-manrope"
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  trackEvent("pagination", { page: "passing_grade", action: "prev" });
                  setPage((p) => Math.max(0, p - 1));
                }}
                disabled={page === 0}
                className="rounded-full font-manrope"
              >
                Prev
              </Button>
              <span className="px-3 font-manrope text-text-muted-custom text-xs">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  trackEvent("pagination", { page: "passing_grade", action: "next" });
                  setPage((p) => Math.min(totalPages - 1, p + 1));
                }}
                disabled={page >= totalPages - 1}
                className="rounded-full font-manrope"
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  trackEvent("pagination", { page: "passing_grade", action: "last" });
                  setPage(totalPages - 1);
                }}
                disabled={page >= totalPages - 1}
                className="rounded-full font-manrope"
              >
                Last
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden bg-brand-navy py-16 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy to-brand-navy/80" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Sparkles className="mx-auto h-8 w-8 text-brand-orange" />
          <h2 className="mt-3 font-bold font-bricolage text-2xl text-white sm:text-3xl">
            Ingin tahu strategi lolos SNBP?
          </h2>
          <p className="mt-2 font-manrope text-white/70">Konsultasi gratis dengan mentor kami.</p>
          <Button
            className="mt-6 rounded-full bg-brand-orange px-8 font-manrope text-white shadow-lg hover:bg-brand-orange/90"
            onClick={() => trackEvent("cta_click", { page: "passing_grade" })}
          >
            Konsultasi Gratis <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function PassingGradePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-navy border-t-transparent" />
        </div>
      }
    >
      <PassingGradeContent />
    </Suspense>
  );
}
