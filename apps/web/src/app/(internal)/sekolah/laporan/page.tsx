"use client";

// (menu) Daftar laporan kelas — pintu masuk ke laporan/insight per kelas.
// Sebelumnya menu "Laporan Kelas" menunjuk URL yang sama dengan "Kelas & Peserta"
// sehingga keduanya aktif bersamaan. Halaman ini memberi URL & tujuan yang jelas.
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileBarChart, Loader2 } from "lucide-react";
import Link from "next/link";
import { orpc } from "@/utils/orpc";

export default function SchoolReportsPage() {
  const q = useQuery(orpc.school.cohorts.queryOptions());
  const items: any[] = (q.data as any)?.ok ? ((q.data as any).items ?? []) : [];

  if (q.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6" data-testid="school-reports">
      <p className="font-manrope font-semibold text-[11px] text-mentor-teal uppercase tracking-wide">Laporan</p>
      <h1 className="mt-1 font-bricolage font-extrabold text-2xl text-brand-navy">Laporan kelas</h1>
      <p className="mt-1 font-manrope text-gray-600 text-sm">
        Pilih kelas untuk melihat sebaran minat, kemampuan, jurusan teratas, dan daftar siswa yang perlu perhatian.
        Laporan bisa diunduh sebagai PDF atau diarsipkan.
      </p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-gray-200 border-dashed bg-white p-8 text-center">
          <FileBarChart className="mx-auto h-6 w-6 text-gray-300" />
          <p className="mt-2 font-manrope font-semibold text-gray-700 text-sm">Belum ada kelas</p>
          <p className="mt-1 font-manrope text-gray-500 text-sm">
            Buat kelas dulu di menu <b>Kelas &amp; Peserta</b>, lalu laporannya muncul di sini.
          </p>
          <Link
            href="/sekolah/kelas"
            className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-xl bg-brand-navy px-4 py-2 font-bold font-manrope text-sm text-white"
          >
            Ke Kelas &amp; Peserta <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((c) => {
            const pct = c.progress ?? 0;
            return (
              <div
                key={c.id}
                data-testid="report-row"
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="min-w-[200px] flex-1">
                  <p className="font-bold font-bricolage text-base text-gray-900">{c.name}</p>
                  <p className="font-manrope text-gray-600 text-sm">
                    {[c.className, c.major, c.graduationYear].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="min-w-[160px] flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 font-manrope text-gray-600 text-sm">
                    {c.selesai}/{c.total} selesai ({pct}%)
                  </p>
                </div>
                <Link
                  href={`/sekolah/kelas/${c.id}/laporan`}
                  data-testid="report-open"
                  className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-brand-navy px-4 py-2 font-bold font-manrope text-sm text-white hover:brightness-110"
                >
                  Lihat laporan <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
