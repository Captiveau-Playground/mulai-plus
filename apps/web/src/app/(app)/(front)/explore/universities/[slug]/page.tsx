"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  BookOpen,
  Building2,
  GraduationCap,
  MapPin,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const api = orpc as any;

const accStyles: Record<string, string> = {
  Unggul: "border-green-500/20 bg-green-500/10 text-green-600",
  "Baik Sekali": "border-blue-500/20 bg-blue-500/10 text-blue-600",
  Baik: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600",
};

export default function UniversityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [prodiSearch, setProdiSearch] = useState("");
  const [prodiLevel, setProdiLevel] = useState("all");
  const [prodiSort, setProdiSort] = useState({ field: "name", dir: "asc" as "asc" | "desc" });
  const [prodiPage, setProdiPage] = useState(0);
  const PRODI_PAGE_SIZE = 15;

  const { data: _slugs } = useQuery({
    ...api.pddikti.publicGetUniversitySlugs.queryOptions(),
    staleTime: 1000 * 60 * 60,
  });
  const slugs = (_slugs as any[]) ?? [];
  const match = slugs.find((s: any) => s.slug === slug);
  const id = match?.id;

  const { data: _uni, isLoading } = useQuery({
    ...api.pddikti.publicGetUniversity.queryOptions({ input: { id } }),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
  const uni = _uni as any;

  if (!slug || (!isLoading && !id)) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20 sm:pt-24">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-text-muted-custom" />
          <h2 className="mt-4 font-bold font-bricolage text-brand-navy text-lg">Universitas tidak ditemukan</h2>
          <Link
            href={"/explore/universities" as any}
            className="mt-2 inline-flex items-center gap-1 font-manrope text-brand-orange text-sm hover:underline"
          >
            <ArrowLeft className="h-3 w-3" /> Kembali
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pt-20 sm:pt-24">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!uni) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20 sm:pt-24">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-text-muted-custom" />
          <h2 className="mt-4 font-bold font-bricolage text-brand-navy text-lg">Universitas tidak ditemukan</h2>
          <Link
            href={"/explore/universities" as any}
            className="mt-2 inline-flex items-center gap-1 font-manrope text-brand-orange text-sm hover:underline"
          >
            <ArrowLeft className="h-3 w-3" /> Kembali
          </Link>
        </div>
      </div>
    );
  }

  const allPrograms = (uni?.studyPrograms ?? []) as any[];
  const levels = [...new Set(allPrograms.map((p: any) => p.level).filter(Boolean))] as string[];

  const filteredPrograms = allPrograms
    .filter((p: any) => {
      if (prodiSearch && !p.name.toLowerCase().includes(prodiSearch.toLowerCase())) return false;
      if (prodiLevel !== "all" && p.level !== prodiLevel) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const field = prodiSort.field === "students" ? "totalStudents" : prodiSort.field;
      const aVal = a[field] ?? "";
      const bVal = b[field] ?? "";
      const cmp = typeof aVal === "number" ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return prodiSort.dir === "asc" ? cmp : -cmp;
    });

  const totalProdiPages = Math.ceil(filteredPrograms.length / PRODI_PAGE_SIZE);
  const pagedPrograms = filteredPrograms.slice(prodiPage * PRODI_PAGE_SIZE, (prodiPage + 1) * PRODI_PAGE_SIZE);

  const totalStudents = uni.studyPrograms?.reduce((s: number, p: any) => s + (p.totalStudents ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b bg-white pt-20 sm:pt-24">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 font-manrope text-text-muted-custom text-xs">
            <Link href={"/" as any} className="transition-colors hover:text-brand-navy">
              Home
            </Link>
            <span>/</span>
            <Link href={"/explore/universities" as any} className="transition-colors hover:text-brand-navy">
              Universities
            </Link>
            <span>/</span>
            <span className="text-text-main">{uni.name}</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-navy shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight md:text-3xl">
                {uni.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 font-manrope text-sm text-text-muted-custom">
                {uni.shortName && <span className="font-medium text-text-main">{uni.shortName}</span>}
                {uni.province && (
                  <>
                    <MapPin className="h-3.5 w-3.5" />
                    <span>
                      {uni.province}
                      {uni.regency ? `, ${uni.regency}` : ""}
                    </span>
                  </>
                )}
                <span className="text-gray-300">·</span>
                <span>{uni.totalPrograms ?? "?"} Program Studi</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-manrope text-[10px]",
                    uni.type === "Negeri"
                      ? "border-blue-500/20 bg-blue-500/10 text-blue-600"
                      : "border-orange-500/20 bg-orange-500/10 text-orange-600",
                  )}
                >
                  {uni.type}
                </Badge>
                {uni.accreditation && (
                  <Badge
                    variant="outline"
                    className={cn("font-manrope text-[10px]", accStyles[uni.accreditation] ?? "")}
                  >
                    <Trophy className="mr-1 h-3 w-3" />
                    {uni.accreditation}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="border-green-500/20 bg-green-500/10 font-manrope text-[10px] text-green-600"
                >
                  {uni.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
              <div className="flex items-center justify-between">
                <p className="font-manrope font-medium text-text-muted-custom text-xs">Program Studi</p>
                <BookOpen className="h-4 w-4 text-text-muted-custom" />
              </div>
              <p className="mt-2 font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">
                {uni.totalPrograms ?? "-"}
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
              <div className="flex items-center justify-between">
                <p className="font-manrope font-medium text-text-muted-custom text-xs">Mahasiswa</p>
                <Users className="h-4 w-4 text-text-muted-custom" />
              </div>
              <p className="mt-2 font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">
                {totalStudents.toLocaleString() || "-"}
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
              <div className="flex items-center justify-between">
                <p className="font-manrope font-medium text-text-muted-custom text-xs">Akreditasi</p>
                <Trophy className="h-4 w-4 text-text-muted-custom" />
              </div>
              <p className="mt-2 font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">
                {uni.accreditation ?? "-"}
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
              <div className="flex items-center justify-between">
                <p className="font-manrope font-medium text-text-muted-custom text-xs">Biaya Kuliah</p>
                <Banknote className="h-4 w-4 text-text-muted-custom" />
              </div>
              <p className="mt-2 font-bold font-bricolage text-brand-navy text-xl md:text-2xl">
                {uni.tuitionRange ?? "-"}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8">
            <Tabs defaultValue="programs">
              <TabsList className="w-full justify-start gap-1.5 rounded-xl bg-brand-navy/10 p-1">
                <TabsTrigger
                  value="programs"
                  className="rounded-lg px-4 py-1.5 font-manrope text-text-muted-custom text-xs transition-all data-[state=active]:bg-brand-navy data-[state=active]:text-white"
                >
                  Program Studi
                </TabsTrigger>
                <TabsTrigger
                  value="about"
                  className="rounded-lg px-4 py-1.5 font-manrope text-text-muted-custom text-xs transition-all data-[state=active]:bg-brand-navy data-[state=active]:text-white"
                >
                  Tentang
                </TabsTrigger>
                <TabsTrigger
                  value="statistics"
                  className="rounded-lg px-4 py-1.5 font-manrope text-text-muted-custom text-xs transition-all data-[state=active]:bg-brand-navy data-[state=active]:text-white"
                >
                  Statistik
                </TabsTrigger>
              </TabsList>

              <TabsContent value="programs" className="pt-6">
                <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
                    <h3 className="font-bold font-bricolage text-brand-navy text-sm">
                      Daftar Program Studi{" "}
                      <span className="font-manrope font-normal text-text-muted-custom">
                        ({filteredPrograms.length} dari {allPrograms.length})
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Cari prodi..."
                        value={prodiSearch}
                        onChange={(e) => {
                          setProdiSearch(e.target.value);
                          setProdiPage(0);
                        }}
                        className="h-8 w-44 rounded-lg border border-gray-200 px-3 font-manrope text-text-main text-xs placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
                      />
                      <select
                        value={prodiLevel}
                        onChange={(e) => {
                          setProdiLevel(e.target.value);
                          setProdiPage(0);
                        }}
                        className="h-8 rounded-lg border border-gray-200 px-2 font-manrope text-text-main text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
                      >
                        <option value="all">Semua Jenjang</option>
                        {levels.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t bg-gray-50/50">
                          <th className="p-3 text-left font-manrope font-medium text-text-muted-custom text-xs">
                            Kode
                          </th>
                          <th
                            className="cursor-pointer select-none p-3 text-left font-manrope font-medium text-text-muted-custom text-xs hover:text-brand-navy"
                            onClick={() =>
                              setProdiSort({
                                field: "name",
                                dir: prodiSort.field === "name" && prodiSort.dir === "asc" ? "desc" : "asc",
                              })
                            }
                          >
                            Nama Prodi {prodiSort.field === "name" ? (prodiSort.dir === "asc" ? "▲" : "▼") : ""}
                          </th>
                          <th
                            className="cursor-pointer select-none p-3 text-left font-manrope font-medium text-text-muted-custom text-xs hover:text-brand-navy"
                            onClick={() =>
                              setProdiSort({
                                field: "level",
                                dir: prodiSort.field === "level" && prodiSort.dir === "asc" ? "desc" : "asc",
                              })
                            }
                          >
                            Jenjang {prodiSort.field === "level" ? (prodiSort.dir === "asc" ? "▲" : "▼") : ""}
                          </th>
                          <th
                            className="cursor-pointer select-none p-3 text-left font-manrope font-medium text-text-muted-custom text-xs hover:text-brand-navy"
                            onClick={() =>
                              setProdiSort({
                                field: "accreditation",
                                dir: prodiSort.field === "accreditation" && prodiSort.dir === "asc" ? "desc" : "asc",
                              })
                            }
                          >
                            Akreditasi{" "}
                            {prodiSort.field === "accreditation" ? (prodiSort.dir === "asc" ? "▲" : "▼") : ""}
                          </th>
                          <th
                            className="cursor-pointer select-none p-3 text-right font-manrope font-medium text-text-muted-custom text-xs hover:text-brand-navy"
                            onClick={() =>
                              setProdiSort({
                                field: "students",
                                dir: prodiSort.field === "students" && prodiSort.dir === "asc" ? "desc" : "asc",
                              })
                            }
                          >
                            Mahasiswa {prodiSort.field === "students" ? (prodiSort.dir === "asc" ? "▲" : "▼") : ""}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedPrograms.length ? (
                          pagedPrograms.map((p: any) => (
                            <tr
                              key={p.idSms}
                              className="cursor-pointer border-t transition-colors hover:bg-brand-navy/5"
                              onClick={() =>
                                router.push(`/explore/universities/${slug}/prodi/${encodeURIComponent(p.idSms)}` as any)
                              }
                            >
                              <td className="p-3 font-mono text-text-muted-custom text-xs">{p.code ?? "-"}</td>
                              <td className="p-3 font-manrope font-medium text-brand-navy text-sm">{p.name}</td>
                              <td className="p-3">
                                <Badge variant="outline" className="font-manrope text-[10px]">
                                  {p.level ?? "-"}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant="outline"
                                  className={cn("font-manrope text-[10px]", accStyles[p.accreditation] ?? "")}
                                >
                                  {p.accreditation ?? "-"}
                                </Badge>
                              </td>
                              <td className="p-3 text-right font-manrope text-xs">
                                {p.totalStudents?.toLocaleString() ?? "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center font-manrope text-sm text-text-muted-custom">
                              Belum ada data program studi.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {totalProdiPages > 1 && (
                    <div className="flex items-center justify-between border-t px-5 py-3">
                      <span className="font-manrope text-text-muted-custom text-xs">
                        {prodiPage * PRODI_PAGE_SIZE + 1}-
                        {Math.min((prodiPage + 1) * PRODI_PAGE_SIZE, filteredPrograms.length)} dari{" "}
                        {filteredPrograms.length}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setProdiPage(0);
                          }}
                          disabled={prodiPage === 0}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 font-manrope text-text-muted-custom text-xs transition-colors hover:bg-gray-50 disabled:opacity-30"
                        >
                          First
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProdiPage((p) => Math.max(0, p - 1));
                          }}
                          disabled={prodiPage === 0}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 font-manrope text-text-muted-custom text-xs transition-colors hover:bg-gray-50 disabled:opacity-30"
                        >
                          Prev
                        </button>
                        <span className="px-2 font-manrope text-text-muted-custom text-xs">
                          {prodiPage + 1} / {totalProdiPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setProdiPage((p) => Math.min(totalProdiPages - 1, p + 1));
                          }}
                          disabled={prodiPage >= totalProdiPages - 1}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 font-manrope text-text-muted-custom text-xs transition-colors hover:bg-gray-50 disabled:opacity-30"
                        >
                          Next
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProdiPage(totalProdiPages - 1);
                          }}
                          disabled={prodiPage >= totalProdiPages - 1}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 font-manrope text-text-muted-custom text-xs transition-colors hover:bg-gray-50 disabled:opacity-30"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="about" className="pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <h3 className="font-bold font-bricolage text-brand-navy text-sm">Informasi Umum</h3>
                    <div className="mt-4 space-y-3 font-manrope text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted-custom">Nama</span>
                        <span className="font-medium text-text-main">{uni.name}</span>
                      </div>
                      {uni.shortName && (
                        <div className="flex justify-between">
                          <span className="text-text-muted-custom">Nama Singkat</span>
                          <span className="text-text-main">{uni.shortName}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-text-muted-custom">Tipe</span>
                        <span className="text-text-main">{uni.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted-custom">Status</span>
                        <span className="text-text-main">{uni.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted-custom">Provinsi</span>
                        <span className="text-text-main">{uni.province ?? "-"}</span>
                      </div>
                      {uni.regency && (
                        <div className="flex justify-between">
                          <span className="text-text-muted-custom">Kab/Kota</span>
                          <span className="text-text-main">{uni.regency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <h3 className="font-bold font-bricolage text-brand-navy text-sm">Kontak & Detail</h3>
                    <div className="mt-4 space-y-3 font-manrope text-sm">
                      {uni.details?.website && (
                        <div className="flex justify-between">
                          <span className="text-text-muted-custom">Website</span>
                          <a
                            href={
                              uni.details.website.startsWith("http")
                                ? uni.details.website
                                : `https://${uni.details.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="max-w-[200px] truncate text-brand-orange hover:underline"
                          >
                            {uni.details.website}
                          </a>
                        </div>
                      )}
                      {uni.details?.email && (
                        <div className="flex justify-between">
                          <span className="text-text-muted-custom">Email</span>
                          <span className="text-text-main">{uni.details.email}</span>
                        </div>
                      )}
                      {uni.details?.phone && (
                        <div className="flex justify-between">
                          <span className="text-text-muted-custom">Telepon</span>
                          <span className="text-text-main">{uni.details.phone}</span>
                        </div>
                      )}
                      {uni.details?.address && (
                        <div className="flex justify-between">
                          <span className="text-text-muted-custom">Alamat</span>
                          <span className="max-w-[250px] text-right text-text-main">{uni.details.address}</span>
                        </div>
                      )}
                      {uni.details?.foundedDate && (
                        <div className="flex justify-between">
                          <span className="text-text-muted-custom">Tahun Berdiri</span>
                          <span className="text-text-main">{uni.details.foundedDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="statistics" className="pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <h3 className="font-bold font-bricolage text-brand-navy text-sm">Statistik Mahasiswa</h3>
                    <div className="mt-4 space-y-3 font-manrope text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted-custom">Total Mahasiswa</span>
                        <span className="font-medium text-brand-navy">{totalStudents.toLocaleString()}</span>
                      </div>
                      {uni.studentStats?.avgNewStudents != null && (
                        <div className="flex justify-between">
                          <span className="text-text-muted-custom">Rata-rata Maba/tahun</span>
                          <span className="text-text-main">{uni.studentStats.avgNewStudents.toLocaleString()}</span>
                        </div>
                      )}
                      {uni.studentStats?.avgGraduates != null && (
                        <div className="flex justify-between">
                          <span className="text-text-muted-custom">Rata-rata Lulusan/tahun</span>
                          <span className="text-text-main">{uni.studentStats.avgGraduates.toLocaleString()}</span>
                        </div>
                      )}
                      {uni.graduationRates?.graduationRate != null && (
                        <div className="flex justify-between">
                          <span className="text-text-muted-custom">Tingkat Kelulusan</span>
                          <span className="font-medium text-green-600">{uni.graduationRates.graduationRate}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <h3 className="font-bold font-bricolage text-brand-navy text-sm">Biaya Kuliah</h3>
                    <div className="mt-4 space-y-3 font-manrope text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted-custom">Range UKT/SPP</span>
                        <span className="font-medium text-brand-navy">
                          {uni.tuitionFees?.tuitionRange ?? uni.tuitionRange ?? "-"}
                        </span>
                      </div>
                      {uni.studyDurations?.length > 0 && (
                        <div className="mt-4">
                          <span className="text-text-muted-custom text-xs">Rata-rata Masa Studi:</span>
                          {uni.studyDurations.map((d: any) => (
                            <div key={d.id} className="mt-1 flex justify-between text-xs">
                              <span className="text-text-muted-custom">{d.level}</span>
                              <span className="font-medium text-text-main">{d.avgDurationYears ?? "-"} tahun</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* CTA */}
          <div className="relative mt-8 overflow-hidden rounded-2xl bg-brand-navy p-8 text-center shadow-xl sm:mt-12 sm:p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-navy to-brand-navy/80" />
            <div className="relative">
              <GraduationCap className="mx-auto h-10 w-10 text-brand-orange" />
              <h2 className="mt-3 font-bold font-bricolage text-white text-xl sm:text-2xl">
                Butuh bantuan memilih jurusan?
              </h2>
              <p className="mt-2 font-manrope text-white/70">
                Tim mentor MulaiPlus siap membantu kamu menentukan pilihan terbaik.
              </p>
              <Button
                className="mt-4 rounded-full bg-brand-orange px-8 font-manrope text-white shadow-lg hover:bg-brand-orange/90"
                onClick={() => trackEvent("cta_click", { page: "university_detail" })}
              >
                Konsultasi Gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
