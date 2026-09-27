import { AboutUs } from "@/components/front/about-us";
import { AssessmentSection } from "@/components/front/assessment-section";
import { BlogSection } from "@/components/front/blog-section";
import { CTASection } from "@/components/front/cta-section";
import { ExploreSection } from "@/components/front/explore-section";
import { FAQSection } from "@/components/front/faq-section";
import { FeaturedPrograms } from "@/components/front/featured-programs";
import { HeroSection } from "@/components/front/hero-section";
import { MeetTheMentor } from "@/components/front/meet-the-mentor";
import { client } from "@/lib/client";
import { FAQS, jsonLdBreadcrumb, jsonLdFAQ, jsonLdOrganization, jsonLdWebpage, jsonLdWebsite } from "@/lib/site-config";

// ISR 5 menit: homepage disajikan dari cache — DB (Hyperdrive CF) hanya dipanggil saat revalidate,
// jadi monitor/visitor tidak pernah menunggu query lambat/dingin.
export const revalidate = 300;

export default async function LandingPage() {
  const withTimeout = async <T,>(p: Promise<T>, ms: number, fb: T): Promise<T> =>
    Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fb), ms))]);
  // Jangan biarkan query DB menahan page > 6 dtk → fallback kosong (isi refresh saat revalidate).
  const [programsData, articlesData] = await Promise.all([
    withTimeout(
      client.programs.public.list({ limit: 10 }).catch(() => ({ data: [] })),
      6000,
      { data: [] },
    ),
    withTimeout(
      client.cms.articles.public.list({ limit: 4, offset: 0 }).catch(() => ({ data: [] })),
      6000,
      { data: [] },
    ),
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
      <AssessmentSection />
      <FeaturedPrograms initialData={programsData} />
      <ExploreSection />
      <BlogSection initialData={articlesData} />
      <MeetTheMentor />
      <FAQSection />
      <CTASection />
    </main>
  );
}
