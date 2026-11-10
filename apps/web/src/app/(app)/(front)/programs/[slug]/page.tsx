"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HeaderDetailsProgram } from "@/components/front/details-program/header-details-program";
import { ProgramAbout } from "@/components/front/details-program/program-about";
import { ProgramNavigation } from "@/components/front/details-program/program-navigation";
import { ProgramSyllabus } from "@/components/front/details-program/program-syllabus";
import { ProgramTimeline } from "@/components/front/details-program/program-timeline";
import { ProgramWhatYouWillGet } from "@/components/front/details-program/program-what-you-will-get";
import { RegistrationCTA } from "@/components/front/details-program/registration-cta";
import { FAQSection } from "@/components/front/faq-section";
import { orpc } from "@/utils/orpc";

export default function ProgramDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mulaiplus.id";
  const pageUrl = `${siteUrl}/programs/${slug}`;

  const { data: program, isLoading } = useQuery(
    orpc.programs.public.get.queryOptions({
      input: { slug },
    }),
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand-navy/40" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
        <h1 className="heading-section text-brand-navy">Program tidak ditemukan</h1>
        <p className="font-manrope text-base text-text-muted-custom">
          Program yang kamu cari sudah tidak tersedia atau tautannya berubah.
        </p>
        <Link href="/programs" className="mt-1 font-manrope font-semibold text-brand-orange text-sm hover:underline">
          Lihat semua program
        </Link>
      </div>
    );
  }

  const batch = program.batches && program.batches.length > 0 ? program.batches[0] : null;

  const toAbsoluteUrl = (url: string | null | undefined) => {
    if (!url) return undefined;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return `${siteUrl}${url}`;
    return `${siteUrl}/${url}`;
  };

  const bannerUrl = toAbsoluteUrl(program.bannerUrl);

  const faqEntities =
    (program.faqs ?? []).length > 0
      ? {
          "@type": "FAQPage",
          "@id": `${pageUrl}#faq`,
          mainEntity: (program.faqs ?? []).map((f: { question: string; answer: string }) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        }
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: program.name,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` },
        inLanguage: "id-ID",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumbs`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Programs",
            item: `${siteUrl}/programs`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: program.name,
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "Course",
        "@id": `${pageUrl}#course`,
        name: program.name,
        description: program.description ?? undefined,
        url: pageUrl,
        image: bannerUrl ? [bannerUrl] : undefined,
        inLanguage: "id-ID",
        provider: { "@id": `${siteUrl}/#organization` },
      },
      ...(faqEntities ? [faqEntities] : []),
    ],
  };

  const timelineItems = batch
    ? [
        {
          title: "Registration",
          description: `${format(new Date(batch.registrationEndDate), "dd MMM yyyy")}`,
        },
        batch.verificationStartDate && {
          title: "Verification",
          description: `${format(new Date(batch.verificationStartDate), "dd MMM yyyy")}`,
        },
        batch.assessmentStartDate && {
          title: "Assessment",
          description: `${format(new Date(batch.assessmentStartDate), "dd MMM yyyy")}`,
        },
        batch.announcementDate && {
          title: "Announcement",
          description: `${format(new Date(batch.announcementDate), "dd MMM yyyy")}`,
        },
        batch.onboardingDate && {
          title: "Onboarding",
          description: `${format(new Date(batch.onboardingDate), "dd MMM yyyy")}`,
        },
        {
          title: "Graduation",
          description: `${format(new Date(batch.endDate), "dd MMM yyyy")}`,
        },
      ].filter((item): item is { title: string; description: string } => Boolean(item))
    : undefined;

  return (
    <div className="bg-white">
      <script
        id={`jsonld-program-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HeaderDetailsProgram
        title={program.name}
        batch={
          program.batches && program.batches.length > 0
            ? program.batches.map((b: { name: string }) => b.name).join(", ")
            : "Batch 1"
        }
        startDate={
          program.batches && program.batches.length > 0
            ? format(new Date(program.batches[0].startDate), "dd MMMM yyyy")
            : "Coming Soon"
        }
      />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex flex-col gap-12 lg:flex-row lg:gap-10 xl:gap-16">
          {/* Main Content */}
          <main className="flex min-w-0 flex-1 flex-col gap-14">
            <ProgramNavigation />
            <ProgramAbout
              title={program.name}
              description={program.description ?? undefined}
              image={program.bannerUrl}
            />

            <ProgramTimeline items={timelineItems} />
            <ProgramWhatYouWillGet items={program.benefits} description={"Lebih dari Sekadar Sesi Mentoring"} />
            <ProgramSyllabus items={program.syllabus} description={"Apa yang Akan Dipelajari?"} />
            {/* <ProgramFAQ items={program.faqs} /> */}
            <FAQSection type="back" />
          </main>

          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-80 xl:w-100">
            {/* Kartu nempel ke cover (overlap) + sticky di bawah navbar saat scroll */}
            <div className="lg:sticky lg:top-20 lg:-mt-12">
              {batch ? (
                <RegistrationCTA
                  programId={program.id}
                  batch={{
                    id: batch.id,
                    name: batch.name,
                    status: batch.status,
                    startDate: batch.startDate,
                    endDate: batch.endDate,
                    registrationStartDate: batch.registrationStartDate,
                    registrationEndDate: batch.registrationEndDate,
                    quota: batch.quota,
                  }}
                  allBatches={program.batches?.map(
                    (b: {
                      id: string;
                      name: string;
                      status: string;
                      registrationStartDate: Date | string;
                      registrationEndDate: Date | string;
                      quota: number;
                      startDate: Date | string;
                      endDate: Date | string;
                    }) => ({
                      id: b.id,
                      name: b.name,
                      status: b.status,
                      registrationStartDate: b.registrationStartDate,
                      registrationEndDate: b.registrationEndDate,
                      quota: b.quota,
                      startDate: b.startDate,
                      endDate: b.endDate,
                    }),
                  )}
                />
              ) : (
                <div className="rounded-2xl border border-gray-200 border-dashed px-6 py-10 text-center">
                  <p className="font-manrope text-sm text-text-muted-custom">Belum ada batch yang aktif.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
