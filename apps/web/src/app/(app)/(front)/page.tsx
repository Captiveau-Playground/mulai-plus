"use client";
import Script from "next/script";

import { AboutUs } from "@/components/front/about-us";
import { CTASection } from "@/components/front/cta-section";
import { FAQSection } from "@/components/front/faq-section";
import { FeaturedPrograms } from "@/components/front/featured-programs";
import { HeroSection } from "@/components/front/hero-section";
import { MeetTheMentor } from "@/components/front/meet-the-mentor";
import { FAQS, jsonLdBreadcrumb, jsonLdFAQ, jsonLdOrganization, jsonLdWebpage, jsonLdWebsite } from "@/lib/site-config";

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      jsonLdOrganization(),
      jsonLdWebsite(),
      jsonLdWebpage(),
      jsonLdBreadcrumb([
        { name: "Home", href: "/" },
        { name: "Programs", href: "/programs" },
      ]),
      jsonLdFAQ(FAQS),
    ],
  };

  return (
    <div className="flex w-full flex-col">
      <Script id="jsonld-home" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>
      <HeroSection />
      <AboutUs />
      <FeaturedPrograms />
      <MeetTheMentor />
      <FAQSection />
      <CTASection />
    </div>
  );
}
