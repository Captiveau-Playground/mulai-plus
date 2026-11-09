"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
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

function menteeLabel(n: number, suffix = "") {
  if (!n) return null;
  return n < 10 ? `${n} mentee${suffix}` : `${Math.floor(n / 10) * 10}+ mentee${suffix}`;
}

const SOCIAL_ICON: Record<string, any> = {
  instagram: Instagram,
  tiktok: Music2,
  linkedin: Linkedin,
  x: Twitter,
  threads: Music2,
  website: Globe,
};
const SOCIAL_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
  threads: "Threads",
  website: "Website",
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
  const slug = params.id as string;
  const { data, isLoading } = useQuery({
    ...orpc.programs.public.mentor.queryOptions({ input: { slug } as any }),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
  const m: any = data;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
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
          Lihat semua mentor <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const socials = Object.entries(m.socialMedia ?? {}).filter(([, v]) => !!v) as [string, string][];
  const pencapaian = String(m.pencapaian ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const mentee = menteeLabel(m.menteeCount ?? 0, " terbimbing");

  return (
    <div className="overflow-hidden bg-white">
      {/* Breadcrumb (pola sama dengan /assessment) */}
      <div className="border-gray-100 border-b bg-white pt-16 sm:pt-20">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-manrope text-text-muted-custom text-xs">
            <Link href={"/" as any} className="transition-colors hover:text-brand-navy">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link href={"/mentors" as any} className="transition-colors hover:text-brand-navy">
              Mentor
            </Link>
            <span aria-hidden>/</span>
            <span className="truncate text-text-main">{m.name}</span>
          </nav>
        </div>
      </div>

      {/* HERO profil */}
      <section className="relative overflow-hidden border-gray-100 border-b">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-teal-500/[0.07]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <div className="grid items-start gap-8 md:grid-cols-[220px_1fr] md:gap-10">
            {/* Foto besar (rasio 4:5, tidak blur) */}
            <div className="relative mx-auto w-full max-w-[260px] overflow-hidden rounded-3xl bg-gray-100 shadow-brand-navy/10 shadow-lg md:mx-0 md:max-w-none">
              <div className="relative aspect-[4/5] w-full">
                {m.image ? (
                  <Image
                    src={m.image}
                    alt={m.name}
                    fill
                    sizes="(max-width: 768px) 80vw, 260px"
                    className="object-cover object-top"
                    unoptimized
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-teal-50">
                    <GraduationCap className="h-16 w-16 text-teal-300" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                <span className="font-manrope font-medium text-teal-700 text-xs">Mentor MULAI+</span>
              </div>
              <h1 className="mt-4 font-bold font-bricolage text-3xl text-brand-navy leading-tight tracking-tight md:text-4xl">
                {m.name}
              </h1>
              <p className="mt-2 font-manrope text-gray-500 md:text-lg">
                {[m.jurusan, m.kampus].filter(Boolean).join(" · ") || "Mentor MULAI+"}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {m.bidangPekerjaan && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy px-3.5 py-1.5 font-manrope font-semibold text-white text-xs">
                    <Briefcase className="h-3.5 w-3.5" /> {m.bidangPekerjaan}
                  </span>
                )}
                {mentee && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1.5 font-manrope font-semibold text-teal-700 text-xs">
                    <Users className="h-3.5 w-3.5" /> {mentee}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3.5 py-1.5 font-manrope font-semibold text-gray-600 text-xs">
                  <CalendarDays className="h-3.5 w-3.5" /> Bergabung {fmtMonthYear(m.bergabungPada)}
                </span>
                {m.tahunMasuk && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3.5 py-1.5 font-manrope font-semibold text-gray-600 text-xs">
                    <GraduationCap className="h-3.5 w-3.5" /> Angkatan {m.tahunMasuk}
                  </span>
                )}
              </div>

              {/* Media sosial langsung di hero */}
              {socials.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {socials.map(([k, v]) => {
                    const Icon = SOCIAL_ICON[k] ?? Globe;
                    return (
                      <a
                        key={k}
                        href={socialHref(k, v)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${SOCIAL_LABEL[k] ?? k} ${m.name}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 font-manrope text-gray-600 text-xs transition-colors hover:border-teal-500/40 hover:text-teal-700"
                      >
                        <Icon className="h-3.5 w-3.5" /> <span className="max-w-[140px] truncate">{v}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Konten */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pencapaian */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold font-bricolage text-brand-navy text-lg">
              <Award className="h-[18px] w-[18px] text-teal-600" /> Pencapaian karier
            </h2>
            {pencapaian.length ? (
              <ul className="mt-4 space-y-3">
                {pencapaian.map((p, i) => (
                  <li key={i} className="flex gap-3 font-manrope text-gray-600 text-sm leading-relaxed">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 font-bold text-[11px] text-teal-700">
                      {i + 1}
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 font-manrope text-gray-400 text-sm">Belum ada pencapaian yang ditambahkan.</p>
            )}
          </div>

          {/* Program yang diampu */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold font-bricolage text-brand-navy text-lg">
              <GraduationCap className="h-[18px] w-[18px] text-teal-600" /> Program yang diampu
            </h2>
            {(m.programs ?? []).length > 0 ? (
              <div className="mt-4 space-y-2">
                {m.programs.map((p: any) => (
                  <Link
                    key={p.programSlug}
                    href={`/programs/${p.programSlug}` as any}
                    className="group flex items-center justify-between gap-2 rounded-2xl bg-gray-50 px-4 py-3 font-manrope text-gray-700 text-sm transition-colors hover:bg-teal-50"
                  >
                    <span className="truncate">{p.programName}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-teal-600 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 font-manrope text-gray-400 text-sm">Belum ada program yang ditautkan.</p>
            )}

            <Link
              href={"/programs" as any}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-3 font-bold font-bricolage text-sm text-white shadow-md transition-all hover:brightness-105"
            >
              Lihat semua program <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <Link
            href={"/mentors" as any}
            className="inline-flex items-center gap-2 font-manrope font-semibold text-gray-500 text-sm transition-colors hover:text-brand-navy"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke semua mentor
          </Link>
        </div>
      </section>
    </div>
  );
}
