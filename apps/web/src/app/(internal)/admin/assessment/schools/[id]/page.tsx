"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, Pencil, Plus, School, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  prospek: { label: "Prospek", cls: "bg-amber-50 text-amber-600" },
  aktif: { label: "Aktif", cls: "bg-green-50 text-green-600" },
  selesai: { label: "Selesai", cls: "bg-gray-100 text-gray-500" },
};

export default function SchoolDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.schools.get.queryOptions({ input: { id } }),
    enabled: !!id,
  });

  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [className, setClassName] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");

  const [editBatch, setEditBatch] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", className: "", major: "" });

  const updateBatch = useMutation({
    ...orpc.tmbAdmin.batches.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Batch diperbarui!");
      setEditBatch(null);
      queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.schools.get.key() });
    },
    onError: (e) => toast.error(e.message || "Gagal memperbarui batch"),
  });

  const deleteBatch = useMutation({
    ...orpc.tmbAdmin.batches.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Batch dihapus");
      queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.schools.get.key() });
    },
    onError: (e) => toast.error(e.message || "Gagal menghapus batch"),
  });

  const createBatch = useMutation({
    ...orpc.tmbAdmin.batches.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Batch dibuat!");
      setShowBatchForm(false);
      setBatchName("");
      setClassName("");
      setMajor("");
      setYear("");
      queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.schools.get.key() });
    },
    onError: (e) => toast.error(e.message || "Gagal membuat batch"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
      </div>
    );
  }

  if (!data?.school) {
    return (
      <div className="py-20 text-center">
        <p className="font-manrope text-gray-500">Sekolah tidak ditemukan.</p>
        <Link
          href="/admin/assessment/schools"
          className="mt-3 inline-block font-bold font-manrope text-mentor-teal text-sm"
        >
          ← Kembali
        </Link>
      </div>
    );
  }

  const { school, batches, stats } = data;
  const st = STATUS_META[school.status] ?? STATUS_META.prospek;
  const progress = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/assessment/schools"
          className="flex items-center gap-1 font-manrope font-semibold text-gray-400 text-xs hover:text-gray-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Sekolah Kerjasama
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-navy/5">
            <School className="h-6 w-6 text-brand-navy" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold font-bricolage text-2xl text-brand-navy">{school.name}</h1>
              <span className={cn("rounded-full px-2.5 py-0.5 font-bold font-manrope text-[10px]", st.cls)}>
                {st.label}
              </span>
            </div>
            <p className="font-manrope text-gray-500 text-sm">
              {[school.city, school.email, school.phone].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Recap lintas batch */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Siswa", value: stats.total, cls: "text-brand-navy" },
          { label: "Selesai Test", value: stats.completed, cls: "text-green-600" },
          { label: "Progres", value: `${progress}%`, cls: "text-mentor-teal" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
            <p className={cn("font-bold font-bricolage text-2xl", s.cls)}>{s.value}</p>
            <p className="mt-0.5 font-manrope text-gray-400 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Buat batch */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold font-bricolage text-gray-900">Batch Test</h3>
            <p className="mt-0.5 font-manrope text-gray-500 text-xs">
              Buat batch khusus untuk sekolah ini (per kelas/jurusan/tahun).
            </p>
          </div>
          <Button
            onClick={() => setShowBatchForm((v) => !v)}
            className="rounded-xl bg-brand-navy px-4 py-2 font-bold font-manrope text-white text-xs hover:bg-brand-navy-light"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Batch
          </Button>
        </div>

        {showBatchForm && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama Batch *</Label>
              <Input
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder={`misal: ${school.name} — Angkatan 2026`}
                className="mt-1 rounded-xl border-gray-200 bg-gray-50"
              />
            </div>
            <Input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Kelas (XII-IPA-1)"
              className="rounded-xl border-gray-200 bg-gray-50"
            />
            <Input
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="Jurusan (IPA / IPS / SMK)"
              className="rounded-xl border-gray-200 bg-gray-50"
            />
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Tahun lulus (2026)"
              className="rounded-xl border-gray-200 bg-gray-50"
            />
            <Button
              onClick={() =>
                createBatch.mutate({
                  schoolId: school.id,
                  name: batchName,
                  className: className || undefined,
                  major: major || undefined,
                  graduationYear: year ? Number(year) : undefined,
                })
              }
              disabled={!batchName.trim() || createBatch.isPending}
              className="rounded-xl bg-mentor-teal font-bold font-manrope text-white text-xs hover:bg-teal-700 disabled:opacity-50"
            >
              {createBatch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buat Batch"}
            </Button>
          </div>
        )}
      </div>

      {/* Daftar batch */}
      {batches.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 border-dashed bg-white p-8 text-center">
          <p className="font-manrope text-gray-500 text-sm">Belum ada batch untuk sekolah ini.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {batches.map((b: any) => (
            <Link
              key={b.id}
              href={`/admin/assessment/batches/${b.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-mentor-teal/40 hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold font-bricolage text-gray-900">{b.name}</p>
                <p className="font-manrope text-gray-500 text-xs">
                  {[b.className, b.major, b.graduationYear ? `Lulus ${b.graduationYear}` : null]
                    .filter(Boolean)
                    .join(" · ") || "Batch"}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditForm({ name: b.name ?? "", className: b.className ?? "", major: b.major ?? "" });
                  setEditBatch(b);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Edit batch"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (window.confirm(`Hapus batch "${b.name}"? Semua siswa & undangan ikut terhapus.`)) {
                    deleteBatch.mutate({ id: b.id });
                  }
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label="Hapus batch"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ArrowRight className="h-5 w-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-mentor-teal" />
            </Link>
          ))}
        </div>
      )}

      {/* Edit batch modal */}
      <Dialog open={!!editBatch} onOpenChange={(v) => !v && setEditBatch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy">Edit Batch</DialogTitle>
            <DialogDescription className="font-manrope text-xs">
              Ubah nama, kelas, atau jurusan batch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama Batch *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="mt-1 rounded-xl border-gray-200 bg-gray-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Kelas</Label>
                <Input
                  value={editForm.className}
                  onChange={(e) => setEditForm({ ...editForm, className: e.target.value })}
                  placeholder="12 IPA 1"
                  className="mt-1 rounded-xl border-gray-200 bg-gray-50"
                />
              </div>
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Jurusan</Label>
                <Input
                  value={editForm.major}
                  onChange={(e) => setEditForm({ ...editForm, major: e.target.value })}
                  placeholder="IPA / IPS"
                  className="mt-1 rounded-xl border-gray-200 bg-gray-50"
                />
              </div>
            </div>
            <Button
              onClick={() =>
                editBatch &&
                updateBatch.mutate({
                  id: editBatch.id,
                  name: editForm.name,
                  className: editForm.className || undefined,
                  major: editForm.major || undefined,
                })
              }
              disabled={!editForm.name.trim() || updateBatch.isPending}
              className="w-full rounded-xl bg-mentor-teal py-3 font-bold font-bricolage text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {updateBatch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
