"use client";

import { AboutUs } from "@/components/front/about-us";
import { BlogSection } from "@/components/front/blog-section";
import { CTASection } from "@/components/front/cta-section";
import { ExploreSection } from "@/components/front/explore-section";
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
      jsonLdBreadcrumb([{ name: "Home", href: "/" }]),
      jsonLdFAQ(FAQS),
    ],
  };

  return (
    <div className="flex w-full flex-col">
      <script
        id="jsonld-home"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      <AboutUs />
      <FeaturedPrograms />
      <ExploreSection />
      <BlogSection />
      <MeetTheMentor />
      <FAQSection />
      <CTASection />
    </div>
  );
}
