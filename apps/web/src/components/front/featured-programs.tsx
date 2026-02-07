"use client";

import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
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
    <section className="relative w-full overflow-hidden bg-[#1A1F6D] py-16 lg:py-24">
      {/* Background pattern placeholder - represented by opacity/texture if needed, 
          but for now just solid color as per Figma 'fills: fill_OBLXJE' (#1A1F6D) */}

      <div className="container mx-auto px-6 md:px-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-8">
          {/* Left Column: Image of Person */}
          <div className="relative flex w-full shrink-0 flex-col items-center justify-center lg:w-[35%] lg:items-start">
            {/* Placeholder for the person image. 
                Using hero-image.png temporarily as a placeholder. 
                In production, this should be the specific cutout image from Figma. */}
            <div className="relative aspect-3/4 w-full max-w-[400px] lg:max-w-none">
              {/* 
                  NOTE: The user requested "GAMBAR ORANG DI SEBELAH KIRI".
                  Since we don't have the exact '15544-depositphotos-bgremover 1' asset,
                  we use a placeholder. 
               */}
              <div className="absolute inset-0 rounded-[40px] bg-white/5" />
              {/* Use a placeholder image or div if actual asset is missing */}
              <Image
                src="/hero-image.png"
                alt="Featured Program Mentor"
                fill
                className="object-contain object-bottom"
              />
            </div>
          </div>

          {/* Right Column: Content and Cards */}
          <div className="flex w-full flex-col gap-8 lg:w-[65%]">
            {/* Header Section */}
            <div className="flex flex-col gap-4 text-center lg:text-left">
              <span className="font-inter font-semibold text-[#FE9114] text-sm tracking-widest md:text-base">
                FEATURED PROGRAMS
              </span>
              <h2 className="font-bold font-bricolage text-3xl text-white leading-tight md:text-4xl lg:text-5xl">
                MULAI+ Mentoring Programs 2026
              </h2>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
              {programs.map((program, _index) => {
                const latestBatch = program.batches?.[0];
                const isScholarship = program.name.toLowerCase().includes("scholarship");

                // Alternating styles based on index or type
                const iconBgColor = isScholarship ? "bg-[#FE9114]" : "bg-[#F93447]";
                const _buttonVariant = isScholarship ? "default" : "secondary";
                const buttonText = isScholarship ? "Gabung Beasiswa" : "Coming Soon";

                return (
                  <div
                    key={program.id}
                    className="flex flex-col justify-between rounded-[24px] bg-[#F5F7FA] p-6 sm:p-8"
                  >
                    <div className="flex flex-col gap-6">
                      {/* Header */}
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white sm:h-14 sm:w-14",
                            iconBgColor,
                          )}
                        >
                          <Icons.GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold font-bricolage text-[#1A1F6D] text-lg sm:text-xl">
                              {program.name}
                            </h3>
                            {latestBatch && (
                              <Badge
                                variant="secondary"
                                className="bg-[#E0E0E9] font-inter font-semibold text-[#1A1F6D] text-[10px] hover:bg-[#E0E0E9] sm:text-xs"
                              >
                                {latestBatch.name}
                              </Badge>
                            )}
                          </div>
                          <p className="line-clamp-2 font-inter text-[#666666] text-xs sm:text-sm">
                            {program.description || "No description available."}
                          </p>
                        </div>
                      </div>

                      {/* Benefits */}
                      <div className="flex flex-col gap-3 border-gray-200 border-t pt-5">
                        {program.benefits?.map((benefit) => {
                          const Icon = getIcon(benefit.icon);
                          return (
                            <div key={benefit.id} className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-opacity-10",
                                  isScholarship ? "bg-[#FE9114]/10" : "bg-[#F93447]/10",
                                )}
                              >
                                <Icon className={cn("h-3 w-3", isScholarship ? "text-[#FE9114]" : "text-[#F93447]")} />
                              </div>
                              <span className="font-inter font-medium text-[#333333] text-xs sm:text-sm">
                                {benefit.title}
                              </span>
                            </div>
                          );
                        })}
                        {(!program.benefits || program.benefits.length === 0) && (
                          <div className="text-gray-400 text-xs italic">No benefits listed.</div>
                        )}
                      </div>
                    </div>

                    {/* Footer / Button */}
                    <div className="mt-6">
                      <Button
                        className={cn(
                          "w-full rounded-lg py-5 font-inter font-semibold text-sm",
                          isScholarship
                            ? "bg-[#1A1F6D] text-white hover:bg-[#1A1F6D]/90"
                            : "bg-[#E0E0E9] text-[#1A1F6D] hover:bg-[#d0d0db]",
                        )}
                        disabled={!isScholarship}
                      >
                        {buttonText}
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
