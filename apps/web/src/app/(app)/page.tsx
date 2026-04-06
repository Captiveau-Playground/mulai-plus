"use client";
import Script from "next/script";

import { AboutUs } from "@/components/front/about-us";
import { CTASection } from "@/components/front/cta-section";
import { FAQSection } from "@/components/front/faq-section";
import { FeaturedPrograms } from "@/components/front/featured-programs";
import { HeroSection } from "@/components/front/hero-section";
import { MeetTheMentor } from "@/components/front/meet-the-mentor";
import { SocialProof } from "@/components/front/social-proof";

export default function LandingPage() {
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
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: `${siteUrl}/`,
        name: "MULAI+",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` },
        inLanguage: "id-ID",
      },
    ],
  };

  return (
    <div className="flex w-full flex-col">
      <Script id="jsonld-home" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      <HeroSection />
      <SocialProof />
      <AboutUs />
      <FeaturedPrograms />
      <MeetTheMentor />
      <FAQSection />
      <CTASection />
    </div>
  );
}
