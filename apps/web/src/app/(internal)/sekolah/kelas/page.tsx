"use client";

// (M2.1) Daftar kelas/batch milik sekolah + progres peserta. READ-ONLY dulu
// (buat kelas & import peserta menyusul di M2.2).
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { orpc } from "@/utils/orpc";

const EMPTY = "Belum ada kelas";

export default function SchoolCohortsPage() {
  const q = useQuery(orpc.school.cohorts.queryOptions());
  const items: any[] = (q.data as any)?.items ?? [];
  const notActive = q.data && (q.data as any).ok === false;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6" data-testid="school-cohorts">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-manrope font-semibold text-[11px] text-teal-600 uppercase tracking-wide">
            Kelas & Peserta
          </p>
          <h1 className="font-bold font-bricolage text-2xl text-gray-900">Kelas di sekolahmu</h1>
          <p className="font-manrope text-gray-500 text-xs">
            Progres tiap kelas: siapa sudah selesai, sedang mengerjakan, dan belum mulai.
          </p>
        </div>
        <Link href="/sekolah" className="font-manrope font-semibold text-mentor-teal text-xs hover:underline">
          ← Dashboard
        </Link>
      </div>

      {q.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
        </div>
      ) : notActive ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-manrope text-amber-800 text-sm">
          Akun sekolah belum aktif — kelas akan muncul setelah pendaftaran disetujui.
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-gray-200 border-dashed bg-white p-8 text-center">
          <Users className="mx-auto h-6 w-6 text-gray-300" />
          <p className="mt-2 font-manrope font-semibold text-gray-700 text-sm">{EMPTY}</p>
          <p className="mt-1 font-manrope text-gray-500 text-xs">
            Tim MULAI+ menyiapkan kelas bersama PIC sekolah. Setelah kelas dibuat, daftar peserta & progresnya muncul di
            sini.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/sekolah/kelas/${c.id}` as any}
              data-testid="cohort-row"
              className="group flex flex-wrap items-center gap-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-teal-300 hover:shadow-md"
            >
              <div className="min-w-[180px] flex-1">
                <p className="font-bold font-bricolage text-base text-gray-900">{c.name}</p>
                <p className="font-manrope text-gray-500 text-xs">
                  {[c.className, c.major, c.graduationYear].filter(Boolean).join(" · ") || "—"}
                </p>
                {c.inviteCode && (
                  <p className="mt-1 font-manrope text-[10px] text-gray-400">
                    Kode undangan: <code className="rounded bg-gray-100 px-1">{c.inviteCode}</code>
                  </p>
                )}
              </div>

              <div className="min-w-[150px] flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-mentor-teal" style={{ width: `${c.progress}%` }} />
                </div>
                <p className="mt-1 font-manrope text-[10px] text-gray-500">
                  {c.selesai}/{c.total} selesai ({c.progress}%)
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 font-manrope text-[11px]">
                <span className="rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-700">✓ {c.selesai}</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">⏳ {c.mulai}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">· {c.belum}</span>
                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-teal-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
