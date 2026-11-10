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
    <section id="timeline" className={cn("flex w-full scroll-mt-32 flex-col gap-8", className)}>
      <div className="flex flex-col gap-3">
        <p className="heading-eyebrow text-brand-orange-ink">{title}</p>
        {description && <h2 className="heading-section text-brand-navy">{description}</h2>}
      </div>

      {items.length > 0 ? (
        <ol className="flex w-full flex-wrap gap-x-6 gap-y-8">
          {items.map((item, index) => {
            const Icon = getIconForTitle(item.title);
            const parts = item.title.split("—").map((s) => s.trim());
            const label = parts[0] || item.title;
            const dateText = parts[1] || "";

            return (
              <li key={index} className="flex min-w-28 max-w-full snap-center flex-col gap-4">
                <span className="flex size-14 items-center justify-center rounded-full bg-brand-navy/8 text-brand-navy">
                  <Icon className="size-6" />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="heading-card text-brand-navy">{label}</h3>
                  <span className="font-manrope font-medium text-brand-navy/70 text-sm">
                    {dateText || item.description}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="font-manrope text-base text-text-muted-custom italic">Data belum tersedia</p>
      )}
    </section>
  );
}
