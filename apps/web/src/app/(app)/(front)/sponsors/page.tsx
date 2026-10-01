import { Github, Heart } from "lucide-react";
import Image from "next/image";

export const metadata = {
  title: "Sponsor & Partner — MULAI+",
  description:
    "Terima kasih untuk partner, infrastruktur, dan open-source yang mendukung MULAI+ — UPN Veteran Jawa Timur, Cloudflare, Amplitude, Sentry, dan API Sekolah Mandiri.",
};

type Sponsor = {
  name: string;
  tag: string;
  logo: string;
  href: string;
  alt: string;
};

const TIER1: Sponsor[] = [
  {
    name: "UPN Veteran Jawa Timur",
    tag: "Pendanaan Riset",
    logo: "/sponsors/upn-veteran-jatim.png",
    href: "https://upnjatim.ac.id",
    alt: "Logo Universitas Pembangunan Nasional Veteran Jawa Timur",
  },
];

const TIER2: Sponsor[] = [
  {
    name: "Cloudflare",
    tag: "Cloudflare for Startups",
    logo: "/sponsors/cloudflare.svg",
    href: "https://www.cloudflare.com/forstartups/",
    alt: "Logo Cloudflare",
  },
  {
    name: "Amplitude",
    tag: "Product Analytics",
    logo: "/sponsors/amplitude.png",
    href: "https://amplitude.com",
    alt: "Logo Amplitude",
  },
  {
    name: "Sentry",
    tag: "Product Monitoring",
    logo: "/sponsors/sentry.svg",
    href: "https://sentry.io",
    alt: "Logo Sentry",
  },
  {
    name: "Neon",
    tag: "Serverless Postgres",
    logo: "/sponsors/neon.svg",
    href: "https://neon.tech",
    alt: "Logo Neon",
  },
];

const TIER3: Sponsor[] = [
  {
    name: "API Sekolah Mandiri",
    tag: "Open Source & Data",
    logo: "/sponsors/github.svg",
    href: "https://github.com/bahrye/api-sekolah-indonesia",
    alt: "Logo GitHub — API Sekolah Mandiri",
  },
];

function LogoBox({ sponsor, className = "" }: { sponsor: Sponsor; className?: string }) {
  return (
    <span
      title={sponsor.name}
      className={`relative flex items-center justify-center overflow-hidden object-contain ${className}`}
    >
      <Image
        src={sponsor.logo}
        alt={sponsor.alt}
        fill
        sizes="(max-width: 640px) 160px, 200px"
        className="object-contain object-center"
      />
    </span>
  );
}

export default function SponsorsPage() {
  return (
    <main className="bg-white">
      {/* Header */}
      <section className="relative overflow-hidden bg-white pt-28 pb-12 lg:pt-36 lg:pb-16">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-[320px] w-[320px] rounded-full opacity-[0.08]"
          style={{ background: "var(--brand-orange)" }}
        />
        <div className="relative mx-auto max-w-5xl px-4 text-center md:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/20 bg-brand-orange/5 px-3.5 py-1.5 font-manrope font-medium text-[11px] text-brand-orange tracking-wide">
            <Heart className="size-3.5" /> Terima kasih
          </span>
          <h1 className="mt-4 font-bold font-bricolage text-4xl text-brand-navy sm:text-5xl">
            Sponsor &amp; <span className="text-brand-orange">Partner</span> MULAI+
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-manrope text-sm text-text-muted leading-relaxed sm:text-base">
            MULAI+ berjalan di atas infrastruktur kelas enterprise, didukung kampus mitra, dan data terbuka komunitas —
            semuanya tanpa biaya untuk pelajar Indonesia.
          </p>
        </div>
      </section>

      {/* Tier 1 */}
      <section className="pb-14">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <h2 className="mb-5 flex items-center gap-2 font-bold font-bricolage text-brand-navy text-sm uppercase tracking-wider">
            <span className="rounded-md bg-brand-navy px-2 py-0.5 font-manrope text-[10px] text-white">Tier 1</span>
            Kemitraan Utama
          </h2>
          <div className="grid gap-4 md:grid-cols-1">
            {TIER1.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-5 rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-brand-orange/40 hover:shadow-lg"
              >
                <LogoBox sponsor={s} className="h-16 w-16 shrink-0" />
                <div>
                  <h3 className="font-bold font-bricolage text-brand-navy text-lg group-hover:text-brand-orange">
                    {s.name}
                  </h3>
                  <span className="mt-1 w-fit rounded-md bg-brand-orange/10 px-2 py-0.5 font-manrope font-semibold text-[10px] text-brand-orange">
                    {s.tag}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Tier 2 */}
      <section className="pb-14">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <h2 className="mb-5 flex items-center gap-2 font-bold font-bricolage text-brand-navy text-sm uppercase tracking-wider">
            <span className="rounded-md bg-brand-navy px-2 py-0.5 font-manrope text-[10px] text-white">Tier 2</span>
            Infrastruktur &amp; Tools
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TIER2.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-brand-orange/40 hover:shadow-lg"
              >
                <LogoBox sponsor={s} className="h-10 w-32" />
                <span className="mt-3 w-fit rounded-md bg-brand-orange/10 px-2 py-0.5 font-manrope font-semibold text-[10px] text-brand-orange">
                  {s.tag}
                </span>
                <h3 className="mt-1 font-bold font-bricolage text-base text-brand-navy group-hover:text-brand-orange">
                  {s.name}
                </h3>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Tier 3 */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <h2 className="mb-5 flex items-center gap-2 font-bold font-bricolage text-brand-navy text-sm uppercase tracking-wider">
            <span className="rounded-md bg-brand-navy px-2 py-0.5 font-manrope text-[10px] text-white">Tier 3</span>
            Open Source &amp; Data
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {TIER3.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-brand-orange/40 hover:shadow-lg sm:col-span-2"
              >
                <LogoBox sponsor={s} className="h-10 w-16 shrink-0" />
                <div className="flex-1">
                  <span className="rounded-md bg-brand-orange/10 px-2 py-0.5 font-manrope font-semibold text-[10px] text-brand-orange">
                    {s.tag}
                  </span>
                  <h3 className="mt-1 flex items-center gap-1.5 font-bold font-bricolage text-base text-brand-navy group-hover:text-brand-orange">
                    {s.name} <Github className="size-3.5" />
                  </h3>
                </div>
              </a>
            ))}
          </div>
          <p className="mt-6 text-center font-manrope text-[11px] text-muted-foreground">
            Logo, nama, dan merek dagang sepenuhnya milik pemilik masing-masing. Digunakan untuk tujuan pemberian
            kredit.
          </p>
        </div>
      </section>
    </main>
  );
}
