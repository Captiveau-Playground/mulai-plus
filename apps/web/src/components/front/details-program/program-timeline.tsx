"use client";

import { Calendar, FileQuestion, FileText, GraduationCap, Megaphone, Rocket, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  title: string;
  description: string;
}

interface ProgramTimelineProps {
  title?: string;
  description?: string;
  items?: TimelineItem[];
  className?: string;
}

const getIconForTitle = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes("registration")) return FileText;
  if (lower.includes("verification")) return ShieldCheck;
  if (lower.includes("assessment")) return FileQuestion;
  if (lower.includes("announcement")) return Megaphone;
  if (lower.includes("onboarding")) return Rocket;
  if (lower.includes("graduation")) return GraduationCap;
  return Calendar;
};

export function ProgramTimeline({ title = "TIMELINE", description, items = [], className }: ProgramTimelineProps) {
  return (
    <section id="timeline" className={cn("flex w-full flex-col gap-9 py-8 sm:px-4 md:px-0", className)}>
      <div className="flex flex-col gap-9">
        <div className="flex flex-col gap-2">
          <h2 className="font-inter font-semibold text-2xl text-[#FE9114] leading-[1.2] tracking-[0.15em]">{title}</h2>
          {description && (
            <h3 className="font-bold font-bricolage text-3xl text-[#1A1F6D] leading-none md:text-4xl lg:text-5xl">
              {description}
            </h3>
          )}
        </div>
        <div className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.length > 0 ? (
            items.map((item, index) => {
              const Icon = getIconForTitle(item.title);

              return (
                <div
                  key={index}
                  className="relative flex min-w-[280px] shrink-0 snap-center flex-col gap-6 rounded-2xl bg-[#FAFAFA] p-6 transition-all hover:bg-white hover:shadow-lg"
                >
                  {/* Step Number & Line */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FE9114] font-bold font-inter text-lg text-white">
                      {index + 1}
                    </div>
                    <div className="h-[2px] w-full bg-[#E0E0E9]" />
                  </div>

                  {/* Icon & Content */}
                  <div className="flex flex-col gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E0E0E9]">
                      <Icon className="h-6 w-6 text-[#1A1F6D]" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h4 className="font-inter font-semibold text-[#1A1F6D] text-lg leading-[1.2] md:text-xl">
                        {item.title}
                      </h4>
                      <p className="font-inter font-normal text-[#888888] text-base leading-[1.5]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="font-inter font-normal text-[#888888] text-base italic">Data belum tersedia</p>
          )}
        </div>
      </div>
    </section>
  );
}
