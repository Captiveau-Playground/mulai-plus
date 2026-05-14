"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
      input: { limit: 10 }, // Fetch more programs to collect batches
    }),
  );

  const programs = programsData?.data || [];

  if (isLoading) {
    return (
      <div className="bg-white">
        <section
          className="relative w-full overflow-hidden rounded-t-[50px] bg-[#1A1F6D] py-20 lg:rounded-t-[108px] lg:py-24"
          id="featured-programs"
        >
          {/* Background Grid Pattern */}
          <div
            className="absolute inset-0 z-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-transparent via-[#1A1F6D]/20 to-[#1A1F6D]" />

          <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-0">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:gap-16">
              {/* Left Column Skeleton */}
              <div className="relative hidden h-full w-full shrink-0 flex-col items-center justify-center lg:flex lg:w-[35%] lg:items-start">
                <div className="relative aspect-3/4 w-full max-w-100 overflow-hidden rounded-2xl lg:max-w-none">
                  <div className="absolute top-10 right-10 -z-10 h-full w-full rounded-full bg-[#FE9114]/10 blur-[80px]" />
                  <div className="h-full w-full animate-pulse bg-white/5" />
                </div>
              </div>

              {/* Right Column Skeleton */}
              <div className="flex w-full flex-col gap-10 lg:w-[65%]">
                {/* Header Skeleton */}
                <div className="flex flex-col gap-4 text-center lg:text-right">
                  <div className="mx-auto h-5 w-48 animate-pulse rounded-full bg-white/10 lg:mr-0 lg:ml-auto" />
                  <div className="mx-auto h-10 w-80 animate-pulse rounded-xl bg-white/10 lg:mr-0 lg:ml-auto lg:h-14 lg:w-96" />
                </div>

                {/* Cards Grid Skeleton */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-6">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex flex-col justify-between rounded-3xl bg-[#272C75] p-8 opacity-60">
                      <div className="flex flex-col gap-6">
                        {/* Upper Section */}
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col items-start gap-4">
                            {/* Icon Circle */}
                            <div className="h-12 w-12 animate-pulse rounded-full bg-white/10 sm:h-14 sm:w-14" />
                            <div className="flex w-full flex-col gap-2">
                              {/* Title + Badge */}
                              <div className="flex w-full flex-col gap-2">
                                <div className="h-6 w-3/4 animate-pulse rounded-lg bg-white/10 sm:h-8" />
                                <div className="h-5 w-28 animate-pulse rounded-full bg-white/5" />
                              </div>
                              {/* Description */}
                              <div className="mt-1 flex flex-col gap-1.5">
                                <div className="h-3 w-full animate-pulse rounded bg-white/5" />
                                <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Benefits Skeleton */}
                        <div className="flex flex-col gap-3 pt-2">
                          {[0, 1, 2, 3].map((b) => (
                            <div key={b} className="flex items-center gap-3">
                              <div className="h-6 w-6 animate-pulse rounded-full bg-white/10" />
                              <div className="h-3 w-40 animate-pulse rounded bg-white/5" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Button Skeleton */}
                      <div className="mt-6 h-14 w-full animate-pulse rounded-sm bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (programs.length === 0) {
    return null; // Don't show section if no programs
  }

  // Collect all batch+program combos, sort by closest startDate to today, take only 2
  const now = new Date();
  const sortedBatchCards = programs
    .flatMap((program) =>
      (program.batches || []).map((batch) => ({
        ...batch,
        program,
        // For sorting: absolute diff from now, prefer future dates
        sortScore: Math.abs(new Date(batch.startDate).getTime() - now.getTime()),
      })),
    )
    .sort((a, b) => a.sortScore - b.sortScore)
    .slice(0, 2);

  // Optional: compute total batch count per program for "X/Y" label
  const programBatchCounts = programs.reduce<Record<string, number>>((acc, p) => {
    acc[p.id] = (p.batches || []).length;
    return acc;
  }, {});
  const batchIndexMap = sortedBatchCards.reduce<Record<string, number>>((acc, card) => {
    const batches = card.program.batches || [];
    const idx = batches.findIndex((b) => b.id === card.id);
    acc[card.id] = idx >= 0 ? idx + 1 : 1;
    return acc;
  }, {});

  return (
    <div className="bg-white">
      <section
        className="relative w-full overflow-hidden rounded-t-[50px] bg-[#1A1F6D] py-20 lg:rounded-t-[108px] lg:py-24"
        id="featured-programs"
      >
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
              <div className="relative aspect-3/4 w-full max-w-100 lg:max-w-none">
                {/* Decorative Gradient Behind Image */}
                <div className="absolute top-10 right-10 -z-10 h-full w-full rounded-full bg-[#FE9114]/20 blur-[80px]" />

                {/* Using hero-image.png as placeholder for '15544-depositphotos-bgremover 1' */}
                <Image
                  src="/featured.webp"
                  alt="Featured Program Mentor"
                  fill
                  className="object-cover object-bottom drop-shadow-2xl"
                  sizes="(max-width: 1024px) 0vw, 35vw"
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

              {/* Cards Grid — show only 2 cards sorted by closest date */}
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
                }}
                className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-6"
              >
                {sortedBatchCards.map((batch, index) => {
                  const { program } = batch;
                  // Alternate accent color between the 2 cards
                  const isFirstCard = index === 0;
                  const iconBgColor = isFirstCard ? "bg-[#F93447]" : "bg-[#FE9114]";

                  const buttonLabel = "Daftar Sekarang";

                  const batchNumber = batchIndexMap[batch.id] ?? 1;
                  const totalBatches = programBatchCounts[program.id] ?? 1;

                  return (
                    <motion.div
                      key={batch.id}
                      variants={{
                        hidden: { opacity: 0, y: 40 },
                        show: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
                        },
                      }}
                    >
                      <Link href={`/programs/${program.slug}`}>
                        <div
                          className={cn(
                            "flex flex-col justify-between rounded-3xl p-8 transition-transform duration-300 hover:scale-[1.02]",
                            "bg-[#272C75] opacity-90",
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
                                  <div className="flex flex-col flex-wrap items-start gap-2">
                                    <h3 className="font-bold font-bricolage text-lg text-white leading-tight sm:text-2xl">
                                      {program.name}
                                    </h3>
                                    {/* Batch number badge */}
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 font-manrope font-medium text-[#B9E1FE] text-xs">
                                      <Icons.Layers className="h-3 w-3" />
                                      {batch.name}{" "}
                                      {totalBatches > 1 && (
                                        <>
                                          ({batchNumber}/{totalBatches})
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  <p className="line-clamp-2 font-manrope text-[#B9E1FE]/80 text-xs leading-relaxed sm:text-sm">
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
                                        iconBgColor,
                                      )}
                                    >
                                      <Icon className="h-3 w-3" />
                                    </div>
                                    <span className="font-bricolage font-medium text-white text-xs sm:text-sm">
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
                                "w-full cursor-pointer rounded-sm py-6 font-bold font-inter text-sm transition-all",
                                "bg-white text-[#1A1F6D] shadow-md hover:bg-gray-100",
                              )}
                            >
                              {buttonLabel}
                            </Button>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
