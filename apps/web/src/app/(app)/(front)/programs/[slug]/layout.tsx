import { env } from "@mulai-plus/env/web";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;

  try {
    const apiUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
    const res = await fetch(`${apiUrl}/rpc/programs.public.get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ slug }]),
      next: { revalidate: 300 },
    });

    if (!res.ok) return { alternates: { canonical: `/programs/${slug}` } };

    const program = (await res.json()) as {
      name: string;
      description: string | null;
      bannerUrl: string | null;
    };

    if (!program) return { alternates: { canonical: `/programs/${slug}` } };

    const title = `${program.name} — Program Mentoring MULAI+`;
    const description =
      program.description || `Ikuti program ${program.name} MULAI+ dan dapatkan bimbingan dari mentor berpengalaman.`;

    return {
      title,
      description,
      robots:
        env.NEXT_PUBLIC_SERVER_URL === "https://api.staging.mulaiplus.id" ? { index: false, follow: false } : undefined,
      alternates: { canonical: `/programs/${slug}` },
      openGraph: {
        title,
        description,
        images: program.bannerUrl ? [{ url: program.bannerUrl, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return { alternates: { canonical: `/programs/${slug}` } };
  }
}

export default function ProgramSlugLayout({ children }: { children: React.ReactNode }) {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "MULAI+",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/letter-icon-logo.svg`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "MULAI+",
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "id-ID",
      },
    ],
  };

  return (
    <>
      <script
        id="jsonld-org-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
