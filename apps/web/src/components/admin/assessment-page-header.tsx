"use client";

// Header seragam untuk halaman Assessment — breadcrumb + judul + deskripsi + aksi.
// Menggantikan pola "ModeTabs" yang dulu diduplikasi per halaman dengan label & emoji berbeda.
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AssessmentPageHeader({
  title,
  description,
  actions,
  stats,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** ringkasan angka kecil di kanan (mis. "128 hasil · 42 pengguna") */
  stats?: ReactNode;
}) {
  return (
    <header className="space-y-3">
      <nav className="flex items-center gap-1 font-manrope text-[11px] text-muted-foreground">
        <Link href="/admin/assessment" className="font-semibold hover:text-brand-navy">
          Assessment
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-semibold text-gray-700">{title}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold font-bricolage text-2xl text-brand-navy">{title}</h1>
          {description && <p className="mt-1 max-w-2xl font-manrope text-gray-500 text-sm">{description}</p>}
        </div>
        {(actions || stats) && (
          <div className="flex flex-wrap items-center gap-2">
            {stats}
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

/** Kartu statistik ringkas dengan ikon + keterangan kecil. */
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "navy",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "navy" | "teal" | "violet" | "amber";
}) {
  const tones = {
    navy: "bg-brand-navy/5 text-brand-navy",
    teal: "bg-teal-500/10 text-teal-600",
    violet: "bg-violet-500/10 text-violet-600",
    amber: "bg-amber-500/10 text-amber-600",
  } as const;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="font-manrope font-semibold text-gray-500 text-xs">{label}</p>
      </div>
      <p className="mt-2.5 font-bold font-bricolage text-3xl text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="font-manrope text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Blok kosong yang seragam. */
export function EmptyBlock({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-gray-200 border-dashed bg-white px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 font-bold font-bricolage text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm font-manrope text-gray-500 text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Skeleton loading seragam (bukan spinner di tengah halaman). */
export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}
