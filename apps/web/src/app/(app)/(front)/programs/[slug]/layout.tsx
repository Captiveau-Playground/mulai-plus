import { env } from "@mulai-plus/env/web";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { client } from "@/lib/client";

// ISR: revalidate every hour — content changes infrequently
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;

  const program = await client.programs.public.get({ slug }).catch(() => null);

  if (!program) {
    notFound();
  }

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
