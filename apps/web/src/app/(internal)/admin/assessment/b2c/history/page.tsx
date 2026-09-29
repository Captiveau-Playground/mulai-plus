"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 20;

const MODE_TABS = [
  { href: "/admin/assessment" as const, label: "B2B — Sekolah", icon: "🏫" },
  { href: "/admin/assessment/b2c" as const, label: "B2C — Statistik", icon: "📈" },
  { href: "/admin/assessment/b2c/history" as const, label: "B2C — History", icon: "🕘" },
];

export default function AdminB2cHistoryPage() {
  const pathname = usePathname();
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.b2c.history.queryOptions({ input: { limit: PAGE_SIZE, offset } }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = offset + items.length < total;

  return (
    <div className="space-y-5">
      {/* Mode tabs */}
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold font-bricolage text-2xl text-brand-navy">B2C — History Test</h1>
          <p className="mt-1 font-manrope text-gray-500 text-sm">
            Semua assessment yang diselesaikan — mandiri (B2C) maupun via sekolah (B2B batch).
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 font-bold font-manrope text-gray-600 text-xs">
          {total} total
        </span>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 border-dashed bg-white p-10 text-center">
          <p className="font-manrope text-gray-500 text-sm">Belum ada assessment yang selesai.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="border-gray-100 border-b bg-gray-50">
              <tr>
                {["Nama", "Sumber", "Kode", "Confidence", "Jurusan Teratas", "Tanggal"].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold font-manrope text-gray-500 text-xs uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((r: any) => (
                <tr key={r.id} className="transition-colors hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-manrope font-semibold text-gray-800 text-sm">
                      {r.isGuest && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-[9px] text-amber-700">
                          GUEST
                        </span>
                      )}
                      {r.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.source?.kind === "batch" ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 font-bold font-manrope text-[10px] text-amber-700">
                        🏫 {r.source.schoolName ?? "Batch"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-mentor-teal/10 px-2.5 py-1 font-bold font-manrope text-[10px] text-teal-700">
                        🧭 Mandiri
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-brand-navy/5 px-2.5 py-1 font-bold font-bricolage text-brand-navy text-sm">
                      {r.hollandCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold font-manrope text-mentor-teal text-xs">{r.confidenceScore}%</td>
                  <td className="max-w-[200px] truncate px-4 py-3 font-manrope text-gray-600 text-xs">
                    {r.topMajor ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-manrope text-gray-400 text-xs">
                    {r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy, HH:mm", { locale: id }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 pb-4">
          <button
            type="button"
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            disabled={offset === 0}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold font-manrope text-gray-600 text-xs shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40"
          >
            ← Sebelumnya
          </button>
          <span className="font-manrope text-gray-400 text-xs">
            {offset + 1}–{Math.min(offset + items.length, total)} dari {total}
          </span>
          <button
            type="button"
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            disabled={!hasMore}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold font-manrope text-gray-600 text-xs shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40"
          >
            Berikutnya →
          </button>
        </div>
      )}
    </div>
  );
}
