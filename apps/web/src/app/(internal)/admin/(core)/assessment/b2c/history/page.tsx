"use client";

// Halaman Riwayat B2C — daftar semua hasil test (mandiri & via sekolah) + filter sumber.
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight, GraduationCap, History, Inbox, User, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AssessmentPageHeader, EmptyBlock, SkeletonRows } from "@/components/admin/assessment-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { holland, hollandNames } from "@/lib/holland";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 20;
type SourceFilter = "all" | "self" | "batch";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AdminB2cHistoryPage() {
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<SourceFilter>("all");

  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.b2c.history.queryOptions({ input: { limit: PAGE_SIZE, offset } }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const shown = items.filter(
    (it) => filter === "all" || (filter === "self" ? it.source.kind === "self" : it.source.kind === "batch"),
  );
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + items.length, total);

  const FILTERS: [SourceFilter, string][] = [
    ["all", "Semua"],
    ["self", "Mandiri"],
    ["batch", "Sekolah"],
  ];

  return (
    <div className="space-y-5">
      <AssessmentPageHeader
        title="Riwayat B2C"
        description="Semua assessment yang sudah selesai — baik dikerjakan mandiri maupun lewat batch sekolah."
        stats={
          <span
            className="rounded-full bg-gray-100 px-3 py-1 font-manrope font-semibold text-gray-600 text-xs"
            data-testid="history-total"
          >
            {total} hasil
          </span>
        }
        actions={
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1" data-testid="history-filter">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-manrope font-semibold text-xs transition-colors",
                  filter === key ? "bg-white text-brand-navy shadow-sm" : "text-gray-500 hover:text-gray-700",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : items.length === 0 ? (
        <EmptyBlock
          icon={Inbox}
          title="Belum ada hasil test"
          description="Riwayat akan muncul setelah ada pengguna yang menyelesaikan Test Minat Bakat."
          action={
            <Link
              href="/admin/assessment/b2c"
              className={buttonVariants({ variant: "outline", className: "rounded-xl" })}
            >
              <History className="mr-1.5 h-4 w-4" /> Lihat statistik
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left" data-testid="history-table">
              <thead className="border-gray-100 border-b bg-gray-50">
                <tr>
                  {["Pengguna", "Sumber", "Kode minat", "Confidence", "Jurusan teratas", "Tanggal"].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 font-manrope font-semibold text-[11px] text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shown.map((r) => {
                  const _meta = holland(r.hollandCode);
                  const conf = Number(r.confidenceScore ?? 0);
                  return (
                    <tr key={r.id} className="align-middle transition-colors hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold font-bricolage text-xs",
                              r.isGuest ? "bg-gray-100 text-gray-500" : "bg-brand-navy/5 text-brand-navy",
                            )}
                          >
                            {initials(r.name) || "?"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-manrope font-semibold text-gray-800 text-sm" title={r.name}>
                              {r.name}
                            </p>
                            {r.isGuest && (
                              <span className="inline-flex items-center gap-1 font-manrope text-[10px] text-gray-400">
                                <UserRound className="h-2.5 w-2.5" /> tamu batch
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.source.kind === "batch" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 font-manrope font-semibold text-[11px] text-teal-700">
                            <GraduationCap className="h-3 w-3" />
                            {r.source.schoolName ?? "Sekolah"}
                            {r.source.batchName ? ` · ${r.source.batchName}` : ""}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-manrope font-semibold text-[11px] text-gray-600">
                            <User className="h-3 w-3" /> Mandiri
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.hollandCode ? (
                          <span className="flex items-center gap-1" title={hollandNames(r.hollandCode)}>
                            {r.hollandCode.split("").map((c, i) => {
                              const m = holland(c);
                              return (
                                <span
                                  key={`${c}-${i}`}
                                  className={cn(
                                    "flex h-6 w-6 items-center justify-center rounded-md border font-bold font-bricolage text-[11px]",
                                    m.soft,
                                    m.text,
                                  )}
                                >
                                  {c}
                                </span>
                              );
                            })}
                          </span>
                        ) : (
                          <span className="font-manrope text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2" title={`${conf}%`}>
                          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                            <span
                              className={cn(
                                "block h-full rounded-full",
                                conf >= 70 ? "bg-teal-500" : conf >= 45 ? "bg-amber-400" : "bg-gray-300",
                              )}
                              style={{ width: `${Math.max(0, Math.min(100, conf))}%` }}
                            />
                          </span>
                          <span className="font-manrope text-gray-500 text-xs tabular-nums">{conf}%</span>
                        </div>
                      </td>
                      <td
                        className="max-w-[220px] truncate px-4 py-3 font-manrope text-gray-700 text-sm"
                        title={r.topMajor ?? ""}
                      >
                        {r.topMajor ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-manrope text-gray-500 text-xs">
                        {format(new Date(r.createdAt), "d MMM yyyy", { locale: localeId })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-gray-100 border-t bg-gray-50/60 px-4 py-3">
            <p className="font-manrope text-muted-foreground text-xs">
              {shown.length !== items.length
                ? `${shown.length} dari ${items.length} baris (difilter)`
                : `${from}–${to} dari ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={to >= total}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Berikutnya <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
