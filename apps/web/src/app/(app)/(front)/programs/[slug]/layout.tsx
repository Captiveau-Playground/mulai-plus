import { env } from "@mulai-plus/env/web";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  robots:
    env.NEXT_PUBLIC_SERVER_URL === "https://api.staging.mulaiplus.id" ? { index: false, follow: false } : undefined,
};

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
      <Script id="jsonld-org-website" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      {children}
    </>
  );
}
