"use client";

import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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

  const programs = programsData?.data || [];

  if (isLoading) {
    return <div className="bg-[#1A1F6D] py-20 text-center text-white">Loading programs...</div>;
  }

  if (programs.length === 0) {
    return null; // Don't show section if no programs
  }

  return (
    <div className="bg-white">
      <section className="relative w-full overflow-hidden rounded-t-[50px] bg-[#1A1F6D] py-20 lg:rounded-t-[108px] lg:py-24">
        {/* Background Grid Pattern (Simulated) */}
        <div
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Gradient Overlays */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-transparent via-[#1A1F6D]/20 to-[#1A1F6D]" />

        <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:gap-16">
            {/* Left Column: Image of Person */}
            <div className="relative hidden h-full w-full shrink-0 flex-col items-center justify-center lg:flex lg:w-[35%] lg:items-start">
              <div className="relative aspect-3/4 w-full max-w-[400px] lg:max-w-none">
                {/* Decorative Gradient Behind Image */}
                <div className="absolute top-10 right-10 -z-10 h-full w-full rounded-full bg-[#FE9114]/20 blur-[80px]" />

                {/* Using hero-image.png as placeholder for '15544-depositphotos-bgremover 1' */}
                <Image
                  src="/featured.png"
                  alt="Featured Program Mentor"
                  fill
                  className="object-cover object-bottom drop-shadow-2xl"
                />
              </div>
            </div>

            {/* Right Column: Content and Cards */}
            <div className="flex w-full flex-col gap-10 lg:w-[65%]">
              {/* Header Section */}
              <div className="flex flex-col gap-4 text-center lg:text-right">
                <span className="font-bold font-inter text-[#FE9114] text-xl uppercase tracking-widest lg:text-2xl">
                  Featured Programs
                </span>
                <h2 className="font-bold font-bricolage text-4xl text-white leading-tight lg:text-6xl">
                  MULAI+ Mentoring Programs 2026
                </h2>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-6">
                {programs
                  .flatMap((program) =>
                    (program.batches || []).map((batch) => ({
                      ...batch,
                      program,
                    })),
                  )
                  .toReversed()
                  .map((batch, index) => {
                    const { program } = batch;
                    // Use index to enforce Figma design pattern: Left Card (Scholarship/Red), Right Card (Regular/Orange)
                    const isFirstCard = index === 0;
                    const isScholarship = isFirstCard || program.name.toLowerCase().includes("scholarship");

                    // Styles based on Figma - Dark Theme Cards
                    const cardBg = "bg-[#272C75]"; // Inferred fill_4BNFOS (Lighter Navy)
                    const iconBgColor = isScholarship
                      ? "bg-[#F93447]" // Accent1 (Red)
                      : "bg-[#FE9114]"; // Accent2 (Orange)

                    const buttonLabel = isScholarship ? "Gabung Beasiswa" : "Coming Soon";

                    const isComingSoon = !isScholarship;

                    return (
                      <Link
                        href={isComingSoon ? "#" : `/programs/${program.slug}`}
                        key={batch.id}
                        className={cn(isComingSoon && "pointer-events-none cursor-default")}
                        aria-disabled={isComingSoon}
                      >
                        <div
                          key={batch.id}
                          className={cn(
                            "flex flex-col justify-between rounded-[24px] p-8 opacity-90 transition-transform duration-300",
                            cardBg,
                          )}
                        >
                          <div className="flex flex-col gap-6">
                            {/* Upper Section */}
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col items-start gap-4">
                                <div
                                  className={cn(
                                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg sm:h-14 sm:w-14",
                                    iconBgColor,
                                  )}
                                >
                                  <Icons.GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex flex-col flex-wrap items-start gap-3">
                                    <h3 className="font-bold font-bricolage text-lg text-white leading-tight sm:text-2xl">
                                      {program.name}
                                    </h3>
                                    <span className="font-bold font-inter text-[#B9E1FE] text-xs tracking-widest">
                                      {batch.name.toUpperCase() === "BATCH 11" ? "FREE" : "PAID"}
                                    </span>
                                  </div>
                                  <p className="line-clamp-2 font-inter text-[#B9E1FE]/80 text-xs leading-relaxed sm:text-sm">
                                    {program.description || "No description available."}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Detail / Benefits */}
                            <div className="flex flex-col gap-3 pt-2">
                              {program.benefits?.slice(0, 4).map((benefit) => {
                                const Icon = getIcon(benefit.icon);
                                return (
                                  <div key={benefit.id} className="flex items-center gap-3">
                                    <div
                                      className={cn(
                                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white",
                                        isScholarship ? "bg-[#F93447]" : "bg-[#FE9114]",
                                      )}
                                    >
                                      <Icon className="h-3 w-3" />
                                    </div>
                                    <span className="font-inter font-medium text-white text-xs sm:text-sm">
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
                                "w-full rounded-sm py-6 font-bold font-inter text-sm transition-all",
                                isScholarship
                                  ? "bg-white text-[#1A1F6D] shadow-md hover:bg-gray-100"
                                  : "cursor-default bg-white/10 text-white hover:bg-white/5",
                              )}
                              disabled={!isScholarship}
                            >
                              {buttonLabel}
                            </Button>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
