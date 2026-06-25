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
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { orpc } from "@/utils/orpc";

// biome-ignore lint/suspicious/noExplicitAny: orpc inferred type is complex
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

  // biome-ignore lint/suspicious/noExplicitAny: query result shape
  const totalUni = (_uni as any)?.total ?? 408;
  // biome-ignore lint/suspicious/noExplicitAny: query result shape
  const totalProg = (_prog as any)?.total ?? 18881;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero — compact, data-rich */}
      <section className="relative overflow-hidden pt-20 sm:pt-24">
        {/* Background image */}
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/explore/architecture.webp"
            alt=""
            fill
            className="object-cover object-bottom"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-brand-navy/70" />
          <div className="absolute inset-0 bg-brand-navy/30" />
        </div>
        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            {/* Eyebrow + heading */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange shadow-lg">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="font-manrope font-semibold text-[11px] text-brand-orange uppercase tracking-wider">
                Data Explorer
              </span>
            </div>

            <h1 className="mt-4 font-bold font-bricolage text-3xl text-white leading-tight sm:text-4xl lg:text-5xl">
              Jelajahi <span className="text-brand-orange">408 Perguruan Tinggi</span>
              <br />
              &amp; <span className="text-brand-orange">18.881 Program Studi</span>
            </h1>

            <p className="mt-3 max-w-xl font-manrope text-sm text-white/60 leading-relaxed sm:text-base">
              Data passing grade, akreditasi, dan daya tampung dari sumber resmi. Cari universitas atau jurusan
              impianmu.
            </p>

            {/* Quick search — lebih natural */}
            <div className="mt-6 max-w-xl">
              <Link href="/explore/study-programs" className="relative flex items-center">
                <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/30" />
                <div className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-11 py-3 font-manrope text-sm text-white/30 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.10]">
                  Cari jurusan, universitas, atau passing grade...
                </div>
                <kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-white/10 bg-white/[0.08] px-2 py-0.5 font-manrope text-[10px] text-white/30 sm:inline">
                  /
                </kbd>
              </Link>
            </div>

            {/* Stats inline — compact pills */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5">
                <span className="font-bold font-bricolage text-sm text-white">{totalUni.toLocaleString()}</span>
                <span className="ml-1.5 font-manrope text-white/50 text-xs">PT</span>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5">
                <span className="font-bold font-bricolage text-sm text-white">{totalProg.toLocaleString()}</span>
                <span className="ml-1.5 font-manrope text-white/50 text-xs">Prodi</span>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5">
                <span className="font-bold font-bricolage text-sm text-white">38</span>
                <span className="ml-1.5 font-manrope text-white/50 text-xs">Provinsi</span>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5">
                <span className="font-bold font-bricolage text-sm text-white">5</span>
                <span className="ml-1.5 font-manrope text-white/50 text-xs">Tahun Data</span>
              </div>
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
            <Link href="/explore/universities" className="group block">
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

            <Link href="/explore/study-programs" className="group block">
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

            <Link href="/explore/passing-grade" className="group block">
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
          <Button
            className="mt-6 rounded-full bg-brand-orange px-8 font-manrope text-white shadow-lg hover:bg-brand-orange/90"
            onClick={() => trackEvent("cta_click", { page: "explore_main" })}
          >
            Konsultasi Gratis <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
