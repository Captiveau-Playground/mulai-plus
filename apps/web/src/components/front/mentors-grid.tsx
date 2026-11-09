"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GraduationCap, Search, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

function menteeLabel(n: number) {
  if (!n) return null;
  return n < 10 ? `${n} mentee` : `${Math.floor(n / 10) * 10}+ mentee`;
}

export function MentorsGrid() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    ...orpc.programs.public.mentors.queryOptions({ input: { limit: 60 } as any }),
    staleTime: 1000 * 60 * 5,
  });
  const mentors: any[] = (data as any) ?? [];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return mentors;
    return mentors.filter((m) =>
      [m.name, m.kampus, m.jurusan, m.bidangPekerjaan]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(s)),
    );
  }, [mentors, q]);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100" />
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
          Lihat Semua Program <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="relative mb-6 w-full sm:max-w-sm">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama, kampus, atau jurusan…"
          className="pl-9"
          data-testid="mentors-search"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => {
          const mentee = menteeLabel(m.menteeCount ?? 0);
          return (
            <Link
              key={m.id}
              href={`/mentors/${m.id}` as any}
              className="group rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-teal-500/30 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-500/10">
                  {m.image ? (
                    <Image
                      src={m.image}
                      alt={m.name}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <GraduationCap className="h-6 w-6 text-teal-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold font-bricolage text-base text-gray-900">{m.name}</p>
                  <p className="truncate font-manrope text-gray-500 text-xs">{m.kampus || "—"}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 font-manrope text-gray-600 text-sm">{m.jurusan || "—"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {m.bidangPekerjaan && (
                  <span className="rounded-full bg-gray-50 px-2.5 py-1 font-manrope text-[11px] text-gray-600">
                    {m.bidangPekerjaan}
                  </span>
                )}
                {mentee && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 font-manrope text-[11px] text-teal-700">
                    <Users className="h-3 w-3" /> {mentee}
                  </span>
                )}
              </div>
              <span className="mt-4 inline-flex items-center gap-1 font-bold font-manrope text-teal-600 text-xs">
                Lihat detail <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="mt-8 text-center font-manrope text-gray-500 text-sm">Tidak ada mentor yang cocok dengan “{q}”.</p>
      )}
    </section>
  );
}
