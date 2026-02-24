"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
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

  const { data: program, isLoading } = useQuery(
    orpc.programs.public.get.queryOptions({
      input: { slug },
    }),
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="container py-10 text-center">
        <h1 className="font-bold text-2xl">Program Not Found</h1>
        <p className="text-muted-foreground">The program you are looking for does not exist.</p>
      </div>
    );
  }

  const batch = program.batches && program.batches.length > 0 ? program.batches[0] : null;

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
      <HeaderDetailsProgram
        title={program.name + " Program " + (batch ? new Date(batch.startDate).getFullYear() : "")}
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
      <div className="mx-auto w-full max-w-7xl sm:px-4 md:px-8 lg:px-0">
        <div className="relative flex flex-col gap-12 lg:flex-row">
          {/* Main Content */}
          <main className="top-[20vh] flex min-w-0 flex-1 flex-col gap-16 px-4">
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
          <aside className="w-full shrink-0 px-4 pt-8 lg:w-[420px]">
            <div className="sticky top-[10vh]">
              {program.batches && program.batches.length > 0 ? (
                <RegistrationCTA
                  batchName={program.batches[0].name}
                  status={
                    program.batches[0].status === "open"
                      ? "OPEN"
                      : program.batches[0].status === "upcoming"
                        ? "COMING SOON"
                        : "CLOSED"
                  }
                  startDate={format(new Date(program.batches[0].startDate), "dd MMM yyyy")}
                  endDate={format(new Date(program.batches[0].endDate), "dd MMM yyyy")}
                  registrationDate={format(new Date(program.batches[0].registrationStartDate), "dd MMM yyyy")}
                  quota={program.batches[0].quota}
                />
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-muted-foreground">No active batches available.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
