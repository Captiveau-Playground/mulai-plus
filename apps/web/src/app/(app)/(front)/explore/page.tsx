"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  GraduationCap,
  MapPin,
  Search,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

const api = orpc as any;

export default function ExplorePage() {
  const { data: _uni } = useQuery({
    ...api.pddikti.publicListUniversities.queryOptions({ input: { page: 1, pageSize: 1 } }),
    staleTime: 1000 * 60 * 10,
  });
  const { data: _prog } = useQuery({
    ...api.pddikti.publicSearchPrograms.queryOptions({ input: { page: 1, pageSize: 1 } }),
    staleTime: 1000 * 60 * 10,
  });

  const totalUni = (_uni as any)?.total ?? 408;
  const totalProg = (_prog as any)?.total ?? 18881;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Eksplorasi Data Pendidikan Tinggi — MULAI+",
    description:
      "Jelajahi data lengkap 408 perguruan tinggi, 18.881 program studi, dan passing grade SNBP/SNBT 5 tahun terakhir.",
    provider: {
      "@type": "Organization",
      name: "MULAI+",
      url: "https://mulaiplus.id",
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={jsonLd} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-navy pt-20 sm:pt-24">
        <div className="absolute inset-0">
          <div className="h-full w-full bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy/95" />
          <div className="absolute top-0 right-0 h-full w-1/2 opacity-[0.03]">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: "radial-gradient(circle at 25% 50%, white 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex items-center justify-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange shadow-brand-orange/20 shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="font-bold font-bricolage text-4xl text-white tracking-tight md:text-5xl lg:text-6xl">
              Jelajahi Data
              <br />
              Pendidikan Tinggi
            </h1>
            <p className="mx-auto mt-4 max-w-2xl font-manrope text-lg text-white/60 leading-relaxed">
              Akses data lengkap perguruan tinggi, program studi, dan passing grade SNBP/SNBT untuk membantu kamu
              menentukan pilihan terbaik.
            </p>

            {/* Quick search */}
            <div className="mx-auto mt-10 max-w-xl">
              <Link href={"/explore/study-programs" as any} className="relative flex items-center">
                <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <div className="w-full cursor-text rounded-2xl border border-white/10 bg-white/5 px-12 py-3.5 font-manrope text-sm text-white/30 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/10">
                  Cari jurusan, universitas, atau passing grade...
                </div>
                <kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-white/10 bg-white/10 px-2 py-0.5 font-manrope text-[10px] text-white/40 sm:inline">
                  /
                </kbd>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-gray-100 border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-gray-100 lg:grid-cols-4">
            <div className="py-6 text-center">
              <p className="font-bold font-bricolage text-3xl text-brand-navy sm:text-4xl">
                {totalUni.toLocaleString()}
              </p>
              <p className="mt-1 font-manrope text-text-muted-custom text-xs">Perguruan Tinggi</p>
            </div>
            <div className="py-6 text-center">
              <p className="font-bold font-bricolage text-3xl text-brand-navy sm:text-4xl">
                {totalProg.toLocaleString()}
              </p>
              <p className="mt-1 font-manrope text-text-muted-custom text-xs">Program Studi</p>
            </div>
            <div className="py-6 text-center">
              <p className="font-bold font-bricolage text-3xl text-brand-navy sm:text-4xl">38</p>
              <p className="mt-1 font-manrope text-text-muted-custom text-xs">Provinsi</p>
            </div>
            <div className="py-6 text-center">
              <p className="font-bold font-bricolage text-3xl text-brand-navy sm:text-4xl">5</p>
              <p className="mt-1 font-manrope text-text-muted-custom text-xs">Tahun Data SNPMB</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-bold font-bricolage text-2xl text-brand-navy tracking-tight sm:text-3xl">
              Mulai Eksplorasi
            </h2>
            <p className="mt-2 font-manrope text-sm text-text-muted-custom">
              Pilih salah satu kategori di bawah untuk memulai.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <Link href={"/explore/universities" as any} className="group block">
              <div className="relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy/10 to-brand-orange/10">
                    <Building2 className="h-6 w-6 text-brand-navy/60" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold font-bricolage text-brand-navy text-lg transition-colors group-hover:text-brand-orange">
                      Universities
                    </h3>
                    <p className="font-manrope text-text-muted-custom text-xs">408 perguruan tinggi</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-gray-200 transition-all group-hover:translate-x-1 group-hover:text-brand-orange" />
                </div>
                <p className="mt-3 font-manrope text-sm text-text-muted-custom leading-relaxed">
                  Lihat akreditasi, program studi, biaya kuliah, dan statistik lengkap.
                </p>
                <div className="mt-4 flex items-center gap-4 border-gray-50 border-t pt-3 font-manrope text-[10px] text-text-muted-custom">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {totalUni.toLocaleString()} PT
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {totalProg.toLocaleString()} prodi
                  </span>
                </div>
              </div>
            </Link>

            <Link href={"/explore/study-programs" as any} className="group block">
              <div className="relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy/10 to-brand-orange/10">
                    <BookOpen className="h-6 w-6 text-brand-navy/60" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold font-bricolage text-brand-navy text-lg transition-colors group-hover:text-brand-orange">
                      Program Studi
                    </h3>
                    <p className="font-manrope text-text-muted-custom text-xs">
                      {totalProg.toLocaleString()} program studi
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-gray-200 transition-all group-hover:translate-x-1 group-hover:text-brand-orange" />
                </div>
                <p className="mt-3 font-manrope text-sm text-text-muted-custom leading-relaxed">
                  Cari jurusan impian dan lihat di universitas mana saja tersedia.
                </p>
                <div className="mt-4 flex items-center gap-4 border-gray-50 border-t pt-3 font-manrope text-[10px] text-text-muted-custom">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    38 provinsi
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    S1-S3 & D3-D4
                  </span>
                </div>
              </div>
            </Link>

            <Link href={"/explore/passing-grade" as any} className="group block">
              <div className="relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange/10 to-brand-orange/20">
                    <BarChart3 className="h-6 w-6 text-brand-orange/70" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold font-bricolage text-brand-navy text-lg transition-colors group-hover:text-brand-orange">
                      Passing Grade
                    </h3>
                    <p className="font-manrope text-text-muted-custom text-xs">Data SNBP/SNBT 2021-2025</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-gray-200 transition-all group-hover:translate-x-1 group-hover:text-brand-orange" />
                </div>
                <p className="mt-3 font-manrope text-sm text-text-muted-custom leading-relaxed">
                  Cek tingkat keketatan jurusan di setiap PTN. Data daya tampung dan peminat.
                </p>
                <div className="mt-4 flex items-center gap-4 border-gray-50 border-t pt-3 font-manrope text-[10px] text-text-muted-custom">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    261rb data peminat
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    146 PTN
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-brand-navy py-16 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy to-brand-navy/80" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Sparkles className="mx-auto h-8 w-8 text-brand-orange" />
          <h2 className="mt-3 font-bold font-bricolage text-2xl text-white sm:text-3xl">
            Butuh bantuan milih jurusan?
          </h2>
          <p className="mt-2 font-manrope text-white/70">
            Tim mentor MulaiPlus siap bantu kamu menentukan pilihan terbaik.
          </p>
          <Button className="mt-6 rounded-full bg-brand-orange px-8 font-manrope text-white shadow-lg hover:bg-brand-orange/90">
            Konsultasi Gratis <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
