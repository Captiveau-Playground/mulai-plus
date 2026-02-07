"use client";

import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

// Helper to resolve icon string to component
const getIcon = (name: string | null | undefined): LucideIcon => {
  if (!name) return Icons.CheckCircle2;
  // @ts-expect-error - Dynamic access to icons
  const Icon = Icons[name];
  return Icon || Icons.CheckCircle2;
};

export function FeaturedPrograms() {
  const { data: programsData, isLoading } = useQuery(
    orpc.programs.public.list.queryOptions({
      input: { limit: 2 }, // Limit to 2 cards as requested
    }),
  );

  console.log(programsData);

  const programs = programsData?.data || [];

  if (isLoading) {
    return <div className="bg-[#1A1F6D] py-20 text-center text-white">Loading programs...</div>;
  }

  if (programs.length === 0) {
    return null; // Don't show section if no programs
  }

  return (
    <section className="relative z-20 -mt-10 w-full overflow-hidden rounded-t-[60px] bg-[#1A1F6D] py-16 lg:-mt-16 lg:rounded-t-[108px] lg:pt-24 lg:pb-32">
      {/* Background Grid - Figma Node 1:2846 */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px),
                              linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Gradient Overlays */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-transparent via-[#1A1F6D]/20 to-[#1A1F6D]" />

      <div className="container relative z-10 mx-auto max-w-7xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Left Column: Image of Person */}
          <div className="relative flex w-full shrink-0 flex-col items-center justify-center lg:w-[40%] lg:items-start">
            <div className="relative aspect-3/4 w-full max-w-[400px] lg:max-w-none">
              {/* Decorative Gradient Behind Image */}
              <div className="absolute top-10 right-10 -z-10 h-full w-full rounded-full bg-[#FE9114]/20 blur-[80px]" />

              {/* Using hero-image.png as placeholder for '15544-depositphotos-bgremover 1' */}
              <Image
                src="/hero-image.png"
                alt="Featured Program Mentor"
                fill
                className="object-contain object-bottom drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Right Column: Content and Cards */}
          <div className="flex w-full flex-col gap-10 lg:w-[60%]">
            {/* Header Section */}
            <div className="flex flex-col gap-4 text-center lg:text-left">
              <span className="font-inter font-semibold text-[#FE9114] text-sm uppercase tracking-widest md:text-base">
                Featured Programs
              </span>
              <h2 className="font-bold font-bricolage text-3xl text-white leading-tight md:text-4xl lg:text-5xl">
                MULAI+ Mentoring Programs 2026
              </h2>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:gap-6">
              {programs.map((program, _index) => {
                const latestBatch = program.batches?.[0];
                const isScholarship = program.name.toLowerCase().includes("scholarship");

                // Styles based on Figma - Dark Theme Cards
                const cardBg = "bg-[#272C75]"; // Inferred fill_4BNFOS (Lighter Navy)
                const iconBgColor = isScholarship ? "bg-[#FE9114]" : "bg-[#F93447]";
                const buttonBg = isScholarship
                  ? "bg-white hover:bg-gray-100"
                  : "bg-[#272C75] border border-white/20 hover:bg-[#2f3587]";
                const buttonText = isScholarship ? "text-[#1A1F6D]" : "text-white";
                const buttonLabel = isScholarship ? "Gabung Beasiswa" : "Coming Soon";

                return (
                  <div
                    key={program.id}
                    className={cn(
                      "flex flex-col justify-between rounded-[24px] p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-8",
                      cardBg,
                    )}
                  >
                    <div className="flex flex-col gap-6">
                      {/* Upper Section */}
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg sm:h-14 sm:w-14",
                              iconBgColor,
                            )}
                          >
                            <Icons.GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold font-bricolage text-lg text-white leading-tight sm:text-xl">
                                {program.name}
                              </h3>
                            </div>
                            {latestBatch && (
                              <span className="w-fit rounded-full bg-white/10 px-2 py-0.5 font-inter font-semibold text-[10px] text-white/70 sm:text-xs">
                                {latestBatch.name}
                              </span>
                            )}
                            <p className="mt-1 line-clamp-2 font-inter text-gray-300 text-xs sm:text-sm">
                              {program.description || "No description available."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Detail / Benefits */}
                      <div className="flex flex-col gap-3 border-white/10 border-t pt-5">
                        {program.benefits?.map((benefit) => {
                          const Icon = getIcon(benefit.icon);
                          return (
                            <div key={benefit.id} className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                                  isScholarship ? "bg-[#FE9114]/20" : "bg-[#F93447]/20",
                                )}
                              >
                                <Icon className={cn("h-3 w-3", isScholarship ? "text-[#FE9114]" : "text-[#F93447]")} />
                              </div>
                              <span className="font-inter font-medium text-white/90 text-xs sm:text-sm">
                                {benefit.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Button */}
                    <div className="mt-6">
                      <Button
                        className={cn(
                          "w-full rounded-lg py-5 font-inter font-semibold text-sm transition-all",
                          buttonBg,
                          buttonText,
                        )}
                        disabled={!isScholarship}
                      >
                        {buttonLabel}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
