"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Pencil, Plus, ScanSearch, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const ABILITY_DIMS = [
  { key: "numerical", label: "Numerik" },
  { key: "verbal", label: "Verbal" },
  { key: "logical", label: "Logika" },
  { key: "spatial", label: "Spasial" },
  { key: "clerical", label: "Ketelitian" },
];

type PatternRow = {
  id: string;
  categoryKey: string;
  categoryName: string;
  pattern: string;
  hollandPrimary: string;
  hollandSecondary: string;
  abilityWeights: Record<string, number>;
  isActive: boolean;
  prodiCount: number;
};

const EMPTY = {
  categoryKey: "",
  categoryName: "",
  pattern: "",
  hollandPrimary: "",
  hollandSecondary: "",
  weights: { numerical: 0, verbal: 0, logical: 0, spatial: 0, clerical: 0 } as Record<string, number>,
};

export default function AdminPatternsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ ...orpc.tmbAdmin.patterns.list.queryOptions({ input: {} }) });
  const patterns: PatternRow[] = ((data?.items ?? []) as any[]).map((p) => ({
    ...p,
    abilityWeights: (p.abilityWeights ?? {}) as Record<string, number>,
  }));

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PatternRow | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<PatternRow | null>(null);
  const [preview, setPreview] = useState<{ count: number; examples: { name: string; university: string }[] } | null>(
    null,
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.patterns.list.key() });

  const createP = useMutation({
    ...orpc.tmbAdmin.patterns.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Pola jurusan ditambahkan!");
      setShowForm(false);
      setForm(EMPTY);
      invalidate();
    },
    onError: (e) => toast.error(e.message || "Gagal menambah pola"),
  });
  const updateP = useMutation({
    ...orpc.tmbAdmin.patterns.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Pola diperbarui!");
      setShowForm(false);
      setEditing(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message || "Gagal memperbarui pola"),
  });
  const deleteP = useMutation({
    ...orpc.tmbAdmin.patterns.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Pola dihapus");
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message || "Gagal menghapus pola"),
  });
  const previewP = useMutation({
    ...orpc.tmbAdmin.patterns.preview.mutationOptions(),
    onSuccess: (d) => setPreview(d as { count: number; examples: { name: string; university: string }[] }),
    onError: (e) => toast.error(e.message || "Regex tidak valid"),
  });

  const openEdit = (p: PatternRow) => {
    setEditing(p);
    setForm({
      categoryKey: p.categoryKey,
      categoryName: p.categoryName,
      pattern: p.pattern,
      hollandPrimary: p.hollandPrimary,
      hollandSecondary: p.hollandSecondary,
      weights: { ...(p.abilityWeights ?? {}) },
    });
    setShowForm(true);
  };

  const submit = () => {
    if (!form.categoryKey.trim() || !form.categoryName.trim() || !form.pattern.trim()) {
      toast.error("Lengkapi kategori, nama, dan pola regex");
      return;
    }
    const payload = {
      categoryKey: form.categoryKey.trim(),
      categoryName: form.categoryName.trim(),
      pattern: form.pattern.trim(),
      hollandPrimary: form.hollandPrimary.toUpperCase(),
      hollandSecondary: form.hollandSecondary.toUpperCase(),
      abilityWeights: form.weights,
    };
    if (editing) updateP.mutate({ id: editing.id, ...payload });
    else createP.mutate(payload);
  };

  const setWeight = (key: string, v: string) => {
    const n = Math.max(0, Math.min(1, Number(v) || 0));
    setForm({ ...form, weights: { ...form.weights, [key]: n } });
  };

  return (
    <div className="space-y-5">
      <Link
        href="/admin/assessment"
        className="inline-flex items-center gap-1 font-bold font-manrope text-mentor-teal text-sm transition-colors hover:text-teal-700"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard Assessment
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bold font-bricolage text-2xl text-brand-navy">Pola Jurusan</h1>
          <p className="mt-1 font-manrope text-gray-500 text-sm">
            Mesin rekomendasi: kategori jurusan → kode Holland + bobot kemampuan + regex pencocok prodi.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm(EMPTY);
            setShowForm(true);
          }}
          className="rounded-xl bg-brand-navy font-bold font-bricolage text-white shadow-sm hover:bg-brand-navy-light"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Tambah Pola
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-gray-100 border-b font-manrope text-[11px] text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Holland</th>
                <th className="px-4 py-3">Bobot Kemampuan</th>
                <th className="px-4 py-3">Regex</th>
                <th className="px-4 py-3 text-right">Prodi Cocok</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {patterns.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(0.02 * i, 0.3) }}
                  className="border-gray-50 border-b last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-bold font-manrope text-gray-800">{p.categoryName}</p>
                    <p className="font-manrope text-[11px] text-gray-400">{p.categoryKey}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {[p.hollandPrimary, p.hollandSecondary].map((h) => (
                        <span
                          key={h}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-navy font-bold font-bricolage text-[11px] text-white"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {ABILITY_DIMS.map((d) =>
                        (p.abilityWeights?.[d.key] ?? 0) > 0 ? (
                          <span
                            key={d.key}
                            className="rounded-full bg-teal-50 px-2 py-0.5 font-manrope font-semibold text-[10px] text-teal-700"
                          >
                            {d.label} {p.abilityWeights?.[d.key]}
                          </span>
                        ) : null,
                      )}
                    </div>
                  </td>
                  <td className="max-w-[180px] px-4 py-3">
                    <code className="truncate rounded-md bg-gray-50 px-2 py-1 font-mono text-[10px] text-gray-600">
                      {p.pattern}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 font-bold font-manrope text-[11px]",
                        p.prodiCount < 0
                          ? "bg-red-50 text-red-600"
                          : p.prodiCount === 0
                            ? "bg-amber-50 text-amber-600"
                            : "bg-green-50 text-green-700",
                      )}
                    >
                      {p.prodiCount < 0 ? "regex error" : `${p.prodiCount.toLocaleString("id-ID")} prodi`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(p)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                        onClick={() => setConfirmDelete(p)}
                        aria-label="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy">
              {editing ? "Edit Pola Jurusan" : "Tambah Pola Jurusan"}
            </DialogTitle>
            <DialogDescription className="font-manrope text-xs">
              Regex dicocokkan ke nama program studi (18.000+ data) untuk mengelompokkan prodi ke kategori ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Category Key *</Label>
                <Input
                  value={form.categoryKey}
                  onChange={(e) => setForm({ ...form, categoryKey: e.target.value })}
                  placeholder="teknik-informatika"
                  className="mt-1 rounded-xl border-gray-200 bg-gray-50"
                />
              </div>
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama Kategori *</Label>
                <Input
                  value={form.categoryName}
                  onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                  placeholder="Teknik Informatika"
                  className="mt-1 rounded-xl border-gray-200 bg-gray-50"
                />
              </div>
            </div>

            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Regex Pencocok Prodi *</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={form.pattern}
                  onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                  placeholder="informatika|ilmu komputer|software"
                  className="flex-1 rounded-xl border-gray-200 bg-gray-50 font-mono text-xs"
                />
                <Button
                  variant="outline"
                  onClick={() => previewP.mutate({ pattern: form.pattern })}
                  disabled={!form.pattern.trim() || previewP.isPending}
                  className="rounded-xl"
                >
                  <ScanSearch className="mr-1.5 h-4 w-4" /> Cek
                </Button>
              </div>
              {preview && (
                <p className="mt-1.5 font-manrope text-gray-500 text-xs">
                  <b className="text-teal-700">{preview.count.toLocaleString("id-ID")} prodi</b> cocok — contoh:{" "}
                  {preview.examples
                    .slice(0, 2)
                    .map((e) => `${e.name} (${e.university})`)
                    .join(" · ") || "tidak ada"}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Holland Primer *</Label>
                <Input
                  value={form.hollandPrimary}
                  onChange={(e) => setForm({ ...form, hollandPrimary: e.target.value.toUpperCase() })}
                  placeholder="I"
                  maxLength={1}
                  className="mt-1 rounded-xl border-gray-200 bg-gray-50"
                />
              </div>
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Holland Sekunder *</Label>
                <Input
                  value={form.hollandSecondary}
                  onChange={(e) => setForm({ ...form, hollandSecondary: e.target.value.toUpperCase() })}
                  placeholder="R"
                  maxLength={1}
                  className="mt-1 rounded-xl border-gray-200 bg-gray-50"
                />
              </div>
            </div>

            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Bobot Kemampuan (0–1)</Label>
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {ABILITY_DIMS.map((d) => (
                  <div key={d.key}>
                    <Label className="font-manrope text-[10px] text-gray-400">{d.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={form.weights[d.key] ?? 0}
                      onChange={(e) => setWeight(d.key, e.target.value)}
                      className="mt-0.5 rounded-lg border-gray-200 bg-gray-50 text-center text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={submit}
              disabled={createP.isPending || updateP.isPending}
              className="w-full rounded-xl bg-mentor-teal py-3 font-bold font-bricolage text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {createP.isPending || updateP.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Pola"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy">
              Hapus pola "{confirmDelete?.categoryName}"?
            </DialogTitle>
            <DialogDescription className="font-manrope text-sm">
              Kategori ini tidak akan direkomendasikan lagi ke siswa baru. Hasil lama tetap tersimpan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Batal
            </Button>
            <Button
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={deleteP.isPending}
              onClick={() => confirmDelete && deleteP.mutate({ id: confirmDelete.id })}
            >
              {deleteP.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
