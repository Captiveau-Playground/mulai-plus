"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ASSESSMENT_NAV = [
  { href: "/dashboard/student/assessment" as const, label: "Test", icon: "🧭", exact: true },
  { href: "/dashboard/student/assessment/result" as const, label: "Hasil", icon: "📊" },
  { href: "/dashboard/student/assessment/future-career" as const, label: "Karir Impian", icon: "💭" },
  { href: "/dashboard/student/assessment/history" as const, label: "History", icon: "🕘" },
];

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pb-24 md:p-6 md:pb-8 lg:p-8">
      {/* Header + sub-menu */}
      <div className="flex flex-col gap-2">
        <p className="font-manrope font-semibold text-[11px] text-mentor-teal uppercase tracking-wide">Assessment</p>
        <h1 className="font-bold font-bricolage text-3xl text-brand-navy md:text-4xl">Test Minat Bakat</h1>
        <p className="font-manrope text-base text-text-muted-custom">
          Kenali minat (Holland) & bakatmu — dapatkan rekomendasi jurusan dan karier.
        </p>
      </div>

      {/* Tabs — DESKTOP; mobile memakai bottom app bar ala Duolingo */}
      <div className="hidden gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm md:flex">
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

      {/* BOTTOM APP BAR ala Duolingo — khusus modul Assessment (mobile) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
          {ASSESSMENT_NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors",
                  active ? "bg-brand-navy text-white shadow-sm" : "text-gray-500 hover:bg-gray-50",
                )}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="font-manrope text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
