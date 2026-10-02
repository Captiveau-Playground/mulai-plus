"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const HOLLAND_COLOR: Record<string, string> = {
  R: "bg-blue-500",
  I: "bg-violet-500",
  A: "bg-pink-500",
  S: "bg-teal-500",
  E: "bg-amber-500",
  C: "bg-indigo-500",
};

const MODE_TABS = [
  { href: "/admin/assessment" as const, label: "B2B — Sekolah", icon: "🏫" },
  { href: "/admin/assessment/b2c" as const, label: "B2C — Statistik", icon: "📈" },
  { href: "/admin/assessment/b2c/history" as const, label: "B2C — History", icon: "🕘" },
];

function ModeTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm">
      {MODE_TABS.map((t) => {
        const active = t.href === "/admin/assessment" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 font-manrope font-semibold text-sm transition-colors",
              active ? "bg-brand-navy text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
            )}
          >
            <span>{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function AdminB2cStatsPage() {
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.b2c.stats.queryOptions({ input: {} }),
  });

  const maxHolland = Math.max(...(data?.hollandDistribution.map((h: any) => h.count) ?? [1]));

  return (
    <div className="space-y-5">
      <ModeTabs />

      <div>
        <h1 className="font-bold font-bricolage text-2xl text-brand-navy">B2C — Statistik Test</h1>
        <p className="mt-1 font-manrope text-gray-500 text-sm">
          Ringkasan seluruh pengguna individu yang mengikuti Test Minat Bakat.
        </p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Kartu ringkasan */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Pengguna", value: data?.totalUsers ?? 0, icon: "👤", cls: "text-brand-navy" },
              { label: "Assessment Selesai", value: data?.totalAssessments ?? 0, icon: "✅", cls: "text-green-600" },
              { label: "Attempt Test", value: data?.totalAttempts ?? 0, icon: "📝", cls: "text-violet-600" },
              {
                label: "Rata-rata Confidence",
                value: `${data?.avgConfidence ?? 0}%`,
                icon: "🎯",
                cls: "text-mentor-teal",
              },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <p className="text-xl">{s.icon}</p>
                <p className={cn("mt-1 font-bold font-bricolage text-2xl", s.cls)}>{s.value}</p>
                <p className="font-manrope text-gray-400 text-xs">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Distribusi Holland */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="font-bold font-bricolage text-gray-900">Distribusi Minat (Holland)</h3>
              <div className="mt-4 space-y-3">
                {(data?.hollandDistribution ?? []).map((h: any) => (
                  <div key={h.code}>
                    <div className="flex items-center justify-between">
                      <span className="font-manrope font-semibold text-gray-700 text-sm">Tipe {h.code}</span>
                      <span className="font-manrope text-gray-400 text-xs">{h.count} pengguna</span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        className={cn("h-full rounded-full", HOLLAND_COLOR[h.code] ?? "bg-gray-400")}
                        initial={{ width: 0 }}
                        animate={{ width: `${(h.count / maxHolland) * 100}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </div>
                ))}
                {data?.hollandDistribution?.length === 0 && (
                  <p className="font-manrope text-gray-400 text-sm">Belum ada data.</p>
                )}
              </div>
            </div>

            {/* Top rekomendasi */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="font-bold font-bricolage text-gray-900">Jurusan Terpopuler</h3>
              <div className="mt-4 space-y-2.5">
                {(data?.topMajors ?? []).map((m: any, i: number) => (
                  <div key={m.name} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-navy font-bold font-bricolage text-white text-xs">
                      {i + 1}
                    </span>
                    <span className="flex-1 font-manrope font-semibold text-gray-800 text-sm">{m.name}</span>
                    <span className="rounded-full bg-mentor-teal/10 px-2.5 py-0.5 font-bold font-manrope text-teal-700 text-xs">
                      {m.count}x
                    </span>
                  </div>
                ))}
                {data?.topMajors?.length === 0 && <p className="font-manrope text-gray-400 text-sm">Belum ada data.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
