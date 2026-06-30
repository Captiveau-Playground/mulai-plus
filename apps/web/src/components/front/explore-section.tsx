"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Loader2,
  MessageCircleMore,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

  const { data: _popularUni } = useQuery({
    ...api.pddikti.publicListUniversities.queryOptions({ input: { page: 1, pageSize: 100 } }),
    staleTime: 1000 * 60 * 10,
  });
  const { data: _popularProg } = useQuery({
    ...api.pddikti.publicSearchPrograms.queryOptions({ input: { page: 1, pageSize: 100 } }),
    staleTime: 1000 * 60 * 10,
  });

  const { data: _uniResults, isFetching: isFetchingUni } = useQuery({
    ...api.pddikti.publicListUniversities.queryOptions({
      input: { search: debounced || undefined, page: 1, pageSize: 5 },
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

  const { data: _uni } = useQuery({
    ...api.pddikti.publicGetUniversitySlugs.queryOptions(),
    staleTime: 1000 * 60 * 60,
  });
  const { data: _prog } = useQuery({
    ...api.pddikti.publicGetAllProdiForSitemap.queryOptions(),
    staleTime: 1000 * 60 * 60,
  });

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
  const popularUnis = POPULAR_UNI_NAMES.map((name) => allUnis.find((u: any) => u.name === name)).filter(Boolean);
  const popularProgs = POPULAR_PROGRAM_NAMES.map((name) => allProgs.find((p: any) => p.name === name)).filter(Boolean);
  const uniResults = (_uniResults as any)?.data ?? [];
  const progResults = (_progResults as any)?.data ?? [];
  const isFetching = searchMode === "university" ? isFetchingUni : isFetchingProg;
  const totalUni = Array.isArray(_uni) ? _uni.length : 335;
  const totalProg = Array.isArray(_prog) ? _prog.length : 14752;

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
    router.push(type === "university" ? `/explore/universities/${slug}` : `/explore/study-programs/${slug}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setShowResults(false);
    router.push(
      searchMode === "university"
        ? `/explore/universities?search=${encodeURIComponent(query)}`
        : `/explore/study-programs?q=${encodeURIComponent(query)}`,
    );
  }

  const activePopular = searchMode === "university" ? popularUnis : popularProgs;

  // Show search bar + results first on mobile
  const SearchSection = (
    <div ref={panelRef} className="relative z-20">
      {/* Search tabs + input */}
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

      <form onSubmit={handleSubmit} className="relative z-10">
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all sm:gap-3 sm:px-5 sm:py-3.5",
            showResults && debounced.length >= 2 ? "border-brand-navy/30 shadow-md" : "border-gray-200",
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
            placeholder={searchMode === "university" ? "Cari universitas..." : "Cari jurusan/prodi..."}
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
              className="shrink-0 rounded-full p-1 text-text-muted-custom/50 transition-colors hover:bg-gray-100"
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

        {showResults && debounced.length >= 2 && (
          <div className="absolute top-full right-0 left-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="max-h-80 overflow-y-auto rounded-xl">
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
                          {u.accreditation ? ` · ${u.accreditation}` : ""}
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
                    Lihat semua hasil <ArrowRight className="h-3.5 w-3.5" />
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
                          {p.uniCount} universitas{p.levels?.length > 0 ? ` · ${p.levels.join(", ")}` : ""}
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
                    Lihat semua hasil <ArrowRight className="h-3.5 w-3.5" />
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
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-brand-orange" />
          <span className="font-manrope font-medium text-[10px] text-text-muted-custom/60 uppercase tracking-wider">
            {searchMode === "university" ? "Populer" : "Populer"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {activePopular.length > 0 ? (
            activePopular.slice(0, 5).map((item: any) => {
              const slug = searchMode === "university" ? uniSlug(item.name, item.idSp) : item.slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => handleSelect(searchMode, slug)}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-navy/10 bg-white px-2.5 py-1 font-manrope font-medium text-[11px] text-text-muted-custom shadow-sm transition-all hover:border-brand-navy/30 hover:bg-brand-navy/5 hover:text-brand-navy"
                >
                  <span className="max-w-[80px] truncate sm:max-w-[120px]">{item.name}</span>
                </button>
              );
            })
          ) : (
            <>
              <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
              <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
              <div className="h-6 w-28 animate-pulse rounded-full bg-gray-100" />
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section aria-label="Eksplorasi" className="relative w-full bg-bg-light py-14 lg:py-28">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
          {/* ═══ LEFT: Search (mobile-first) ═══ */}
          <div className="w-full lg:w-1/2 lg:shrink-0">
            {/* Badge - compact on mobile */}
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-navy/10 bg-white px-3 py-1">
              <Sparkles className="h-3 w-3 text-brand-orange" />
              <span className="font-manrope font-semibold text-[10px] text-brand-navy/60 uppercase tracking-wider">
                Data Explorer
              </span>
            </div>

            <h2 className="font-bold font-bricolage text-2xl text-brand-navy leading-tight sm:text-3xl lg:text-5xl">
              Cari <span className="text-brand-red">Jurusan</span> atau{" "}
              <span className="text-brand-red">Universitas</span>mu
            </h2>

            <p className="mt-2 mb-5 max-w-lg font-manrope text-sm text-text-muted-custom leading-relaxed sm:text-base">
              Data passing grade, akreditasi, dari 335+ PT dan 15.000+ prodi se-Indonesia.
            </p>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {SearchSection}
            </motion.div>
          </div>

          {/* ═══ RIGHT: Stats + Links ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full lg:w-1/2 lg:pt-8"
          >
            {/* Stats - compact on mobile */}
            <div className="grid grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm">
              {[
                { value: totalUni.toLocaleString(), label: "Universitas" },
                { value: totalProg.toLocaleString(), label: "Program Studi" },
                { value: "38", label: "Provinsi" },
              ].map((s) => (
                <div key={s.label} className="py-4 text-center md:py-5">
                  <p className="font-bold font-bricolage text-brand-navy text-lg sm:text-xl md:text-2xl">{s.value}</p>
                  <p className="mt-0.5 font-manrope font-semibold text-[9px] text-text-muted-custom/60 uppercase tracking-wider md:text-[10px]">
                    {s.label.split(" ")[0]}
                    <span className="hidden sm:inline">
                      {s.label.includes(" ") ? ` ${s.label.split(" ").slice(1).join(" ")}` : ""}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {/* Category Cards - horizontal scroll on mobile */}
            <div className="scrollbar-none mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto md:mt-6 md:grid md:snap-none md:grid-cols-2 md:gap-3 md:overflow-visible">
              {[
                {
                  href: "/explore/universities" as any,
                  title: "Universitas",
                  subtitle: `${totalUni.toLocaleString()} PT`,
                  icon: Building2,
                },
                {
                  href: "/explore/study-programs" as any,
                  title: "Program Studi",
                  subtitle: `${totalProg.toLocaleString()} jurusan`,
                  icon: BookOpen,
                },
                { href: "/explore/passing-grade" as any, title: "Passing Grade", subtitle: "146 PTN", icon: BarChart3 },
                {
                  href: "/explore" as any,
                  title: "Tanya Chatbot AI",
                  subtitle: "Cari pake bahasa",
                  icon: MessageCircleMore,
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.href} href={card.href} className="group shrink-0 snap-start md:shrink">
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-brand-navy/20 hover:shadow-md md:gap-4 md:p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy/10 md:h-12 md:w-12">
                        <Icon className="h-5 w-5 text-brand-navy/60 md:h-6 md:w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold font-bricolage text-brand-navy text-xs transition-colors group-hover:text-brand-orange md:text-sm">
                          {card.title}
                        </p>
                        <p className="font-manrope text-[10px] text-text-muted-custom md:text-xs">{card.subtitle}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-gray-200 transition-all group-hover:translate-x-0.5 group-hover:text-brand-orange md:h-5 md:w-5" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* CTA */}
            <div className="mt-4 md:mt-6">
              <Link href="/explore">
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-full bg-brand-navy px-6 py-3.5 font-bold font-manrope text-sm text-white shadow-sm transition-all hover:bg-brand-navy/90 hover:shadow-md active:scale-[0.98] md:py-4"
                >
                  Jelajahi Semua Data
                  <ArrowRight className="ml-1.5 inline-block h-4 w-4" />
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <style>
        {
          ".scrollbar-none::-webkit-scrollbar { display: none; } .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }"
        }
      </style>
    </section>
  );
}
