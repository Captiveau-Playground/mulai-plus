import { env } from "@mulai-plus/env/web";
import { GraduationCap, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { provinceBySlug } from "@/lib/provinces";

const API = env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

function _slug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Landing SEO: universitas di {provinsi} — daftar & tautan ke kampus + filter explore. */
export default async function ProvincePage({ params }: { params: Promise<{ provinsi: string }> }) {
  const { provinsi } = await params;
  const p = provinceBySlug(provinsi);
  if (!p) notFound();

  let universities: { slug?: string; name?: string; type?: string; accreditation?: string }[] = [];
  try {
    const res = await fetch(`${API}/rpc/pddikti.publicListUniversities`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ json: { province: p.name, page: 1, pageSize: 30 } }),
      cache: "no-store",
    });
    const data = (await res.json()) as { data?: typeof universities };
    universities = data?.data ?? [];
  } catch {
    /* API tidak tersedia — fallback kopi saja */
  }

  const canonical = `https://mulaiplus.id/universitas/${p.slug}`;

  return (
    <main className="bg-white">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Beranda", item: "https://mulaiplus.id/" },
              {
                "@type": "ListItem",
                position: 2,
                name: "Universitas",
                item: "https://mulaiplus.id/explore/universities",
              },
              { "@type": "ListItem", position: 3, name: p.name, item: canonical },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Universitas di ${p.name} | MULAI+`,
            description: `Daftar universitas di provinsi ${p.name} — PTN/PTS, akreditasi, program studi, dan passing grade.`,
            url: canonical,
          },
        ]}
      />

      <section className="bg-gradient-to-b from-brand-navy to-[#23298f] pt-24 pb-12 lg:pt-28">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3.5 py-1.5 font-manrope font-medium text-[11px] text-brand-orange tracking-wide">
            <MapPin className="size-3.5" /> Provinsi {p.name}
          </span>
          <h1 className="mt-4 font-bold font-bricolage text-3xl text-white sm:text-4xl">Universitas di {p.name}</h1>
          <p className="mx-auto mt-3 max-w-2xl font-manrope text-sm text-white/75 leading-relaxed">
            Temukan universitas negeri &amp; swasta di provinsi {p.name} — lengkap dengan akreditasi, program studi, dan
            estimasi passing grade. Data bersumber dari PDDikti &amp; SNPMB.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href={`/explore/universities?province=${encodeURIComponent(p.name)}`}>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-6 py-3 font-bold font-manrope text-sm text-white shadow-lg transition-all hover:brightness-105">
                <Sparkles className="size-4" /> Lihat Semua di Explore
              </span>
            </Link>
            <Link href="/explore/ai-assistant">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 font-bold font-manrope text-sm text-white transition-all hover:bg-white/20">
                Tanya Mul.ai — rekomendasi kampus
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4">
          {universities.length === 0 ? (
            <p className="text-center font-manrope text-muted-foreground text-sm">
              Data sedang dimuat — coba halaman{" "}
              <Link href="/explore/universities" className="text-brand-navy underline underline-offset-2">
                Explore Universitas
              </Link>
              .
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {universities.map((u, i) => (
                <Link
                  key={i}
                  href={u.slug ? `/explore/universities/${u.slug}` : "/explore/universities"}
                  className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-brand-orange/40 hover:shadow-md"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-navy/10">
                    <GraduationCap className="size-4.5 text-brand-navy" />
                  </span>
                  <h2 className="mt-2 font-bold font-bricolage text-brand-navy text-sm group-hover:text-brand-orange">
                    {u.name}
                  </h2>
                  <p className="mt-1 font-manrope text-[11px] text-muted-foreground">
                    {u.type ?? "Perguruan tinggi"} ·{" "}
                    {u.accreditation ? `Terakreditasi ${u.accreditation}` : "Akreditasi —"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export async function generateStaticParams() {
  const { PROVINCES } = await import("@/lib/provinces");
  return PROVINCES.map((p) => ({ provinsi: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ provinsi: string }> }) {
  const { provinsi } = await params;
  const p = provinceBySlug(provinsi);
  if (!p) return {};
  return {
    title: `Universitas di ${p.name} — Daftar PTN/PTS & Passing Grade | MULAI+`,
    description: `Cari universitas negeri & swasta di ${p.name}: akreditasi, program studi, dan estimasi passing grade SNBP/SNBT. Data PDDikti & SNPMB.`,
    alternates: { canonical: `/universitas/${p.slug}` },
  };
}
