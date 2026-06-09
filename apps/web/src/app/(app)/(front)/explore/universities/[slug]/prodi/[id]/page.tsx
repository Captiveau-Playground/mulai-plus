"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Building2, GraduationCap, MapPin, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function ProdiDetailPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);
  const slug = params.slug as string;

  const { data: _slugs } = useQuery({
    ...api.pddikti.publicGetUniversitySlugs.queryOptions(),
    staleTime: 1000 * 60 * 60,
  });
  const slugs = (_slugs as any[]) ?? [];
  const match = slugs.find((s: any) => s.slug === slug);
  const uniName = match?.name;

  const { data: _d, isLoading } = useQuery({
    ...api.pddikti.publicGetProgramDetail.queryOptions({ input: { idSms: id } }),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
  const d = _d as any;
  const prog = d?.program;
  const uni = d?.university;
  const snpmb = d?.snpmb;

  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20 sm:pt-24">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-text-muted-custom" />
          <h2 className="mt-4 font-bold font-bricolage text-brand-navy text-lg">Program tidak ditemukan</h2>
          <Link
            href={"/study-programs" as any}
            className="mt-2 inline-flex items-center gap-1 font-manrope text-brand-orange text-sm hover:underline"
          >
            <ArrowLeft className="h-3 w-3" /> Kembali
          </Link>
        </div>
      </div>
    );
  }

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
            <Link href={"/universities" as any} className="transition-colors hover:text-brand-navy">
              Universities
            </Link>
            <span>/</span>
            {uniName && (
              <Link
                href={`/universities/${slug}` as any}
                className="max-w-[200px] truncate transition-colors hover:text-brand-navy"
              >
                {uniName}
              </Link>
            )}
            <span>/</span>
            <span className="truncate text-text-main">{prog?.name ?? "Detail"}</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !prog ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <BookOpen className="h-12 w-12 text-text-muted-custom" />
              <p className="font-manrope text-lg text-text-muted-custom">Program tidak ditemukan</p>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-navy shadow-lg">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight md:text-3xl">
                  {prog.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-blue-500/20 bg-blue-500/10 font-manrope text-[10px] text-blue-600"
                  >
                    {prog.level ?? "-"}
                  </Badge>
                  {prog.accreditation && (
                    <Badge
                      variant="outline"
                      className={cn("font-manrope text-[10px]", accStyles[prog.accreditation] ?? "")}
                    >
                      {prog.accreditation}
                    </Badge>
                  )}
                  {prog.code && <span className="font-manrope text-text-muted-custom text-xs">Kode: {prog.code}</span>}
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-manrope text-[10px]",
                      prog.status === "Aktif"
                        ? "border-green-500/20 bg-green-500/10 text-green-600"
                        : "border-red-500/20 bg-red-500/10 text-red-600",
                    )}
                  >
                    {prog.status ?? "-"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 border-gray-100 border-t pt-3">
                  {uni && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-brand-navy/60" />
                      <span className="font-manrope font-medium text-brand-navy text-sm">{uni.name}</span>
                      <Badge variant="outline" className="font-manrope text-[10px]">
                        {uni.type}
                      </Badge>
                      {uni.province && (
                        <span className="font-manrope text-[10px] text-text-muted-custom">
                          <MapPin className="mr-0.5 inline h-3 w-3" />
                          {uni.province}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Stats Cards */}
      {prog && (
        <section className="py-6 sm:py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-manrope text-text-muted-custom text-xs">Mahasiswa</span>
                  <Users className="h-4 w-4 text-text-muted-custom" />
                </div>
                <p className="mt-1 font-bold font-bricolage text-2xl text-brand-navy">
                  {prog.totalStudents?.toLocaleString() ?? "-"}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-manrope text-text-muted-custom text-xs">Dosen</span>
                  <GraduationCap className="h-4 w-4 text-text-muted-custom" />
                </div>
                <p className="mt-1 font-bold font-bricolage text-2xl text-brand-navy">{prog.totalLecturers ?? "-"}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-manrope text-text-muted-custom text-xs">Rasio</span>
                  <Users className="h-4 w-4 text-text-muted-custom" />
                </div>
                <p className="mt-1 font-bold font-bricolage text-2xl text-brand-navy">{prog.ratio ?? "-"}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-manrope text-text-muted-custom text-xs">Akreditasi</span>
                  <Trophy className="h-4 w-4 text-text-muted-custom" />
                </div>
                <p className="mt-1 font-bold font-bricolage text-2xl text-brand-navy">{prog.accreditation ?? "-"}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Detail Info */}
      {prog && (
        <section className="py-2 sm:py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="font-bold font-bricolage text-brand-navy text-sm">Informasi Program Studi</h3>
                <div className="mt-3 space-y-2 font-manrope text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Nama</span>
                    <span className="font-medium text-text-main">{prog.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Kode</span>
                    <span className="font-mono text-text-main text-xs">{prog.code ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Jenjang</span>
                    <span className="text-text-main">{prog.level ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Status</span>
                    <span className="text-text-main">{prog.status ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Akreditasi</span>
                    <span className="text-text-main">{prog.accreditation ?? "-"}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="font-bold font-bricolage text-brand-navy text-sm">Statistik & Tenaga Pengajar</h3>
                <div className="mt-3 space-y-2 font-manrope text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Total Mahasiswa</span>
                    <span className="font-medium text-brand-navy">{prog.totalStudents?.toLocaleString() ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Total Dosen</span>
                    <span>{prog.totalLecturers ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Dosen NIDN</span>
                    <span>{prog.lecturersNidn ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Dosen NIDK</span>
                    <span>{prog.lecturersNidk ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Dosen Aktif Mengajar</span>
                    <span>{prog.teachingLecturers ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Rasio Dosen:Mhs</span>
                    <span className="font-medium">{prog.ratio ?? "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SNPMB Passing Grade */}
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {snpmb && (snpmb.snbp || snpmb.snbt) ? (
            <>
              <div className="mb-4">
                <h2 className="font-bold font-bricolage text-brand-navy text-lg">Daya Tampung &amp; Keketatan</h2>
                <p className="mt-1 font-manrope text-text-muted-custom text-xs">Data SNBP dan SNBT 5 tahun terakhir</p>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {snpmb.snbp && (
                  <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                    <div className="border-b bg-gradient-to-r from-blue-50 to-blue-50/50 px-5 py-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold font-bricolage text-brand-navy text-sm">SNBP</h3>
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 font-manrope font-semibold text-[10px] text-blue-700">
                          Daya tampung: {snpmb.snbp.capacity ?? "-"}
                        </span>
                      </div>
                    </div>
                    <div className="divide-y">
                      {snpmb.snbp.history?.map((h: any) => (
                        <div key={h.year} className="flex items-center justify-between px-5 py-3">
                          <span className="font-manrope font-semibold text-text-muted-custom text-xs">{h.year}</span>
                          <div className="flex items-center gap-4">
                            <span className="font-manrope text-[10px] text-text-muted-custom">
                              🅿 {h.applicants?.toLocaleString() ?? "?"}
                            </span>
                            <span className="font-manrope text-[10px] text-text-muted-custom">
                              ✓ {h.accepted?.toLocaleString() ?? "?"}
                            </span>
                            {h.passingGrade && (
                              <span className="rounded-md bg-green-100 px-2 py-0.5 font-manrope font-semibold text-[10px] text-green-700">
                                {h.passingGrade}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {!snpmb.snbp.history?.length && (
                        <div className="px-5 py-4 text-center font-manrope text-text-muted-custom text-xs">
                          Belum ada data histori
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {snpmb.snbt && (
                  <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                    <div className="border-b bg-gradient-to-r from-orange-50 to-orange-50/50 px-5 py-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold font-bricolage text-brand-navy text-sm">SNBT</h3>
                        <span className="rounded-md bg-orange-100 px-2 py-0.5 font-manrope font-semibold text-[10px] text-orange-700">
                          Daya tampung: {snpmb.snbt.capacity ?? "-"}
                        </span>
                      </div>
                    </div>
                    <div className="divide-y">
                      {snpmb.snbt.history?.map((h: any) => (
                        <div key={h.year} className="flex items-center justify-between px-5 py-3">
                          <span className="font-manrope font-semibold text-text-muted-custom text-xs">{h.year}</span>
                          <div className="flex items-center gap-4">
                            <span className="font-manrope text-[10px] text-text-muted-custom">
                              🅿 {h.applicants?.toLocaleString() ?? "?"}
                            </span>
                            <span className="font-manrope text-[10px] text-text-muted-custom">
                              🎯 {h.capacity?.toLocaleString() ?? "?"}
                            </span>
                            {h.passingGrade && (
                              <span className="rounded-md bg-orange-100 px-2 py-0.5 font-manrope font-semibold text-[10px] text-orange-700">
                                {h.passingGrade}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {!snpmb.snbt.history?.length && (
                        <div className="px-5 py-4 text-center font-manrope text-text-muted-custom text-xs">
                          Belum ada data histori
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-gray-50 p-8 text-center">
              <GraduationCap className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 font-manrope font-medium text-sm text-text-muted-custom">
                Data passing grade belum tersedia
              </p>
              <p className="mt-1 font-manrope text-text-muted-custom text-xs">
                Data daya tampung dan keketatan SNBP/SNBT hanya tersedia untuk program studi di PTN peserta SNPMB.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-brand-navy py-16 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy to-brand-navy/80" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <GraduationCap className="mx-auto h-8 w-8 text-brand-orange" />
          <h2 className="mt-3 font-bold font-bricolage text-2xl text-white sm:text-3xl">
            Butuh bantuan masuk {prog?.name ?? "jurusan impian"}?
          </h2>
          <p className="mt-2 font-manrope text-white/70">
            Konsultasi gratis dengan mentor kami untuk strategi masuk PTN lewat SNBP/SNBT.
          </p>
          <Button
            className="mt-6 rounded-full bg-brand-orange px-8 font-manrope text-white shadow-lg hover:bg-brand-orange/90"
            onClick={() => trackEvent("cta_click", { page: "prodi_detail" })}
          >
            Konsultasi Gratis <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
