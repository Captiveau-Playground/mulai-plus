"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, Plus, School } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
        <Link href="/admin/assessment" className="mt-3 inline-block font-bold font-manrope text-mentor-teal text-sm">
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
          href="/admin/assessment"
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
              <ArrowRight className="h-5 w-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-mentor-teal" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
