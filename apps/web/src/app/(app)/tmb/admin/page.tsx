"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Plus, School } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc } from "@/utils/orpc";

export default function TmbAdminPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.batches.list.queryOptions({ input: {} }),
  });
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");

  const createMutation = useMutation({
    ...orpc.tmbAdmin.batches.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Batch dibuat!");
      setShowForm(false);
      setName("");
      setClassName("");
      setMajor("");
      setYear("");
      queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.batches.list.key() });
    },
    onError: (e) => toast.error(e.message || "Gagal membuat batch"),
  });

  const batches = data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold font-bricolage text-gray-900 text-xl">Kelola Sekolah</h1>
          <p className="mt-1 font-manrope text-gray-500 text-sm">Buat batch, undang siswa, pantau progres.</p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-2xl bg-brand-navy font-bold font-bricolage text-white shadow-md hover:bg-brand-navy-light"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Batch
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama Batch</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="misal: SMAN 1 Bandung 2026"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Kelas</Label>
              <Input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="XII-A"
                className="mt-1 rounded-xl border-gray-200 bg-gray-50"
              />
            </div>
            <div>
              <Label className="font-manrope font-semibold text-gray-600 text-xs">Jurusan</Label>
              <Input
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="IPA / IPS"
                className="mt-1 rounded-xl border-gray-200 bg-gray-50"
              />
            </div>
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Tahun Lulus</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2026"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <Button
            onClick={() =>
              createMutation.mutate({
                name,
                className: className || undefined,
                major: major || undefined,
                graduationYear: year ? Number(year) : undefined,
              })
            }
            disabled={!name.trim() || createMutation.isPending}
            className="w-full rounded-2xl bg-mentor-teal py-5 font-bold font-bricolage text-white shadow-md hover:bg-teal-700 disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buat Batch"}
          </Button>
        </motion.div>
      )}

      {/* Batch list */}
      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
        </div>
      ) : batches.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-gray-200 border-dashed bg-white px-6 py-12 text-center">
          <span className="text-5xl">🏫</span>
          <h3 className="mt-3 font-bold font-bricolage text-gray-900">Belum ada batch</h3>
          <p className="mt-1 max-w-xs font-manrope text-gray-500 text-sm">
            Buat batch pertama untuk mulai mengelola siswa sekolahmu.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((b: any, i: number) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
            >
              <Link
                href={`/tmb/admin/batches/${b.id}`}
                className="group flex items-center gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-mentor-teal/40 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-navy/5">
                  <School className="h-6 w-6 text-brand-navy" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold font-bricolage text-gray-900">{b.name}</p>
                  <p className="font-manrope text-gray-500 text-xs">
                    {[b.className, b.major, b.graduationYear ? `Lulus ${b.graduationYear}` : null]
                      .filter(Boolean)
                      .join(" · ") || "Batch"}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-mentor-teal" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
