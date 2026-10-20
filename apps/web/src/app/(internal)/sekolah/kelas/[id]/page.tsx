"use client";

// (M2.1) Detail kelas: daftar peserta + status pengerjaan + Holland code ringkas.
// READ-ONLY dulu (import/undang & jadwal menyusul di M2.2/M2.3).
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: "Selesai", cls: "bg-teal-50 text-teal-700" },
  in_progress: { label: "Mengerjakan", cls: "bg-amber-50 text-amber-700" },
  invited: { label: "Belum mulai", cls: "bg-gray-100 text-gray-600" },
};

const fmt = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function SchoolCohortDetailPage() {
  const params = useParams<{ id: string }>();
  const batchId = String(params?.id ?? "");
  const [q, setQ] = useState("");

  const data = useQuery({
    ...orpc.school.participants.queryOptions({ input: { batchId } }),
    enabled: !!batchId,
  });

  const items: any[] = (data.data as any)?.items ?? [];
  const batch = (data.data as any)?.batch;
  const totals = (data.data as any)?.totals;
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((p) =>
      [p.name, p.email, p.nis].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(needle)),
    );
  }, [items, q]);

  if (data.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
      </div>
    );
  }

  if (!data.data || (data.data as any).ok === false) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center" data-testid="cohort-not-found">
        <p className="font-manrope font-semibold text-gray-700 text-sm">Kelas tidak ditemukan</p>
        <p className="mt-1 font-manrope text-gray-500 text-xs">
          Kelas ini bukan milik sekolahmu, atau akun sekolah belum aktif.
        </p>
        <Link href={"/sekolah/kelas" as any} className="mt-4 inline-block font-manrope font-semibold text-mentor-teal text-xs">
          ← Kembali ke daftar kelas
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6" data-testid="cohort-detail">
      <Link
        href={"/sekolah/kelas" as any}
        className="inline-flex items-center gap-1 font-manrope font-semibold text-mentor-teal text-xs hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Semua kelas
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-bold font-bricolage text-2xl text-gray-900">{batch?.name}</h1>
          <p className="font-manrope text-gray-500 text-xs">
            {[batch?.className, batch?.major].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex gap-2 font-manrope text-[11px]">
          <span className="rounded-full bg-teal-50 px-2 py-1 font-semibold text-teal-700">
            {totals?.selesai ?? 0} selesai
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">
            {totals?.mulai ?? 0} mengerjakan
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-600">
            {totals?.belum ?? 0} belum mulai
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          data-testid="participant-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama / email / NIS…"
          className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
        <span className="shrink-0 font-manrope text-[11px] text-gray-400">
          {filtered.length}/{items.length}
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 font-manrope text-[10px] text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Email / NIS</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Holland</th>
              <th className="px-3 py-2">Selesai</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center font-manrope text-gray-400 text-xs">
                  {items.length === 0
                    ? "Belum ada peserta di kelas ini."
                    : "Tidak ada peserta yang cocok dengan pencarian."}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const st = STATUS[p.status] ?? { label: p.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={p.id} data-testid="participant-row" className="border-gray-50 border-t">
                    <td className="px-3 py-2 font-manrope font-semibold text-gray-800 text-xs">{p.name}</td>
                    <td className="px-3 py-2 font-manrope text-[11px] text-gray-500">
                      {[p.email, p.nis].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 font-manrope font-semibold text-[10px] ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-manrope font-semibold text-gray-700 text-xs">
                      {p.hollandCode ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-manrope text-[11px] text-gray-500">{fmt(p.selesaiPada)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 font-manrope text-[10px] text-gray-400">
        Hasil lengkap per peserta (skor per dimensi + rekomendasi jurusan) menyusul di tahap berikutnya.
      </p>
    </div>
  );
}
