"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc } from "@/utils/orpc";

type CareerRow = { id: string; majorCategory: string; careerName: string };

export default function AdminCareersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ ...orpc.tmbAdmin.careers.list.queryOptions({ input: {} }) });
  const careers: CareerRow[] = data?.items ?? [];

  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CareerRow | null>(null);
  const [form, setForm] = useState({ majorCategory: "", careerName: "" });
  const [confirmDelete, setConfirmDelete] = useState<CareerRow | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.careers.list.key() });

  const createC = useMutation({
    ...orpc.tmbAdmin.careers.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Karier ditambahkan!");
      setShowForm(false);
      setForm({ majorCategory: "", careerName: "" });
      invalidate();
    },
    onError: (e) => toast.error(e.message || "Gagal menambah karier"),
  });
  const updateC = useMutation({
    ...orpc.tmbAdmin.careers.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Karier diperbarui!");
      setShowForm(false);
      setEditing(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message || "Gagal memperbarui karier"),
  });
  const deleteC = useMutation({
    ...orpc.tmbAdmin.careers.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Karier dihapus");
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message || "Gagal menghapus karier"),
  });

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? careers.filter((c) => c.careerName.toLowerCase().includes(q) || c.majorCategory.toLowerCase().includes(q))
      : careers;
    const map = new Map<string, CareerRow[]>();
    for (const c of filtered) {
      const arr = map.get(c.majorCategory) ?? [];
      arr.push(c);
      map.set(c.majorCategory, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [careers, query]);

  const openEdit = (c: CareerRow) => {
    setEditing(c);
    setForm({ majorCategory: c.majorCategory, careerName: c.careerName });
    setShowForm(true);
  };

  const submit = () => {
    if (!form.careerName.trim() || !form.majorCategory.trim()) {
      toast.error("Lengkapi nama karier dan kategori jurusan");
      return;
    }
    const payload = { careerName: form.careerName.trim(), majorCategory: form.majorCategory.trim() };
    if (editing) updateC.mutate({ id: editing.id, ...payload });
    else createC.mutate(payload);
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
          <h1 className="font-bold font-bricolage text-2xl text-brand-navy">Mapping Karier</h1>
          <p className="mt-1 font-manrope text-gray-500 text-sm">
            Hubungan profesi ↔ kategori jurusan — dipakai hasil test & fitur Karir Impian.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm({ majorCategory: "", careerName: "" });
            setShowForm(true);
          }}
          className="rounded-xl bg-brand-navy font-bold font-bricolage text-white shadow-sm hover:bg-brand-navy-light"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Tambah Karier
        </Button>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari karier atau kategori…"
        className="max-w-sm rounded-xl border-gray-200 bg-white shadow-sm"
      />

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 border-dashed bg-white px-6 py-14 text-center">
          <Briefcase className="h-10 w-10 text-gray-300" />
          <h3 className="mt-3 font-bold font-bricolage text-gray-900">
            {query ? "Tidak ditemukan" : "Belum ada mapping karier"}
          </h3>
          <p className="mt-1 max-w-xs font-manrope text-gray-500 text-sm">
            {query ? "Coba kata kunci lain." : "Tambahkan karier pertama untuk kategori jurusan."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([cat, items], gi) => (
            <div key={cat} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-gray-100 border-b bg-gray-50/60 px-4 py-2.5">
                <p className="font-bold font-manrope text-gray-600 text-xs uppercase tracking-wide">
                  {cat}{" "}
                  <span className="ml-1.5 rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-400">
                    {items.length}
                  </span>
                </p>
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(0.02 * (gi * 3 + i), 0.3) }}
                    className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 transition-colors hover:border-teal-500/30"
                  >
                    <Briefcase className="h-4 w-4 shrink-0 text-teal-600" />
                    <span className="min-w-0 flex-1 truncate font-manrope font-medium text-gray-800 text-sm">
                      {c.careerName}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(c)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-500 hover:bg-red-50"
                      onClick={() => setConfirmDelete(c)}
                      aria-label="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy">
              {editing ? "Edit Karier" : "Tambah Karier"}
            </DialogTitle>
            <DialogDescription className="font-manrope text-xs">
              Gunakan category key yang sama dengan Pola Jurusan (misal: teknik-informatika).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama Karier *</Label>
              <Input
                value={form.careerName}
                onChange={(e) => setForm({ ...form, careerName: e.target.value })}
                placeholder="Software Engineer"
                className="mt-1 rounded-xl border-gray-200 bg-gray-50"
              />
            </div>
            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">
                Kategori Jurusan (category key) *
              </Label>
              <Input
                value={form.majorCategory}
                onChange={(e) => setForm({ ...form, majorCategory: e.target.value })}
                placeholder="teknik-informatika"
                className="mt-1 rounded-xl border-gray-200 bg-gray-50"
              />
              <p className="mt-1 font-manrope text-[11px] text-gray-400">
                Pilihan: {["kedokteran", "teknik-informatika", "desain", "akuntansi", "psikologi"].join(" · ")} dst.
              </p>
            </div>
            <Button
              onClick={submit}
              disabled={createC.isPending || updateC.isPending}
              className="w-full rounded-xl bg-mentor-teal py-3 font-bold font-bricolage text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {createC.isPending || updateC.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Karier"
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
              Hapus karier "{confirmDelete?.careerName}"?
            </DialogTitle>
            <DialogDescription className="font-manrope text-sm">
              Karier ini tidak akan muncul lagi di rekomendasi & Karir Impian.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Batal
            </Button>
            <Button
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={deleteC.isPending}
              onClick={() => confirmDelete && deleteC.mutate({ id: confirmDelete.id })}
            >
              {deleteC.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
