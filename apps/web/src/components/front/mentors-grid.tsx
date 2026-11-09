"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Check, ChevronDown, GraduationCap, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MentorCard } from "@/components/front/mentor-card";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

/** Filter kampus versi ringkas: satu tombol + dropdown (bukan deretan chip panjang). */
function CampusFilter({
  campuses,
  value,
  onChange,
}: {
  campuses: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = value !== "all";
  const label = active ? value : "Semua kampus";

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="mentors-campus-filter"
        className={`inline-flex h-11 max-w-[240px] items-center gap-2 rounded-xl border px-3.5 font-manrope font-semibold text-xs transition-colors ${
          active
            ? "border-brand-navy bg-brand-navy text-white"
            : "border-gray-200 bg-white text-gray-600 hover:border-teal-500/40 hover:text-teal-700"
        }`}
      >
        <GraduationCap className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-40 mt-2 max-h-72 w-64 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl"
        >
          {[{ key: "all", label: "Semua kampus" }, ...campuses.map((c) => ({ key: c, label: c }))].map((o) => {
            const isActive = value === o.key;
            return (
              <button
                key={o.key}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onChange(o.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left font-manrope text-xs transition-colors ${
                  isActive ? "bg-teal-50 font-semibold text-teal-800" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {isActive && <Check className="h-3.5 w-3.5 text-teal-600" />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
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
      {/* Search + filter (ringkas: satu input + satu dropdown kampus) */}
      <div className="mb-7 flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50/60 p-3 sm:flex-row sm:items-center">
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

        {campuses.length > 0 && <CampusFilter campuses={campuses} value={campus} onChange={setCampus} />}

        {(q || campus !== "all") && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setCampus("all");
            }}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-xl px-3 font-manrope font-semibold text-gray-500 text-xs transition-colors hover:text-brand-navy"
          >
            <X className="h-3.5 w-3.5" /> Reset
          </button>
        )}

        <p className="shrink-0 font-manrope text-[11px] text-gray-400 sm:ml-auto">
          <b className="text-gray-700">{filtered.length}</b> mentor
        </p>
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
