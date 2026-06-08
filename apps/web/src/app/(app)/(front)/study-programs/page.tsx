"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Loader2, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function StudyProgramsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const pageSize = 20;

  const { data: _data, isLoading } = useQuery({
    ...api.pddikti.publicListStudyPrograms.queryOptions({
      input: { page: page + 1, pageSize, search: search || undefined, level: level === "all" ? undefined : level },
    }),
    staleTime: 1000 * 60 * 5,
  });
  const { data: _levels } = useQuery(api.pddikti.publicListProgramLevels.queryOptions());

  const data = _data as any;
  const programs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const levels = _levels as string[] | undefined;

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-brand-navy pt-20 sm:pt-24">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy to-brand-navy/80" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange shadow-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
          </div>
          <h1 className="font-bold font-bricolage text-4xl text-white tracking-tight md:text-5xl">
            Jelajahi {total.toLocaleString()} Program Studi
          </h1>
          <p className="mt-3 font-manrope text-lg text-white/70">
            Temukan program studi impianmu dari berbagai jenjang dan perguruan tinggi.
          </p>
          <div className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari program studi..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full rounded-full border-0 bg-white/10 pl-10 text-sm text-white placeholder:text-white/40 focus-visible:ring-white/30"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="font-manrope font-medium text-[10px] text-text-muted-custom uppercase tracking-wider">
                Jenjang
              </Label>
              <Select
                value={level}
                onValueChange={(v) => {
                  setLevel(v ?? "all");
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-[130px] rounded-xl border-gray-200 font-manrope text-xs">
                  <SelectValue placeholder="Semua Jenjang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenjang</SelectItem>
                  {levels?.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-text-muted-custom" />}
            <span className="ml-auto font-manrope text-text-muted-custom text-xs">
              {total.toLocaleString()} program studi
            </span>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading && programs.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
            </div>
          ) : programs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <BookOpen className="h-12 w-12 text-text-muted-custom" />
              <p className="font-manrope text-lg text-text-muted-custom">Tidak ada program studi ditemukan</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((p: any) => (
                <Link key={p.idSms} href={`/study-programs/${slugify(p.name, p.idSms)}` as any}>
                  <div className="group flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-navy/10 to-brand-orange/10">
                          <BookOpen className="h-4 w-4 text-brand-navy/60" />
                        </div>
                        <h3 className="truncate font-bold font-bricolage text-brand-navy text-sm transition-colors group-hover:text-brand-orange">
                          {p.name}
                        </h3>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 pl-10">
                        <Badge variant="outline" className="font-manrope text-[10px]">
                          {p.level ?? "-"}
                        </Badge>
                        {p.accreditation && (
                          <Badge
                            variant="outline"
                            className="border-green-500/20 bg-green-500/10 font-manrope text-[10px] text-green-600"
                          >
                            {p.accreditation}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="ml-3 h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-orange" />
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

      <section className="relative overflow-hidden bg-brand-navy py-16 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy to-brand-navy/80" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Sparkles className="mx-auto h-8 w-8 text-brand-orange" />
          <h2 className="mt-3 font-bold font-bricolage text-2xl text-white sm:text-3xl">Masih bingung?</h2>
          <p className="mt-2 font-manrope text-white/70">
            Konsultasi gratis dengan mentor kami untuk menentukan jurusan yang tepat.
          </p>
          <Button className="mt-6 rounded-full bg-brand-orange px-8 font-manrope text-white shadow-lg hover:bg-brand-orange/90">
            Konsultasi Gratis <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
