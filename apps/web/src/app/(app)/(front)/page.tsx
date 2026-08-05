import { AboutUs } from "@/components/front/about-us";
import { BlogSection } from "@/components/front/blog-section";
import { CTASection } from "@/components/front/cta-section";
import { ExploreSection } from "@/components/front/explore-section";
import { FAQSection } from "@/components/front/faq-section";
import { FeaturedPrograms } from "@/components/front/featured-programs";
import { HeroSection } from "@/components/front/hero-section";
import { MeetTheMentor } from "@/components/front/meet-the-mentor";
import { client } from "@/lib/client";
import { FAQS, jsonLdBreadcrumb, jsonLdFAQ, jsonLdOrganization, jsonLdWebpage, jsonLdWebsite } from "@/lib/site-config";

export default async function LandingPage() {
  const [programsData, articlesData] = await Promise.all([
    client.programs.public.list({ limit: 10 }).catch(() => ({ data: [] })),
    client.cms.articles.public.list({ limit: 4, offset: 0 }).catch(() => ({ data: [] })),
  ]);

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
    <main id="main-content" className="flex w-full flex-col">
      <script
        id="jsonld-home"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      <AboutUs />
      <FeaturedPrograms initialData={programsData} />
      <ExploreSection />
      <BlogSection initialData={articlesData} />
      <MeetTheMentor />
      <FAQSection />
      <CTASection />
    </main>
  );
}
