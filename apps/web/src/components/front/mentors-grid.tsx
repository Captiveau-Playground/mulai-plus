"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Briefcase, GraduationCap, Search, SlidersHorizontal, Users, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

function menteeLabel(n: number) {
  if (!n) return null;
  return n < 10 ? `${n} mentee` : `${Math.floor(n / 10) * 10}+ mentee`;
}

/** Kartu mentor: foto besar (rasio 4:5) supaya tajam, overlay nama + kampus. */
function MentorCard({ m }: { m: any }) {
  const mentee = menteeLabel(m.menteeCount ?? 0);
  return (
    <Link
      href={`/mentors/${m.slug ?? m.id}` as any}
      className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white transition-all hover:-translate-y-1 hover:border-teal-500/30 hover:shadow-teal-500/5 hover:shadow-xl"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100">
        {m.image ? (
          <Image
            src={m.image}
            alt={m.name}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 360px"
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-teal-50">
            <GraduationCap className="h-14 w-14 text-teal-300" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-navy/85 via-brand-navy/20 to-transparent" />

        {m.kampus && (
          <span className="absolute top-3 left-3 inline-flex max-w-[85%] items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 font-manrope font-semibold text-[11px] text-brand-navy shadow-sm backdrop-blur">
            <GraduationCap className="h-3 w-3 shrink-0 text-teal-600" />
            <span className="truncate">{m.kampus}</span>
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="font-bold font-bricolage text-white text-xl leading-tight">{m.name}</p>
          <p className="mt-0.5 line-clamp-1 font-manrope text-white/75 text-xs">{m.jurusan || "Mentor MULAI+"}</p>
        </div>

        <span className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-navy opacity-0 shadow-sm transition-all group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="space-y-2 p-4">
        {m.bidangPekerjaan && (
          <p className="flex items-start gap-2 font-manrope text-gray-600 text-xs">
            <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
            <span className="line-clamp-2">{m.bidangPekerjaan}</span>
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="font-manrope text-[11px] text-gray-400">
            {m.tahunMasuk ? `Angkatan ${m.tahunMasuk}` : "Mentor aktif"}
          </span>
          {mentee && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 font-manrope font-semibold text-[11px] text-teal-700">
              <Users className="h-3 w-3" /> {mentee}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function MentorsGrid() {
  const [q, setQ] = useState("");
  const [campus, setCampus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    ...orpc.programs.public.mentors.queryOptions({ input: { limit: 60 } as any }),
    staleTime: 1000 * 60 * 5,
  });
  const mentors: any[] = (data as any) ?? [];

  const campuses = useMemo(() => [...new Set(mentors.map((m) => m.kampus).filter(Boolean))] as string[], [mentors]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return mentors.filter((m) => {
      if (campus !== "all" && m.kampus !== campus) return false;
      if (!s) return true;
      return [m.name, m.kampus, m.jurusan, m.bidangPekerjaan]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(s));
    });
  }, [mentors, q, campus]);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  if (mentors.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <span className="text-5xl">🎓</span>
        <h2 className="mt-4 font-bold font-bricolage text-brand-navy text-xl">Profil mentor segera hadir</h2>
        <p className="mt-2 font-manrope text-gray-500 text-sm">
          Tim mentor kami sedang melengkapi profilnya. Sementara itu, kamu bisa lihat program & jadwalkan konsultasi.
        </p>
        <Link
          href={"/programs" as any}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-navy px-6 py-3 font-bold font-bricolage text-sm text-white"
        >
          Lihat Semua Program <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      {/* Search + filter */}
      <div className="mb-7 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari mentor, kampus, atau jurusan…"
                className="h-11 rounded-xl border-gray-200 bg-white pr-9 pl-10"
                data-testid="mentors-search"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Hapus pencarian"
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="ml-auto shrink-0 font-manrope text-[11px] text-gray-400">
              <b className="text-gray-700">{filtered.length}</b> mentor
            </p>
          </div>

          {campuses.length > 0 && (
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
              <span className="inline-flex shrink-0 items-center gap-1 font-manrope font-semibold text-[11px] text-gray-400 uppercase tracking-wide">
                <SlidersHorizontal className="h-3 w-3" /> Kampus
              </span>
              {[{ key: "all", label: "Semua" }, ...campuses.map((c) => ({ key: c, label: c }))].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setCampus(f.key)}
                  title={f.label}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 font-manrope font-semibold text-[11px] transition-colors",
                    campus === f.key
                      ? "border-brand-navy bg-brand-navy text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-teal-500/40 hover:text-teal-700",
                  )}
                >
                  <span className="block max-w-[200px] truncate">{f.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <MentorCard key={m.id} m={m} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-10 rounded-2xl border border-gray-200 border-dashed bg-gray-50/50 p-10 text-center">
          <p className="font-manrope text-gray-600 text-sm">
            Tidak ada mentor yang cocok{q ? ` dengan “${q}”` : ""}
            {campus !== "all" ? ` di ${campus}` : ""}.
          </p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setCampus("all");
            }}
            className="mt-3 rounded-lg bg-brand-navy px-4 py-2 font-manrope font-semibold text-white text-xs"
          >
            Reset filter
          </button>
        </div>
      )}
    </section>
  );
}
