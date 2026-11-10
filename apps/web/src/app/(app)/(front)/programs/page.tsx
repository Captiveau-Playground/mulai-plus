"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarDays, GraduationCap, Users } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

/** Titik status batch — pakai token brand (navy/teal), bukan palet mentah Tailwind. */
function batchStatusDot(status: string) {
  if (status === "open") return "bg-mentor-teal";
  if (status === "upcoming") return "bg-brand-orange";
  return "bg-gray-400";
}

function batchStatusLabel(status: string, quota?: number | null) {
  if (status === "open") return `Pendaftaran dibuka${quota ? ` · kuota ${quota}` : ""}`;
  if (status === "upcoming") return "Segera dibuka";
  return "Pendaftaran ditutup";
}

function ProgramCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border-0 shadow-md ring-1 ring-gray-200/70">
      <div className="relative aspect-16/10 w-full bg-bg-light">
        <Skeleton className="h-full w-full" />
      </div>
      <CardContent className="space-y-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
      <CardFooter className="px-5 pt-0 pb-5">
        <Skeleton className="h-11 w-full rounded-full" />
      </CardFooter>
    </Card>
  );
}

export default function ProgramsPage() {
  const { data: result, isLoading } = useQuery(orpc.programs.public.list.queryOptions({ input: { limit: 50 } }));

  const programs = result?.data ?? [];
  // 2 kartu di grid 3 kolom bikin sisi kanan kosong — rapikan sesuai jumlah item.
  const gridClass = programs.length >= 3 ? "lg:grid-cols-3" : "lg:mx-auto lg:max-w-4xl lg:grid-cols-2";

  return (
    <div className="bg-linear-to-b from-white to-bg-light">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-navy py-16 md:py-20">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 text-center sm:px-6 lg:px-8">
          <p className="heading-eyebrow text-brand-orange">Mentoring</p>
          <h1 className="heading-display text-white">Program Mentoring MULAI+</h1>
          <p className="max-w-2xl font-manrope text-base text-white/75 leading-relaxed md:text-lg">
            Temukan program mentoring yang sesuai dengan kebutuhanmu. Dapatkan bimbingan dari mentor berpengalaman untuk
            membantu kamu memilih universitas dan jurusan yang tepat.
          </p>
        </div>
      </section>

      {/* Grid program */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 md:py-16 lg:px-8">
        <h2 className="sr-only">Daftar program mentoring</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProgramCardSkeleton key={i} />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-200 border-dashed bg-white px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-bg-light text-brand-navy/40">
              <GraduationCap className="size-6" />
            </span>
            <h3 className="heading-card text-brand-navy">Belum Ada Program</h3>
            <p className="font-manrope text-sm text-text-muted-custom leading-relaxed">
              Saat ini belum ada program mentoring yang tersedia. Silakan cek kembali nanti.
            </p>
          </div>
        ) : (
          <div className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2", gridClass)}>
            {programs.map((program) => {
              const activeBatch = program.batches?.[0];
              const benefitCount = program.benefits?.length ?? 0;

              return (
                <Card
                  key={program.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border-0 bg-white shadow-md ring-1 ring-gray-200/70 transition-shadow duration-300 hover:shadow-lg"
                >
                  {/* Banner */}
                  <div className="relative aspect-16/10 w-full overflow-hidden bg-bg-light">
                    {program.bannerUrl ? (
                      <Image
                        src={program.bannerUrl}
                        alt={program.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-brand-navy via-brand-navy to-brand-navy-light">
                        <GraduationCap className="size-12 text-white/25" />
                      </div>
                    )}
                    {activeBatch && (
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 font-manrope font-semibold text-brand-navy text-xs shadow-sm backdrop-blur">
                        <span className={cn("size-1.5 rounded-full", batchStatusDot(activeBatch.status))} />
                        {activeBatch.name}
                      </span>
                    )}
                  </div>

                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    <h3 className="heading-card text-brand-navy transition-colors group-hover:text-brand-orange">
                      {program.name}
                    </h3>

                    <p className="line-clamp-2 font-manrope text-sm text-text-main/70 leading-relaxed">
                      {program.description || "Belum ada deskripsi"}
                    </p>

                    <dl className="mt-auto flex flex-col gap-2 pt-2">
                      {activeBatch?.startDate && (
                        <div className="flex items-center gap-2 font-manrope text-sm text-text-main/70">
                          <CalendarDays className="size-4 shrink-0 text-brand-navy/50" />
                          <dd>
                            {format(new Date(activeBatch.startDate), "dd MMM yyyy", { locale: id })}
                            {activeBatch.endDate &&
                              ` – ${format(new Date(activeBatch.endDate), "dd MMM yyyy", { locale: id })}`}
                          </dd>
                        </div>
                      )}

                      {activeBatch && (
                        <div className="flex items-center gap-2 font-manrope text-sm text-text-main/70">
                          <Users className="size-4 shrink-0 text-brand-navy/50" />
                          <dd>{batchStatusLabel(activeBatch.status, activeBatch.quota)}</dd>
                        </div>
                      )}

                      {benefitCount > 0 && (
                        <div className="flex items-center gap-2 font-manrope text-sm text-text-main/70">
                          <GraduationCap className="size-4 shrink-0 text-brand-navy/50" />
                          <dd>{benefitCount} benefit</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>

                  <CardFooter className="p-5 pt-0">
                    <Link
                      href={`/programs/${program.slug || program.id}` as Route}
                      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brand-navy px-5 font-manrope font-semibold text-sm text-white transition-colors hover:bg-brand-navy-light focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2"
                    >
                      Lihat Detail Program
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      {programs.length > 0 && (
        <section className="bg-brand-navy py-16 md:py-20">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 text-center sm:px-6">
            <h2 className="heading-section text-white">Siap Memulai Perjalananmu?</h2>
            <p className="max-w-xl font-manrope text-base text-white/75 leading-relaxed">
              Daftar sekarang dan dapatkan bimbingan dari mentor terbaik untuk masa depan yang lebih cerah.
            </p>
            <Link
              href="/login"
              className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-white px-7 font-bold font-manrope text-brand-navy transition-colors hover:bg-bg-light focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2"
            >
              Daftar Sekarang
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
