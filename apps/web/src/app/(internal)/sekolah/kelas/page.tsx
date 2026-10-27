"use client";

// (M2.1) Daftar kelas/batch milik sekolah + progres peserta. READ-ONLY dulu
// (buat kelas & import peserta menyusul di M2.2).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { client, orpc } from "@/utils/orpc";

const EMPTY = "Belum ada kelas";

export default function SchoolCohortsPage() {
  const qc = useQueryClient();
  const q = useQuery(orpc.school.cohorts.queryOptions());
  // (M4.2) lintas angkatan: filter tahun + perbandingan
  const yearsQ = useQuery(orpc.school.cohortYears.queryOptions());
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", className: "", major: "", graduationYear: "" });

  const buatKelas = async () => {
    if (!form.name.trim()) {
      notify.warn("Nama kelas wajib diisi");
      return;
    }
    setBusy(true);
    try {
      const r: any = await (client as any).school.cohortCreate({
        name: form.name.trim(),
        className: form.className.trim(),
        major: form.major.trim(),
        ...(form.graduationYear ? { graduationYear: Number(form.graduationYear) } : {}),
      });
      if (!r?.ok) {
        notify.error(
          r?.error === "sekolah_belum_terhubung"
            ? "Sekolah belum terhubung ke data kelas — hubungi admin MULAI+"
            : "Gagal membuat kelas",
        );
        return;
      }
      notify.success(`Kelas dibuat — kode undangan ${r.inviteCode}`);
      setOpen(false);
      setForm({ name: "", className: "", major: "", graduationYear: "" });
      await qc.invalidateQueries({ queryKey: orpc.school.cohorts.key() });
    } finally {
      setBusy(false);
    }
  };
  const allItems: any[] = (q.data as any)?.items ?? [];
  const items = yearFilter === "all" ? allItems : allItems.filter((c: any) => c.graduationYear === yearFilter);
  const years: Array<{
    year: number | null;
    batches: number;
    total: number;
    completed: number;
    progress: number;
    topHolland: { code: string; count: number } | null;
    confidenceAvg: number | null;
  }> = (yearsQ.data as any)?.ok ? (yearsQ.data as any).items : [];
  const notActive = q.data && (q.data as any).ok === false;
  // (auth) guru BK (school_viewer) hanya melihat — jangan tampilkan aksi tulis
  const canManage = (q.data as any)?.canManage !== false;

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
        <div className="flex items-center gap-3">
          <Link
            href={"/sekolah" as any}
            className="font-manrope font-semibold text-mentor-teal text-xs hover:underline"
          >
            ← Dashboard
          </Link>
          <Button
            data-testid="cohort-create-open"
            onClick={() => setOpen(true)}
            disabled={notActive || !canManage}
            title={!canManage ? "Hanya admin sekolah yang bisa membuat kelas" : undefined}
            className="rounded-xl bg-brand-navy px-3 py-2 font-bold font-manrope text-white text-xs hover:brightness-110 disabled:opacity-50"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Buat kelas
          </Button>
        </div>
      </div>

      {/* (M4.2) Filter & perbandingan angkatan */}
      {years.length > 1 && (
        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm" data-testid="year-compare">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-manrope font-semibold text-[10px] text-gray-500 uppercase">Angkatan</span>
            <button
              type="button"
              data-testid="year-all"
              onClick={() => setYearFilter("all")}
              className={`min-h-10 rounded-full px-3.5 py-2 font-manrope font-semibold text-sm ${
                yearFilter === "all" ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Semua
            </button>
            {years.map((y) => (
              <button
                key={String(y.year)}
                type="button"
                data-testid={`year-${y.year ?? "tanpa"}`}
                onClick={() => setYearFilter(y.year ?? "all")}
                className={`min-h-10 rounded-full px-3.5 py-2 font-manrope font-semibold text-sm ${
                  yearFilter === y.year ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {y.year ?? "Tanpa angkatan"}
              </button>
            ))}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {years
              .filter((y) => y.year !== null)
              .map((y) => (
                <div key={String(y.year)} className="rounded-xl bg-gray-50 px-3 py-2" data-testid="year-card">
                  <p className="font-bold font-bricolage text-brand-navy text-sm">Angkatan {y.year}</p>
                  <p className="font-manrope text-[10px] text-gray-500">
                    {y.batches} kelas · {y.completed}/{y.total} selesai · Minat dominan {y.topHolland?.code ?? "—"}
                    {y.confidenceAvg ? ` · keyakinan ${y.confidenceAvg}%` : ""}
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${y.progress}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {q.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
        </div>
      ) : notActive ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-manrope text-amber-800 text-sm">
          Akun sekolah belum aktif — kelas akan muncul setelah pendaftaran disetujui.
        </div>
      ) : allItems.length === 0 ? (
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
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {c.inviteCode && (
                    <span className="font-manrope text-[10px] text-gray-400">
                      Kode kelas: <code className="rounded bg-gray-100 px-1">{c.inviteCode}</code>
                    </span>
                  )}
                  <span
                    data-testid="cohort-window-state"
                    className={`rounded-full px-1.5 py-0.5 font-manrope font-semibold text-[9px] ${
                      c.windowState === "berjalan"
                        ? "bg-teal-50 text-teal-700"
                        : c.windowState === "belum_mulai"
                          ? "bg-sky-50 text-sky-700"
                          : c.windowState === "selesai"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.windowState === "berjalan"
                      ? "Jadwal berjalan"
                      : c.windowState === "belum_mulai"
                        ? "Jadwal: belum mulai"
                        : c.windowState === "selesai"
                          ? "Jadwal selesai"
                          : "Tanpa jadwal"}
                  </span>
                </div>
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

      {/* Dialog buat kelas (M2.2) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" data-testid="cohort-create-dialog">
          <DialogHeader>
            <DialogTitle className="font-bricolage">Buat kelas baru</DialogTitle>
            <DialogDescription className="font-manrope text-sm">
              Kode undangan dibuat otomatis. Peserta bisa ditambahkan lewat import CSV setelah kelas dibuat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama kelas *</Label>
              <Input
                data-testid="cohort-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="cth: XII IPA 1"
                className="mt-1 rounded-xl border-gray-200 bg-gray-50"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Kelas</Label>
                <Input
                  data-testid="cohort-class"
                  value={form.className}
                  onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
                  placeholder="cth: XII"
                  className="mt-1 rounded-xl border-gray-200 bg-gray-50"
                />
              </div>
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Jurusan</Label>
                <Input
                  data-testid="cohort-major"
                  value={form.major}
                  onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
                  placeholder="cth: IPA / TKJ"
                  className="mt-1 rounded-xl border-gray-200 bg-gray-50"
                />
              </div>
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Tahun lulus</Label>
                <Input
                  data-testid="cohort-year"
                  value={form.graduationYear}
                  onChange={(e) => setForm((f) => ({ ...f, graduationYear: e.target.value.replace(/\D/g, "") }))}
                  placeholder="cth: 2027"
                  inputMode="numeric"
                  className="mt-1 rounded-xl border-gray-200 bg-gray-50"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button
              data-testid="cohort-create-submit"
              onClick={() => void buatKelas()}
              disabled={busy}
              className="bg-brand-navy font-bold font-manrope text-white text-xs hover:brightness-110"
            >
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Buat kelas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
