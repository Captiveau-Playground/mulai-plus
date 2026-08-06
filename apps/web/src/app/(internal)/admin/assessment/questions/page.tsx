"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const DIM_OPTIONS: Record<string, { label: string; cls: string }> = {
  R: { label: "Realistic", cls: "bg-blue-50 text-blue-700" },
  I: { label: "Investigative", cls: "bg-violet-50 text-violet-700" },
  A: { label: "Artistic", cls: "bg-pink-50 text-pink-700" },
  S: { label: "Social", cls: "bg-green-50 text-green-700" },
  E: { label: "Enterprising", cls: "bg-amber-50 text-amber-700" },
  C: { label: "Conventional", cls: "bg-gray-100 text-gray-600" },
  numerical: { label: "Numerik", cls: "bg-blue-50 text-blue-700" },
  verbal: { label: "Verbal", cls: "bg-teal-50 text-teal-700" },
  logical: { label: "Logika", cls: "bg-orange-50 text-orange-700" },
  spatial: { label: "Spasial", cls: "bg-violet-50 text-violet-700" },
  clerical: { label: "Ketelitian", cls: "bg-rose-50 text-rose-700" },
};

const EMPTY_FORM = {
  dimension: "",
  pairDimension: "",
  text: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  answer: "",
};

type QuestionRow = {
  id: string;
  testCode: "interest" | "ability";
  dimension: string;
  pairDimension: string | null;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  answer: string | null;
  order: number;
  isActive: boolean;
};

