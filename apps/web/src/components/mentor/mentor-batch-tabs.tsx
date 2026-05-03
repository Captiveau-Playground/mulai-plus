"use client";

import { FileText, GraduationCap, LayoutList, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "attendance", label: "Attendance", icon: Users },
  { value: "participants", label: "Participants", icon: GraduationCap },
  { value: "curriculum", label: "Curriculum", icon: LayoutList },
  { value: "attachments", label: "Resources", icon: FileText },
];

export function MentorBatchTabs({ batchId }: { batchId: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/");
  const currentTab = segments[segments.length - 1];

  return (
    <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.value;
        return (
          <Link
            key={tab.value}
            href={`/mentor/batches/${batchId}/${tab.value}` as any}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-manrope font-medium text-sm transition-all",
              isActive
                ? "bg-brand-navy text-white shadow-sm"
                : "text-text-muted-custom hover:bg-gray-100 hover:text-text-main",
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
