"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const api = orpc as any;

export default function StudyProgramDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: _slugs } = useQuery({ ...api.pddikti.publicGetProgramSlugs.queryOptions(), staleTime: 1000 * 60 * 60 });
  const slugs = (_slugs as any[]) ?? [];
  const match = slugs.find((s: any) => s.slug === slug);
  const id = match?.id;

  const { data: _prog, isLoading } = useQuery({
    ...api.pddikti.publicGetStudyProgram.queryOptions({ input: { id } }),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
  const prog = _prog as any;

  if (!slug || (!isLoading && !id)) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20 sm:pt-24">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-text-muted-custom" />
          <h2 className="mt-4 font-bold font-bricolage text-brand-navy text-lg">Program studi tidak ditemukan</h2>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pt-20 sm:pt-24">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
    );
  }

  if (!prog) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20 sm:pt-24">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-text-muted-custom" />
          <h2 className="mt-4 font-bold font-bricolage text-brand-navy text-lg">Program studi tidak ditemukan</h2>
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
      <div className="border-b bg-white pt-20 sm:pt-24">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 font-manrope text-text-muted-custom text-xs">
            <Link href={"/" as any} className="transition-colors hover:text-brand-navy">
              Home
            </Link>
            <span>/</span>
            <Link href={"/study-programs" as any} className="transition-colors hover:text-brand-navy">
              Study Programs
            </Link>
            <span>/</span>
            <span className="text-text-main">{prog.name}</span>
          </div>
        </div>
      </div>

      <section className="border-b bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-navy shadow-lg">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight md:text-3xl">
                {prog.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-blue-500/20 bg-blue-500/10 font-manrope text-[10px] text-blue-600"
                >
                  {prog.level ?? "-"}
                </Badge>
                {prog.accreditation && (
                  <Badge
                    variant="outline"
                    className="border-green-500/20 bg-green-500/10 font-manrope text-[10px] text-green-600"
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
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="p-5 sm:p-6">
              <h3 className="font-bold font-bricolage text-brand-navy text-sm">Informasi Program Studi</h3>
              <div className="mt-4 space-y-3 font-manrope text-sm">
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
                  <span className="text-text-muted-custom">Akreditasi</span>
                  <span className="text-text-main">{prog.accreditation ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted-custom">Status</span>
                  <span className="text-text-main">{prog.status ?? "-"}</span>
                </div>
                {prog.totalStudents != null && (
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Total Mahasiswa</span>
                    <span className="font-medium text-brand-navy">{prog.totalStudents.toLocaleString()}</span>
                  </div>
                )}
                {prog.totalLecturers != null && (
                  <div className="flex justify-between">
                    <span className="text-text-muted-custom">Total Dosen</span>
                    <span className="text-text-main">{prog.totalLecturers}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative mt-8 overflow-hidden rounded-2xl bg-brand-navy p-8 text-center shadow-xl sm:mt-12 sm:p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-navy to-brand-navy/80" />
            <div className="relative">
              <GraduationCap className="mx-auto h-10 w-10 text-brand-orange" />
              <h2 className="mt-3 font-bold font-bricolage text-white text-xl sm:text-2xl">
                Tertarik dengan {prog.name}?
              </h2>
              <p className="mt-2 font-manrope text-white/70">
                Konsultasi gratis dengan mentor kami untuk tahu lebih lanjut tentang prospek dan peluangnya.
              </p>
              <Button className="mt-4 rounded-full bg-brand-orange px-8 font-manrope text-white shadow-lg hover:bg-brand-orange/90">
                Konsultasi Gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
