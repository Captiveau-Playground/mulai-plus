"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, GraduationCap, Loader2, MapPin, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const api = orpc as any;

function slugify(name: string, id: string) {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")}-${id.substring(0, 6)}`;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function UniversitiesPage() {
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [type, setType] = useState("all");
  const [province, setProvince] = useState("all");
  const [accreditation, setAccreditation] = useState("all");
  const pageSize = 12;

  const search = useDebounce(searchInput, 400);

  const {
    data: _data,
    isLoading,
    isFetching,
  } = useQuery({
    ...api.pddikti.publicListUniversities.queryOptions({
      input: {
        page: page + 1,
        pageSize,
        search: search || undefined,
        type: type === "all" ? undefined : type,
        province: province === "all" ? undefined : province,
        accreditation: accreditation === "all" ? undefined : accreditation,
      },
    }),
    staleTime: 1000 * 60 * 5,
  });
  const { data: _provinces } = useQuery(api.pddikti.publicListProvinces.queryOptions());
  const { data: _types } = useQuery(api.pddikti.publicListTypes.queryOptions());
  const { data: _accreditations } = useQuery(api.pddikti.publicListAccreditations.queryOptions());

  const data = _data as any;
  const universities = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const provinces = _provinces as string[] | undefined;
  const types = _types as string[] | undefined;
  const accreditations = _accreditations as string[] | undefined;

  const resetFilters = () => {
    setSearchInput("");
    setType("all");
    setProvince("all");
    setAccreditation("all");
    setPage(0);
  };
  const hasFilters = search || type !== "all" || province !== "all" || accreditation !== "all";

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-navy pt-20 sm:pt-24">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy to-brand-navy/80" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange shadow-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <h1 className="font-bold font-bricolage text-4xl text-white tracking-tight md:text-5xl">
              Cari Universitas Impianmu
            </h1>
            <p className="mt-3 font-manrope text-lg text-white/70">
              Jelajahi {total.toLocaleString()} perguruan tinggi terbaik Indonesia. Lengkap dengan data akreditasi,
              program studi, dan daya tampung.
            </p>
            <div className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari universitas..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setPage(0);
                  }}
                  className="w-full rounded-full border-0 bg-white/10 pl-10 text-sm text-white placeholder:text-white/40 focus-visible:ring-white/30"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="font-manrope font-medium text-[10px] text-text-muted-custom uppercase tracking-wider">
                Tipe
              </Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v ?? "all");
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-[130px] rounded-xl border-gray-200 font-manrope text-xs">
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  {types?.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="font-manrope font-medium text-[10px] text-text-muted-custom uppercase tracking-wider">
                Provinsi
              </Label>
              <Select
                value={province}
                onValueChange={(v) => {
                  setProvince(v ?? "all");
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-[160px] rounded-xl border-gray-200 font-manrope text-xs">
                  <SelectValue placeholder="Semua Provinsi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Provinsi</SelectItem>
                  {provinces?.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="font-manrope font-medium text-[10px] text-text-muted-custom uppercase tracking-wider">
                Akreditasi
              </Label>
              <Select
                value={accreditation}
                onValueChange={(v) => {
                  setAccreditation(v ?? "all");
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-[140px] rounded-xl border-gray-200 font-manrope text-xs">
                  <SelectValue placeholder="Semua Akreditasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Akreditasi</SelectItem>
                  {accreditations?.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="pb-0.5 font-manrope text-brand-orange text-xs hover:underline"
              >
                Reset filter
              </button>
            )}
            {isFetching && (
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-1 animate-ping rounded-full bg-brand-navy" />
                <span className="font-manrope text-[10px] text-text-muted-custom">memuat…</span>
              </div>
            )}
            <span className="ml-auto font-manrope text-text-muted-custom text-xs">
              {total.toLocaleString()} universitas
            </span>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading && universities.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
            </div>
          ) : universities.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <Building2 className="h-12 w-12 text-text-muted-custom" />
              <p className="font-manrope text-lg text-text-muted-custom">Tidak ada universitas ditemukan</p>
              <button
                type="button"
                onClick={resetFilters}
                className="font-manrope text-brand-orange text-sm hover:underline"
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {universities.map((u: any) => (
                <Link key={u.idSp} href={`/universities/${slugify(u.name, u.idSp)}` as any}>
                  <div className="group flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md">
                    <div className="flex flex-1 flex-col p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-navy/10 to-brand-orange/10">
                          <Building2 className="h-4 w-4 text-brand-navy/60" />
                        </div>
                        <span
                          className={cn(
                            "font-manrope font-semibold text-[10px] uppercase tracking-wide",
                            u.type === "Negeri" ? "text-blue-600" : "text-orange-600",
                          )}
                        >
                          {u.type}
                        </span>
                        {u.accreditation && (
                          <span
                            className={cn(
                              "font-manrope font-semibold text-[10px]",
                              u.accreditation === "Unggul"
                                ? "text-green-600"
                                : u.accreditation === "Baik Sekali"
                                  ? "text-blue-600"
                                  : "text-yellow-600",
                            )}
                          >
                            {u.accreditation}
                          </span>
                        )}
                      </div>
                      <h3 className="line-clamp-2 font-bold font-bricolage text-brand-navy text-sm leading-snug transition-colors group-hover:text-brand-orange">
                        {u.name}
                      </h3>
                      {u.shortName && (
                        <p className="mt-0.5 font-manrope text-text-muted-custom text-xs">{u.shortName}</p>
                      )}
                      <div className="mt-auto flex items-center gap-3 border-gray-100 border-t pt-3">
                        {u.province && (
                          <div className="flex items-center gap-1 font-manrope text-[10px] text-text-muted-custom">
                            <MapPin className="h-3 w-3" />
                            {u.province}
                          </div>
                        )}
                        {u.totalPrograms != null && (
                          <div className="flex items-center gap-1 font-manrope text-[10px] text-text-muted-custom">
                            <GraduationCap className="h-3 w-3" />
                            {u.totalPrograms} prodi
                          </div>
                        )}
                        <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-orange" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2 sm:mt-12">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="rounded-full font-manrope"
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-full font-manrope"
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="rounded-full font-manrope"
              >
                Last
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-brand-navy py-16 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy to-brand-navy/80" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Sparkles className="mx-auto h-8 w-8 text-brand-orange" />
          <h2 className="mt-3 font-bold font-bricolage text-2xl text-white sm:text-3xl">Bingung milih jurusan?</h2>
          <p className="mt-2 font-manrope text-white/70">
            Tim mentor MulaiPlus siap bantu kamu menentukan pilihan universitas & jurusan terbaik.
          </p>
          <Button className="mt-6 rounded-full bg-brand-orange px-8 font-manrope text-white shadow-lg hover:bg-brand-orange/90">
            Konsultasi Gratis <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
