"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, BookOpen, Building2, Loader2, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const api = orpc as any;

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

export function ExploreSection() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<"university" | "program">("program");
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const debounced = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close results on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Fetch pool of data to pick popular items ──
  const { data: _popularUni } = useQuery({
    ...api.pddikti.publicListUniversities.queryOptions({
      input: { page: 1, pageSize: 100 },
    }),
    staleTime: 1000 * 60 * 10,
  });
  const { data: _popularProg } = useQuery({
    ...api.pddikti.publicSearchPrograms.queryOptions({
      input: { page: 1, pageSize: 100 },
    }),
    staleTime: 1000 * 60 * 10,
  });

  // ── Search queries ──
  const { data: _uniResults, isFetching: isFetchingUni } = useQuery({
    ...api.pddikti.publicListUniversities.queryOptions({
      input: {
        search: debounced || undefined,
        page: 1,
        pageSize: 5,
      },
    }),
    enabled: searchMode === "university" && debounced.length >= 2,
    staleTime: 1000 * 30,
  });
  const { data: _progResults, isFetching: isFetchingProg } = useQuery({
    ...api.pddikti.publicSearchPrograms.queryOptions({
      input: { query: debounced, page: 1, pageSize: 5 },
    }),
    enabled: searchMode === "program" && debounced.length >= 2,
    staleTime: 1000 * 30,
  });

  // ── Totals ──
  const { data: _uni } = useQuery({
    ...api.pddikti.publicListUniversities.queryOptions({
      input: { page: 1, pageSize: 1 },
    }),
    staleTime: 1000 * 60 * 10,
  });
  const { data: _prog } = useQuery({
    ...api.pddikti.publicSearchPrograms.queryOptions({
      input: { page: 1, pageSize: 1 },
    }),
    staleTime: 1000 * 60 * 10,
  });

  // Well-known popular universities & programs to filter from pool
  const POPULAR_UNI_NAMES = [
    "Universitas Gadjah Mada",
    "Institut Teknologi Bandung",
    "Universitas Indonesia",
    "Universitas Brawijaya",
    "Institut Teknologi Sepuluh Nopember",
    "Universitas Padjadjaran",
    "Universitas Diponegoro",
    "Universitas Airlangga",
  ];
  const POPULAR_PROGRAM_NAMES = [
    "Kedokteran",
    "Teknik Informatika",
    "Manajemen",
    "Hukum",
    "Psikologi",
    "Teknik Sipil",
    "Akuntansi",
    "Ilmu Komunikasi",
  ];

  const allUnis = (_popularUni as any)?.data ?? [];
  const allProgs = (_popularProg as any)?.data ?? [];

  // Filter pool by known popular names (preserves DB order for matching)
  const popularUnis = POPULAR_UNI_NAMES.map((name) => allUnis.find((u: any) => u.name === name)).filter(Boolean);
  const popularProgs = POPULAR_PROGRAM_NAMES.map((name) => allProgs.find((p: any) => p.name === name)).filter(Boolean);
  const uniResults = (_uniResults as any)?.data ?? [];
  const progResults = (_progResults as any)?.data ?? [];
  const isFetching = searchMode === "university" ? isFetchingUni : isFetchingProg;
  const totalUni = (_uni as any)?.total ?? 408;
  const totalProg = (_prog as any)?.total ?? 18881;

  // ── Slug helpers (mirror backend logic) ──
  function uniSlug(name: string, id: string) {
    return `${name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")}-${id.substring(0, 6)}`;
  }

  function handleSelect(type: "university" | "program", slug: string) {
    setShowResults(false);
    setQuery("");
    if (type === "university") {
      router.push(`/explore/universities/${slug}`);
    } else {
      router.push(`/explore/study-programs/${slug}`);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setShowResults(false);
    if (searchMode === "university") {
      router.push(`/explore/universities?search=${encodeURIComponent(query)}`);
    } else {
      router.push(`/explore/study-programs?q=${encodeURIComponent(query)}`);
    }
  }

  const activePopular = searchMode === "university" ? popularUnis : popularProgs;

  return (
    <section className="relative w-full bg-white py-20 lg:py-28">
      {/* Background decorations — wrapped to avoid clipping dropdown */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 right-0 -z-0 hidden w-1/2 bg-gradient-to-l from-brand-navy/[0.02] to-transparent lg:block" />
        <div className="pointer-events-none absolute top-1/4 right-1/4 -z-0 h-80 w-80 rounded-full bg-brand-navy/[0.02] blur-[100px]" />
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
          {/* ════════ LEFT: Search (LG: ~50%) ════════ */}
          <div className="w-full lg:w-1/2 lg:shrink-0">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Badge */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-navy/10 bg-brand-navy/5 px-4 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
                <span className="font-manrope font-semibold text-[11px] text-brand-navy/60 uppercase tracking-wider">
                  Data Explorer
                </span>
              </div>

              <h2 className="font-bold font-bricolage text-3xl text-brand-navy leading-tight sm:text-4xl lg:text-5xl">
                Cari Universitas &amp; <br />
                Program Studi Favoritmu
              </h2>

              <p className="mt-4 max-w-lg font-manrope text-sm text-text-muted-custom leading-relaxed sm:text-base">
                Temukan informasi lengkap perguruan tinggi, jurusan, dan passing grade. Semua data dari sumber resmi dan
                diperbarui berkala.
              </p>
            </motion.div>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.6,
                delay: 0.15,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="mt-8"
              ref={panelRef}
            >
              {/* Tabs */}
              <div className="mb-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode("program");
                    setQuery("");
                    setShowResults(false);
                  }}
                  className={cn(
                    "rounded-full px-4 py-2 font-manrope font-medium text-sm transition-all",
                    searchMode === "program"
                      ? "bg-brand-navy text-white shadow-sm"
                      : "text-text-muted-custom hover:bg-brand-navy/5 hover:text-brand-navy",
                  )}
                >
                  <BookOpen className="mr-1.5 inline-block h-3.5 w-3.5" />
                  Program Studi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode("university");
                    setQuery("");
                    setShowResults(false);
                  }}
                  className={cn(
                    "rounded-full px-4 py-2 font-manrope font-medium text-sm transition-all",
                    searchMode === "university"
                      ? "bg-brand-navy text-white shadow-sm"
                      : "text-text-muted-custom hover:bg-brand-navy/5 hover:text-brand-navy",
                  )}
                >
                  <Building2 className="mr-1.5 inline-block h-3.5 w-3.5" />
                  Universitas
                </button>
              </div>

              {/* Search Input */}
              <form onSubmit={handleSubmit} className="relative">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all sm:gap-3 sm:px-5 sm:py-3.5",
                    showResults && debounced.length >= 2
                      ? "border-brand-navy/30 shadow-md"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                >
                  <Search className="h-4 w-4 shrink-0 text-text-muted-custom sm:h-5 sm:w-5" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => {
                      if (query.length >= 2) setShowResults(true);
                    }}
                    placeholder={searchMode === "university" ? "Cari universitas..." : "Cari program studi..."}
                    className="h-auto min-w-0 flex-1 rounded-2xl border-0 bg-transparent px-1 font-manrope text-sm text-text-main shadow-none outline-none ring-0 placeholder:text-text-muted-custom/50 focus:outline-none focus:ring-0"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setShowResults(false);
                        inputRef.current?.focus();
                      }}
                      className="shrink-0 rounded-full p-1 text-text-muted-custom/50 transition-colors hover:bg-gray-100 hover:text-text-muted-custom"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {isFetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-navy/40" />}
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-brand-navy px-4 py-1.5 font-manrope font-medium text-white text-xs transition-all hover:bg-brand-navy/90 sm:px-5 sm:py-2 sm:text-sm"
                  >
                    Cari
                  </button>
                </div>

                {/* Dropdown Results */}
                {showResults && debounced.length >= 2 && (
                  <div className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="max-h-80 overflow-y-auto">
                      {isFetching ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-brand-navy/40" />
                        </div>
                      ) : searchMode === "university" && uniResults.length > 0 ? (
                        <div>
                          {uniResults.map((u: any) => (
                            <button
                              key={u.idSp}
                              type="button"
                              onClick={() => handleSelect("university", uniSlug(u.name, u.idSp))}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-navy/5"
                            >
                              <Building2 className="h-4 w-4 shrink-0 text-text-muted-custom" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-manrope font-medium text-sm text-text-main">{u.name}</p>
                                <p className="font-manrope text-[11px] text-text-muted-custom">
                                  {u.province}
                                  {u.accreditation ? ` · Akreditasi ${u.accreditation}` : ""}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 shrink-0 text-text-muted-custom/30" />
                            </button>
                          ))}
                          <Link
                            href={`/explore/universities?search=${encodeURIComponent(query)}`}
                            onClick={() => setShowResults(false)}
                            className="flex items-center justify-center gap-2 border-gray-100 border-t px-4 py-3 font-manrope font-medium text-brand-navy text-xs transition-colors hover:bg-brand-navy/5"
                          >
                            Lihat semua hasil
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      ) : searchMode === "program" && progResults.length > 0 ? (
                        <div>
                          {progResults.map((p: any) => (
                            <button
                              key={p.slug}
                              type="button"
                              onClick={() => handleSelect("program", p.slug)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-navy/5"
                            >
                              <BookOpen className="h-4 w-4 shrink-0 text-text-muted-custom" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-manrope font-medium text-sm text-text-main">{p.name}</p>
                                <p className="font-manrope text-[11px] text-text-muted-custom">
                                  {p.uniCount} universitas
                                  {p.levels?.length > 0 ? ` · ${p.levels.join(", ")}` : ""}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 shrink-0 text-text-muted-custom/30" />
                            </button>
                          ))}
                          <Link
                            href={`/explore/study-programs?q=${encodeURIComponent(query)}`}
                            onClick={() => setShowResults(false)}
                            className="flex items-center justify-center gap-2 border-gray-100 border-t px-4 py-3 font-manrope font-medium text-brand-navy text-xs transition-colors hover:bg-brand-navy/5"
                          >
                            Lihat semua hasil
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                          <Search className="h-8 w-8 text-gray-200" />
                          <p className="font-manrope text-sm text-text-muted-custom">
                            Tidak ditemukan untuk &ldquo;{debounced}&rdquo;
                          </p>
                          <p className="font-manrope text-text-muted-custom/60 text-xs">Coba kata kunci lain</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>

              {/* Popular Picks */}
              <div className="mt-5">
                <div className="mb-3 flex items-center gap-1.5">
                  <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-orange/20">
                    <Sparkles className="h-2 w-2 text-brand-orange" />
                  </div>
                  <span className="font-manrope font-medium text-text-muted-custom/60 text-xs uppercase tracking-wider">
                    {searchMode === "university" ? "Universitas Populer" : "Program Studi Populer"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activePopular.length > 0 ? (
                    activePopular.slice(0, 6).map((item: any) => {
                      const slug = searchMode === "university" ? uniSlug(item.name, item.idSp) : item.slug;
                      return (
                        <button
                          key={slug}
                          type="button"
                          onClick={() => handleSelect(searchMode, slug)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-manrope font-medium text-xs transition-all",
                            "border-brand-navy/10 bg-white text-text-muted-custom shadow-sm",
                            "hover:border-brand-navy/30 hover:bg-brand-navy/5 hover:text-brand-navy",
                          )}
                        >
                          {searchMode === "university" ? (
                            <Building2 className="h-3 w-3 shrink-0" />
                          ) : (
                            <BookOpen className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{item.name}</span>
                        </button>
                      );
                    })
                  ) : (
                    <>
                      <div className="h-7 w-24 animate-pulse rounded-full bg-gray-100" />
                      <div className="h-7 w-28 animate-pulse rounded-full bg-gray-100" />
                      <div className="h-7 w-20 animate-pulse rounded-full bg-gray-100" />
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* ════════ RIGHT: Stats + Links (LG: ~50%) ════════ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              duration: 0.7,
              delay: 0.2,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="w-full lg:w-1/2 lg:pt-16"
          >
            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="py-5 text-center">
                <p className="font-bold font-bricolage text-brand-navy text-xl sm:text-2xl">
                  {totalUni.toLocaleString()}
                </p>
                <p className="mt-0.5 font-manrope font-semibold text-[10px] text-text-muted-custom/60 uppercase tracking-wider">
                  Universitas
                </p>
              </div>
              <div className="py-5 text-center">
                <p className="font-bold font-bricolage text-brand-navy text-xl sm:text-2xl">
                  {totalProg.toLocaleString()}
                </p>
                <p className="mt-0.5 font-manrope font-semibold text-[10px] text-text-muted-custom/60 uppercase tracking-wider">
                  Program Studi
                </p>
              </div>
              <div className="py-5 text-center">
                <p className="font-bold font-bricolage text-brand-navy text-xl sm:text-2xl">38</p>
                <p className="mt-0.5 font-manrope font-semibold text-[10px] text-text-muted-custom/60 uppercase tracking-wider">
                  Provinsi
                </p>
              </div>
            </div>

            {/* Category Cards */}
            <div className="mt-6 space-y-3">
              {[
                {
                  href: "/explore/universities" as any,
                  title: "Universitas",
                  subtitle: `${totalUni.toLocaleString()} PT · Akreditasi, biaya kuliah, & statistik`,
                  icon: Building2,
                },
                {
                  href: "/explore/study-programs" as any,
                  title: "Program Studi",
                  subtitle: `${totalProg.toLocaleString()} jurusan · Cari berdasarkan minat`,
                  icon: BookOpen,
                },
                {
                  href: "/explore/passing-grade" as any,
                  title: "Passing Grade",
                  subtitle: "146 PTN · Data SNBP/SNBT 2021–2025",
                  icon: BarChart3,
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.href} href={card.href} className="group block">
                    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-navy/20 hover:shadow-md">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy/10 to-brand-orange/10">
                        <Icon className="h-6 w-6 text-brand-navy/60" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold font-bricolage text-brand-navy transition-colors group-hover:text-brand-orange">
                          {card.title}
                        </p>
                        <p className="font-manrope text-text-muted-custom text-xs">{card.subtitle}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-gray-200 transition-all group-hover:translate-x-0.5 group-hover:text-brand-orange" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* CTA */}
            <div className="mt-6">
              <Link href="/explore">
                <Button className="w-full rounded-full border-none bg-brand-navy px-6 font-manrope text-sm text-white shadow-sm transition-all hover:bg-brand-navy/90 hover:shadow-md">
                  Jelajahi Semua Data
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
