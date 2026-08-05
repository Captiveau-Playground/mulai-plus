"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ASSESSMENT_NAV = [
  { href: "/dashboard/student/assessment" as const, label: "Test", icon: "🧭", exact: true },
  { href: "/dashboard/student/assessment/result" as const, label: "Hasil", icon: "📊" },
  { href: "/dashboard/student/assessment/history" as const, label: "History", icon: "🕘" },
];

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header + sub-menu */}
      <div className="flex flex-col gap-2">
        <p className="font-manrope font-semibold text-[11px] text-mentor-teal uppercase tracking-wide">Assessment</p>
        <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">Test Minat Bakat</h1>
        <p className="font-manrope text-base text-text-muted-custom">
          Kenali minat (Holland) & bakatmu — dapatkan rekomendasi jurusan dan karier.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm">
        {ASSESSMENT_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 font-manrope font-semibold text-sm transition-colors",
                active ? "bg-brand-navy text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
