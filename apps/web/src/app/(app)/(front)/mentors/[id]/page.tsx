"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  CalendarDays,
  Globe,
  GraduationCap,
  Instagram,
  Linkedin,
  Loader2,
  Music2,
  Twitter,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { orpc } from "@/utils/orpc";

function fmtMonthYear(v: string | Date | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function menteeLabel(n: number) {
  if (!n) return null;
  return n < 10 ? `${n} mentee terbimbing` : `${Math.floor(n / 10) * 10}+ mentee terbimbing`;
}

const SOCIAL_ICON: Record<string, any> = {
  instagram: Instagram,
  tiktok: Music2,
  linkedin: Linkedin,
  x: Twitter,
  threads: Music2,
  website: Globe,
};

function socialHref(key: string, v: string) {
  if (!v) return "";
  if (v.startsWith("http")) return v;
  const handle = v.replace(/^@/, "");
  switch (key) {
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "tiktok":
      return `https://tiktok.com/@${handle}`;
    case "linkedin":
      return `https://linkedin.com/in/${handle}`;
    case "x":
      return `https://x.com/${handle}`;
    case "threads":
      return `https://threads.net/@${handle}`;
    default:
      return `https://${handle}`;
  }
}

export default function MentorProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading } = useQuery({
    ...orpc.programs.public.mentor.queryOptions({ input: { id } }),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
  const m: any = data;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
      </div>
    );
  }
  if (!m) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <span className="text-5xl">🔍</span>
        <h1 className="mt-4 font-bold font-bricolage text-brand-navy text-xl">Mentor tidak ditemukan</h1>
        <p className="mt-2 font-manrope text-gray-500 text-sm">
          Profil ini mungkin belum dipublikasikan oleh mentornya.
        </p>
        <Link
          href={"/mentors" as any}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-navy px-6 py-3 font-bold font-bricolage text-sm text-white"
        >
          Lihat semua mentor <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const socials = Object.entries(m.socialMedia ?? {}).filter(([, v]) => !!v) as [string, string][];
  const pencapaian = String(m.pencapaian ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="bg-bg-light">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={"/mentors" as any}
          className="inline-flex items-center gap-2 font-manrope text-gray-500 text-sm transition-colors hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Semua mentor
        </Link>

        {/* Kartu profil */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-brand-navy to-brand-navy-light px-6 py-8 sm:px-10">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-4 ring-white/20">
                {m.image ? (
                  <Image
                    src={m.image}
                    alt={m.name}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <GraduationCap className="h-10 w-10 text-white/70" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-bold font-bricolage text-2xl text-white sm:text-3xl">{m.name}</h1>
                <p className="mt-1 font-manrope text-sm text-white/70">
                  {[m.jurusan, m.kampus].filter(Boolean).join(" · ") || "Mentor MULAI+"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.bidangPekerjaan && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-manrope text-white/80 text-xs">
                      <Briefcase className="h-3 w-3" /> {m.bidangPekerjaan}
                    </span>
                  )}
                  {menteeLabel(m.menteeCount ?? 0) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-manrope text-white/80 text-xs">
                      <Users className="h-3 w-3" /> {menteeLabel(m.menteeCount ?? 0)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-manrope text-white/80 text-xs">
                    <CalendarDays className="h-3 w-3" /> Bergabung {fmtMonthYear(m.bergabungPada)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-8 sm:px-10 md:grid-cols-2">
            {/* Pencapaian */}
            <div>
              <h2 className="flex items-center gap-2 font-bold font-bricolage text-brand-navy text-lg">
                <Award className="h-4.5 h-[18px] w-4.5 w-[18px]" /> Pencapaian karier
              </h2>
              {pencapaian.length ? (
                <ul className="mt-3 space-y-2">
                  {pencapaian.map((p, i) => (
                    <li key={i} className="flex gap-2 font-manrope text-gray-600 text-sm">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 font-manrope text-gray-400 text-sm">Belum ada pencapaian yang ditambahkan.</p>
              )}
            </div>

            {/* Media sosial + program */}
            <div className="space-y-6">
              <div>
                <h2 className="font-bold font-bricolage text-brand-navy text-lg">Media sosial</h2>
                {socials.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {socials.map(([k, v]) => {
                      const Icon = SOCIAL_ICON[k] ?? Globe;
                      return (
                        <a
                          key={k}
                          href={socialHref(k, v)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 font-manrope text-gray-600 text-xs transition-colors hover:border-teal-500/40 hover:text-teal-700"
                        >
                          <Icon className="h-3.5 w-3.5" /> {v}
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 font-manrope text-gray-400 text-sm">Belum ada media sosial.</p>
                )}
              </div>

              {(m.programs ?? []).length > 0 && (
                <div>
                  <h2 className="font-bold font-bricolage text-brand-navy text-lg">Program yang diampu</h2>
                  <div className="mt-3 space-y-2">
                    {m.programs.map((p: any) => (
                      <Link
                        key={p.programSlug}
                        href={`/programs/${p.programSlug}` as any}
                        className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 font-manrope text-gray-700 text-sm transition-colors hover:bg-teal-50"
                      >
                        <span className="truncate">{p.programName}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm sm:flex-row sm:justify-between sm:text-left">
          <p className="font-manrope text-gray-600 text-sm">
            Mau dibimbing langsung oleh <b>{m.name?.split(" ")[0]}</b>? Lihat program mentoring yang tersedia.
          </p>
          <Link
            href={"/programs" as any}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-orange px-5 py-3 font-bold font-bricolage text-sm text-white shadow-md transition-all hover:brightness-105"
          >
            Lihat program <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
