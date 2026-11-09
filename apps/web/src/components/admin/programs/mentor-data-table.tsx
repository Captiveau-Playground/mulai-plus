"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Loader2, Search, User, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

function fmtDate(v: string | Date | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/** "12 mentee" → "10+ mentee" (pembulatan sesuai keputusan produk). */
function menteeLabel(n: number) {
  if (!n) return "—";
  if (n < 10) return `${n} mentee`;
  return `${Math.floor(n / 10) * 10}+ mentee`;
}

/**
 * Tabel data mentor ala spreadsheet (dipakai admin & PM).
 * Kolom lengkap + pencarian di atas + baris bisa diklik menuju halaman detail/edit.
 */
export function MentorDataTable({ basePath = "/admin/programs/mentors" }: { basePath?: string }) {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    ...orpc.programs.admin.mentors.list.queryOptions({ input: { search: q || undefined, limit: 300 } }),
    staleTime: 1000 * 60,
  });

  const mentors: any[] = (data as any)?.data ?? [];
  const stats = useMemo(() => {
    const total = mentors.length;
    const publik = mentors.filter((m) => m.detail?.isPublic).length;
    const nonaktif = mentors.filter((m) => m.banned).length;
    const lengkap = mentors.filter((m) => m.detail?.kampus && m.detail?.jurusan).length;
    return { total, publik, nonaktif, lengkap };
  }, [mentors]);

  return (
    <div className="space-y-5">
      {/* Ringkasan */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total mentor", value: stats.total, tone: "text-brand-navy" },
          { label: "Tampil di landing", value: stats.publik, tone: "text-emerald-600" },
          { label: "Nonaktif", value: stats.nonaktif, tone: "text-red-500" },
          { label: "Data lengkap", value: stats.lengkap, tone: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200/80 bg-white px-4 py-3">
            <p className="font-manrope text-[11px] text-text-muted-custom uppercase tracking-wider">{s.label}</p>
            <p className={`mt-1 font-bold font-bricolage text-2xl ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, kampus, jurusan, atau pekerjaan…"
            className="pl-9"
            data-testid="mentor-search"
          />
        </div>
        <p className="font-manrope text-text-muted-custom text-xs">
          {isLoading ? "Memuat…" : `${mentors.length} mentor ditampilkan`}
        </p>
      </div>

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
              <tr className="font-manrope text-[11px] text-text-muted-custom uppercase tracking-wider">
                <th className="sticky left-0 z-20 bg-gray-50/95 px-3 py-2.5">Mentor</th>
                <th className="px-3 py-2.5">Kampus</th>
                <th className="px-3 py-2.5">Jurusan</th>
                <th className="px-3 py-2.5">Tahun masuk</th>
                <th className="px-3 py-2.5">Bidang pekerjaan</th>
                <th className="px-3 py-2.5">Bergabung</th>
                <th className="px-3 py-2.5">Mentee</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Landing</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="h-40 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-mentor-teal" />
                  </td>
                </tr>
              ) : mentors.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-7 w-7 text-gray-300" />
                      <p className="font-manrope text-sm text-text-muted-custom">Tidak ada mentor yang cocok.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                mentors.map((m) => {
                  const d = m.detail ?? {};
                  const lengkap = !!(d.kampus && d.jurusan);
                  return (
                    <tr key={m.id} className="group transition-colors hover:bg-gray-50/70">
                      <td className="sticky left-0 z-10 bg-white px-3 py-2.5 group-hover:bg-gray-50/90">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mentor-teal/10">
                            {m.image ? (
                              <Image
                                src={m.image}
                                alt={m.name ?? ""}
                                width={36}
                                height={36}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <User className="h-4 w-4 text-mentor-teal" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-manrope font-semibold text-sm text-text-main">
                              {d.displayName || m.name || "—"}
                            </p>
                            <p className="truncate font-manrope text-[11px] text-text-muted-custom">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-manrope text-sm text-text-main">{d.kampus || "—"}</td>
                      <td className="px-3 py-2.5 font-manrope text-sm text-text-main">{d.jurusan || "—"}</td>
                      <td className="px-3 py-2.5 font-manrope text-sm text-text-main">{d.tahunMasuk ?? "—"}</td>
                      <td className="px-3 py-2.5 font-manrope text-sm text-text-main">{d.bidangPekerjaan || "—"}</td>
                      <td className="px-3 py-2.5 font-manrope text-sm text-text-main">{fmtDate(m.joinedAt)}</td>
                      <td className="px-3 py-2.5 font-manrope text-sm text-text-main">
                        {menteeLabel(m.menteeCount ?? 0)}
                      </td>
                      <td className="px-3 py-2.5">
                        {m.banned ? (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <XCircle className="h-3 w-3 text-red-500" /> Nonaktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Aktif
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {d.isPublic ? (
                          <Badge className="bg-emerald-50 text-[10px] text-emerald-700">Tampil</Badge>
                        ) : (
                          <span className="font-manrope text-[11px] text-gray-400">
                            {lengkap ? "Belum disetujui" : "Belum diisi"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`${basePath}/${m.id}` as any}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 font-manrope font-semibold text-[11px] text-brand-navy transition-colors hover:bg-gray-50"
                        >
                          Detail <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="font-manrope text-[11px] text-gray-400">
        Geser horizontal untuk melihat semua kolom. Klik <b>Detail</b> untuk mengisi/mengubah data mentor.
      </p>
    </div>
  );
}
