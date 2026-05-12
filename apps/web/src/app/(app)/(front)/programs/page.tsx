"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarDays, GraduationCap, Layers, Users } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

function ProgramCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video w-full bg-muted">
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
        <Skeleton className="h-9 w-full rounded-lg" />
      </CardFooter>
    </Card>
  );
}

export default function ProgramsPage() {
  const { data: result, isLoading } = useQuery(orpc.programs.public.list.queryOptions({ input: { limit: 50 } }));

  const programs = result?.data ?? [];

  return (
    <div className="bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="relative bg-[#1A1F6D] py-16 sm:py-20">
        <div
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="container relative z-10 mx-auto mt-10 max-w-6xl px-4 text-center">
          <h1 className="font-bold font-bricolage text-4xl text-white leading-tight sm:text-5xl lg:text-6xl">
            Program Mentoring MULAI+
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-manrope text-base text-white/80 sm:text-lg">
            Temukan program mentoring yang sesuai dengan kebutuhanmu. Dapatkan bimbingan dari mentor berpengalaman untuk
            membantu kamu memilih universitas dan jurusan yang tepat.
          </p>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="container mx-auto max-w-6xl px-4 py-12 sm:py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProgramCardSkeleton key={i} />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <div className="rounded-xl border border-dashed py-20 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h2 className="mt-4 font-semibold text-lg text-muted-foreground">Belum Ada Program</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Saat ini belum ada program mentoring yang tersedia. Silakan cek kembali nanti.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => {
              const activeBatch = program.batches?.[0];
              const benefitCount = program.benefits?.length ?? 0;

              return (
                <Card
                  key={program.id}
                  className="group flex flex-col overflow-hidden border-0 bg-white shadow-sm ring-1 ring-gray-200 transition-all duration-300 hover:shadow-lg hover:ring-[#1A1F6D]/20"
                >
                  {/* Banner */}
                  <div className="relative aspect-video w-full overflow-hidden bg-[#1A1F6D]/5">
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
                      <div className="flex h-full items-center justify-center">
                        <GraduationCap className="h-12 w-12 text-[#1A1F6D]/20" />
                      </div>
                    )}
                    {/* Batch Badge */}
                    {activeBatch && (
                      <div className="absolute top-3 left-3">
                        <Badge
                          className={cn(
                            "border-0 font-manrope font-medium text-xs",
                            activeBatch.status === "open"
                              ? "bg-green-500 text-white"
                              : activeBatch.status === "upcoming"
                                ? "bg-amber-500 text-white"
                                : "bg-gray-500 text-white",
                          )}
                        >
                          <Layers className="mr-1 h-3 w-3" />
                          {activeBatch.name}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    {/* Title */}
                    <h2 className="font-bold font-bricolage text-gray-900 text-lg leading-tight transition-colors group-hover:text-[#1A1F6D]">
                      {program.name}
                    </h2>

                    {/* Description */}
                    <p className="line-clamp-2 font-manrope text-gray-500 text-sm leading-relaxed">
                      {program.description || "Belum ada deskripsi"}
                    </p>

                    {/* Program Details */}
                    <div className="mt-auto flex flex-col gap-2 pt-2">
                      {activeBatch?.startDate && (
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <CalendarDays className="h-4 w-4 shrink-0 text-[#1A1F6D]/60" />
                          <span className="font-manrope">
                            {format(new Date(activeBatch.startDate), "dd MMM yyyy", { locale: id })}
                            {activeBatch.endDate &&
                              ` - ${format(new Date(activeBatch.endDate), "dd MMM yyyy", { locale: id })}`}
                          </span>
                        </div>
                      )}

                      {activeBatch && (
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <Users className="h-4 w-4 shrink-0 text-[#1A1F6D]/60" />
                          <span className="font-manrope">
                            {activeBatch.status === "open"
                              ? `Pendaftaran Dibuka (Kuota: ${activeBatch.quota ?? "-"})`
                              : activeBatch.status === "upcoming"
                                ? "Segera Dibuka"
                                : "Pendaftaran Ditutup"}
                          </span>
                        </div>
                      )}

                      {benefitCount > 0 && (
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <GraduationCap className="h-4 w-4 shrink-0 text-[#1A1F6D]/60" />
                          <span className="font-manrope">{benefitCount} Benefit</span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-5 pt-0">
                    <Link
                      href={`/programs/${program.slug || program.id}` as Route}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-[#1A1F6D] px-3 py-2 font-manrope font-medium text-sm text-white transition-all hover:bg-[#1A1F6D]/90"
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

      {/* CTA Section */}
      {programs.length > 0 && (
        <section className="bg-[#1A1F6D] py-16">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <h2 className="font-bold font-bricolage text-3xl text-white sm:text-4xl">Siap Memulai Perjalananmu?</h2>
            <p className="mx-auto mt-3 max-w-xl font-manrope text-white/70">
              Daftar sekarang dan dapatkan bimbingan dari mentor terbaik untuk masa depan yang lebih cerah.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-8 py-3 font-bold font-manrope text-[#1A1F6D] shadow-md transition-all hover:bg-gray-100"
            >
              Daftar Sekarang
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
