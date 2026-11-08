"use client";

// Halaman Sekolah & Batch — daftar sekolah partner (B2B) + rekap batch & siswa.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Building2, Loader2, Plus, School, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AssessmentPageHeader, EmptyBlock, SkeletonRows } from "@/components/admin/assessment-page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

const STATUS: Record<string, { label: string; cls: string }> = {
  prospek: { label: "Prospek", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  aktif: { label: "Aktif", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  selesai: { label: "Selesai", cls: "bg-gray-100 text-gray-600 border-gray-200" },
};
const STATUS_ORDER = ["prospek", "aktif", "selesai"];

export default function AdminSchoolsPage() {
  // (M5.1) kirim pengingat ke sekolah yang pesertanya tertinggal
  const [reminding, setReminding] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ ...orpc.tmbAdmin.schools.list.queryOptions({ input: {} }) });

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [form, setForm] = useState({ name: "", city: "", email: "", phone: "", status: "prospek" });

  const createSchool = useMutation({
    ...orpc.tmbAdmin.schools.create.mutationOptions(),
    onSuccess: () => {
      notify.success("Sekolah terdaftar");
      setOpen(false);
      setForm({ name: "", city: "", email: "", phone: "", status: "prospek" });
      queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.schools.list.key() });
    },
    onError: (e) => notify.error("Gagal mendaftarkan sekolah", { description: e.message }),
  });

  const deleteSchool = useMutation({
    ...orpc.tmbAdmin.schools.delete.mutationOptions(),
    onSuccess: () => {
      notify.success("Sekolah dihapus");
      queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.schools.list.key() });
    },
    onError: (e) => notify.error("Gagal menghapus sekolah", { description: e.message }),
  });

  const schools = data ?? [];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return schools.filter((s) => {
      const matchQ = !needle || s.name.toLowerCase().includes(needle) || (s.city ?? "").toLowerCase().includes(needle);
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [schools, q, statusFilter]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { all: schools.length };
    for (const s of schools) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    return byStatus;
  }, [schools]);

  const totalStudents = schools.reduce((a, s) => a + s.studentCount, 0);
  const totalBatches = schools.reduce((a, s) => a + s.batchCount, 0);

  return (
    <div className="space-y-5">
      <AssessmentPageHeader
        title="Sekolah & Batch"
        description="Kelola sekolah partner, buat batch test per kelas/jurusan, lalu pantau rekap siswanya."
        stats={
          <span className="rounded-full bg-gray-100 px-3 py-1 font-manrope font-semibold text-gray-600 text-xs">
            {schools.length} sekolah · {totalBatches} batch · {totalStudents} siswa
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              data-testid="run-reminders"
              disabled={reminding}
              onClick={async () => {
                setReminding(true);
                try {
                  const r: any = await (client as any).schoolAdmin.runReminders({});
                  if (!r?.ok) {
                    notify.error("Gagal mengirim pengingat");
                    return;
                  }
                  notify.success(
                    r.notified > 0
                      ? `${r.notified} pengingat terkirim untuk ${r.details?.length ?? 0} kelas`
                      : "Tidak ada kelas yang perlu diingatkan",
                  );
                } catch {
                  notify.error("Gagal mengirim pengingat");
                } finally {
                  setReminding(false);
                }
              }}
              className="rounded-xl font-bold font-bricolage"
            >
              {reminding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Kirim pengingat
            </Button>
            <Button
              onClick={() => setOpen(true)}
              className="rounded-xl bg-brand-navy font-bold font-bricolage hover:bg-brand-navy-light"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Daftarkan Sekolah
            </Button>
          </>
        }
      />

      {/* Pencarian & filter status */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama sekolah atau kota…"
            className="rounded-xl border-gray-200 pl-9"
            data-testid="school-search"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1" data-testid="school-status-filter">
          {(["all", ...STATUS_ORDER] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-manrope font-semibold text-xs transition-colors",
                statusFilter === key ? "bg-white text-brand-navy shadow-sm" : "text-gray-500 hover:text-gray-700",
              )}
            >
              {key === "all" ? "Semua" : (STATUS[key]?.label ?? key)}
              <span className="ml-1 text-gray-400">{counts[key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : schools.length === 0 ? (
        <EmptyBlock
          icon={School}
          title="Belum ada sekolah partner"
          description="Daftarkan sekolah yang bekerja sama dengan MULAI+, lalu buat batch test untuk siswanya."
          action={
            <Button onClick={() => setOpen(true)} className="rounded-xl bg-brand-navy">
              <Plus className="mr-1.5 h-4 w-4" /> Daftarkan sekolah
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyBlock
          icon={Search}
          title="Tidak ada sekolah yang cocok"
          description="Coba kata kunci atau filter lain."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="school-list">
          {filtered.map((s) => {
            const st = STATUS[s.status] ?? STATUS.prospek;
            return (
              <div
                key={s.id}
                className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-teal-500/40 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5">
                    <Building2 className="h-5 w-5 text-brand-navy" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/assessment/schools/${s.id}`}
                      className="block truncate font-bold font-bricolage text-gray-900 hover:underline"
                      title={s.name}
                    >
                      {s.name}
                    </Link>
                    <p className="truncate font-manrope text-gray-500 text-xs">
                      {[s.city, s.email || s.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-0.5 font-manrope font-semibold text-[10px]",
                      st.cls,
                    )}
                  >
                    {st.label}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1 font-manrope text-[11px] text-gray-600">
                    {s.batchCount} batch
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1 font-manrope text-[11px] text-gray-600">
                    <Users className="h-3 w-3" /> {s.studentCount} siswa
                  </span>
                  <button
                    type="button"
                    aria-label={`Hapus ${s.name}`}
                    onClick={() => {
                      if (window.confirm(`Hapus sekolah "${s.name}"? Seluruh batch & siswa terkait ikut terhapus.`)) {
                        deleteSchool.mutate({ id: s.id });
                      }
                    }}
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Link
                  href={`/admin/assessment/schools/${s.id}`}
                  className="mt-3 inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 py-2 font-manrope font-semibold text-brand-navy text-xs transition-colors hover:bg-gray-50"
                >
                  Kelola batch & siswa{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog daftar sekolah */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy">Daftarkan Sekolah</DialogTitle>
            <DialogDescription className="font-manrope text-xs">
              Sekolah partner untuk program B2B. Setelah terdaftar, buat batch test dari halaman detailnya.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama Sekolah *</Label>
              <Input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="misal: SMAN 1 Bandung"
                className="mt-1 rounded-xl border-gray-200"
                data-testid="school-name"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Kota</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Bandung"
                  className="mt-1 rounded-xl border-gray-200"
                />
              </div>
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-xl border border-gray-200 bg-white px-3 font-manrope text-sm outline-none focus:border-brand-orange/50"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS[s]?.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Email Kontak</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="admin@sekolah.sch.id"
                  className="mt-1 rounded-xl border-gray-200"
                />
              </div>
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Telepon</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="022-xxxx"
                  className="mt-1 rounded-xl border-gray-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button
                className="rounded-xl bg-brand-navy hover:bg-brand-navy-light"
                data-testid="school-submit"
                disabled={!form.name.trim() || createSchool.isPending}
                onClick={() =>
                  createSchool.mutate({
                    name: form.name.trim(),
                    city: form.city || undefined,
                    email: form.email || undefined,
                    phone: form.phone || undefined,
                    status: form.status as "prospek" | "aktif" | "selesai",
                  })
                }
              >
                Daftarkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