export default function AdminQuestionsPage() {
  const queryClient = useQueryClient();
  const [testCode, setTestCode] = useState<"interest" | "ability">("interest");
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<QuestionRow | null>(null);

  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.questions.list.queryOptions({ input: { testCode } }),
  });
  const questions: QuestionRow[] = data?.items ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.questions.list.key() });
  };

  const createQ = useMutation({
    ...orpc.tmbAdmin.questions.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Soal ditambahkan!");
      setShowForm(false);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e) => toast.error(e.message || "Gagal menambah soal"),
  });
  const updateQ = useMutation({
    ...orpc.tmbAdmin.questions.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Soal diperbarui!");
      setEditing(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message || "Gagal memperbarui soal"),
  });
  const deleteQ = useMutation({
    ...orpc.tmbAdmin.questions.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Soal dihapus");
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message || "Gagal menghapus soal"),
  });
  const toggleQ = useMutation({
    ...orpc.tmbAdmin.questions.toggle.mutationOptions(),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e.message || "Gagal mengubah status"),
  });
  const reorderQ = useMutation({
    ...orpc.tmbAdmin.questions.reorder.mutationOptions(),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e.message || "Gagal mengubah urutan"),
  });

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const ids = questions.map((q) => q.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderQ.mutate({ testCode, ids });
  };

  const openEdit = (q: QuestionRow) => {
    setEditing(q);
    setForm({
      dimension: q.dimension,
      pairDimension: q.pairDimension ?? "",
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC ?? "",
      optionD: q.optionD ?? "",
      answer: q.answer ?? "",
    });
    setShowForm(true);
  };

  const dims =
    testCode === "interest"
      ? ["R", "I", "A", "S", "E", "C"]
      : ["numerical", "verbal", "logical", "spatial", "clerical"];

  const submit = () => {
    const payload = {
      dimension: form.dimension,
      pairDimension: form.pairDimension || undefined,
      text: form.text,
      optionA: form.optionA,
      optionB: form.optionB,
      optionC: form.optionC || undefined,
      optionD: form.optionD || undefined,
      answer: form.answer || undefined,
    };
    if (!form.dimension || !form.text.trim() || !form.optionA.trim() || !form.optionB.trim()) {
      toast.error("Lengkapi dimensi, teks soal, dan minimal 2 opsi");
      return;
    }
    if (testCode === "ability" && !form.answer) {
      toast.error("Soal kemampuan wajib punya kunci jawaban");
      return;
    }
    if (editing) updateQ.mutate({ id: editing.id, ...payload });
    else createQ.mutate({ testCode, ...payload });
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
          <h1 className="font-bold font-bricolage text-2xl text-brand-navy">Manajemen Soal</h1>
          <p className="mt-1 font-manrope text-gray-500 text-sm">
            Kelola bank soal test minat & bakat — perubahan langsung berlaku untuk semua pengguna.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm(EMPTY_FORM);
            setShowForm(true);
          }}
          className="rounded-xl bg-brand-navy font-bold font-bricolage text-white shadow-sm hover:bg-brand-navy-light"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Tambah Soal
        </Button>
      </div>

      {/* Tab minat/bakat */}
      <div className="flex gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm">
        {(["interest", "ability"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTestCode(t)}
            className={cn(
              "flex-1 rounded-xl px-4 py-2 font-manrope font-semibold text-sm transition-colors",
              testCode === t ? "bg-mentor-teal text-white shadow-sm" : "text-gray-500 hover:bg-gray-50",
            )}
          >
            {t === "interest" ? "🧠 Tes Minat (Holland)" : "💡 Tes Bakat"}
            {!isLoading && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                  testCode === t ? "bg-white/20" : "bg-gray-100",
                )}
              >
                {data?.total ?? questions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 border-dashed bg-white px-6 py-14 text-center">
          <BookOpen className="h-10 w-10 text-gray-300" />
          <h3 className="mt-3 font-bold font-bricolage text-gray-900">Belum ada soal</h3>
          <p className="mt-1 max-w-xs font-manrope text-gray-500 text-sm">Tambahkan soal pertama untuk test ini.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {questions.map((q, i) => {
            const dim = DIM_OPTIONS[q.dimension] ?? { label: q.dimension, cls: "bg-gray-100 text-gray-600" };
            const options = [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean);
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(0.03 * i, 0.3) }}
                className={cn(
                  "rounded-2xl border bg-white p-4 shadow-sm transition-opacity",
                  q.isActive ? "border-gray-100" : "border-gray-100 opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || reorderQ.isPending}
                      className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                      aria-label="Naikkan urutan"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-center font-bold font-manrope text-[11px] text-gray-400">{q.order}</span>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === questions.length - 1 || reorderQ.isPending}
                      className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                      aria-label="Turunkan urutan"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 font-bold font-manrope text-[10px]", dim.cls)}>
                        {dim.label}
                      </span>
                      {q.pairDimension ? (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-manrope text-[10px] text-gray-500">
                          lawan: {DIM_OPTIONS[q.pairDimension]?.label ?? q.pairDimension}
                        </span>
                      ) : null}
                      {q.answer ? (
                        <span className="rounded-full bg-green-50 px-2.5 py-0.5 font-bold font-manrope text-[10px] text-green-700">
                          Jawaban: {q.answer}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 font-manrope font-semibold text-gray-800 text-sm">{q.text}</p>
                    <p className="mt-1 font-manrope text-gray-400 text-xs">
                      {options.map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join(" · ")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleQ.mutate({ id: q.id })}
                      className={cn(
                        "relative h-5 w-9 rounded-full transition-colors",
                        q.isActive ? "bg-green-500" : "bg-gray-300",
                      )}
                      aria-label={q.isActive ? "Nonaktifkan" : "Aktifkan"}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                          q.isActive ? "left-4.5" : "left-0.5",
                        )}
                      />
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(q)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                      onClick={() => setConfirmDelete(q)}
                      aria-label="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Form modal (create/edit) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy">
              {editing ? "Edit Soal" : "Tambah Soal"}
            </DialogTitle>
            <DialogDescription className="font-manrope text-xs">
              {testCode === "interest"
                ? "Tes Minat: dimensi R/I/A/S/E/C, tanpa kunci jawaban."
                : "Tes Bakat: wajib mengisi kunci jawaban (A/B/C/D)."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Dimensi *</Label>
              <Select value={form.dimension} onValueChange={(v) => setForm({ ...form, dimension: v ?? "" })}>
                <SelectTrigger className="mt-1 rounded-xl border-gray-200 bg-gray-50">
                  <SelectValue placeholder="Pilih dimensi" />
                </SelectTrigger>
                <SelectContent>
                  {dims.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DIM_OPTIONS[d]?.label ?? d} ({d})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {testCode === "interest" && (
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Dimensi Lawan (opsional)</Label>
                <Select value={form.pairDimension} onValueChange={(v) => setForm({ ...form, pairDimension: v ?? "" })}>
                  <SelectTrigger className="mt-1 rounded-xl border-gray-200 bg-gray-50">
                    <SelectValue placeholder="Pilih dimensi lawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {dims.map((d) => (
                      <SelectItem key={d} value={d}>
                        {DIM_OPTIONS[d]?.label ?? d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Teks Soal *</Label>
              <Input
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder={
                  testCode === "interest" ? "Kamu lebih suka bekerja dengan…" : "Lanjutkan deret: 2, 4, 8, …"
                }
                className="mt-1 rounded-xl border-gray-200 bg-gray-50"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {(["optionA", "optionB", "optionC", "optionD"] as const).map((k) => (
                <div key={k}>
                  <Label className="font-manrope font-semibold text-gray-600 text-xs">
                    Opsi {k.replace("option", "")}
                    {k === "optionA" || k === "optionB" ? " *" : ""}
                  </Label>
                  <Input
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="mt-1 rounded-xl border-gray-200 bg-gray-50"
                  />
                </div>
              ))}
            </div>

            {testCode === "ability" && (
              <div>
                <Label className="font-manrope font-semibold text-gray-600 text-xs">Kunci Jawaban * (A/B/C/D)</Label>
                <Input
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value.toUpperCase() })}
                  placeholder="A"
                  maxLength={1}
                  className="mt-1 w-24 rounded-xl border-gray-200 bg-gray-50"
                />
              </div>
            )}

            <Button
              onClick={submit}
              disabled={createQ.isPending || updateQ.isPending}
              className="w-full rounded-xl bg-mentor-teal py-3 font-bold font-bricolage text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {createQ.isPending || updateQ.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Soal"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bricolage text-brand-navy">Hapus soal ini?</DialogTitle>
            <DialogDescription className="font-manrope text-sm">
              "{confirmDelete?.text.slice(0, 60)}…" akan dihapus permanen beserta jawaban terkait.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Batal
            </Button>
            <Button
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={deleteQ.isPending}
              onClick={() => confirmDelete && deleteQ.mutate({ id: confirmDelete.id })}
            >
              {deleteQ.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
