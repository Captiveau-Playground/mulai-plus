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

export function ProgramTimeline({
  title = "TIMELINE",
  description = "Step by Step Menuju Graduation",
  items = [],
  className,
}: ProgramTimelineProps) {
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
        <div className="flex w-full gap-2 pb-6">
          {items.length > 0 ? (
            items.map((item, index) => {
              const Icon = getIconForTitle(item.title);
              const parts = item.title.split("—").map((s) => s.trim());
              const label = parts[0] || item.title;
              const dateText = parts[1] || "";

              return (
                <div key={index} className="flex w-full snap-center flex-col justify-between gap-6">
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#ECF3FF]">
                    <Icon className="h-7 w-7 text-[#1A1F6D]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="font-inter font-semibold text-[#333333] text-base leading-[1.2] tracking-[-0.05em]">
                      {label}
                    </h4>
                    {dateText ? (
                      <span className="font-inter font-medium text-[#708FFF] text-base leading-[1.2] tracking-[-0.05em]">
                        {dateText}
                      </span>
                    ) : (
                      <span className="font-inter font-medium text-[#708FFF] text-base leading-[1.2] tracking-[-0.05em]">
                        {item.description}
                      </span>
                    )}
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
