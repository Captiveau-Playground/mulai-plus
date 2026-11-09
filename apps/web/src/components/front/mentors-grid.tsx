"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MentorCard } from "@/components/front/mentor-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

function _menteeLabel(n: number) {
  if (!n) return null;
  return n < 10 ? `${n} mentee` : `${Math.floor(n / 10) * 10}+ mentee`;
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
