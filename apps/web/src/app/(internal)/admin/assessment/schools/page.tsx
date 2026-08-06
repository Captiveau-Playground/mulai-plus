"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Plus, School, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  prospek: { label: "Prospek", cls: "bg-amber-50 text-amber-600" },
  aktif: { label: "Aktif", cls: "bg-green-50 text-green-600" },
  selesai: { label: "Selesai", cls: "bg-gray-100 text-gray-500" },
};

export default function AdminSchoolsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    ...orpc.tmbAdmin.schools.list.queryOptions({ input: {} }),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("prospek");

  const createSchool = useMutation({
    ...orpc.tmbAdmin.schools.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Sekolah terdaftar!");
      setShowForm(false);
      setName("");
      setCity("");
      setEmail("");
      setPhone("");
      setStatus("prospek");
      queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.schools.list.key() });
    },
    onError: (e) => toast.error(e.message || "Gagal mendaftarkan sekolah"),
  });

  const deleteSchool = useMutation({
    ...orpc.tmbAdmin.schools.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Sekolah dihapus");
      queryClient.invalidateQueries({ queryKey: orpc.tmbAdmin.schools.list.key() });
    },
    onError: (e) => toast.error(e.message || "Gagal menghapus sekolah"),
  });

  const schools = data ?? [];

  return (
    <div className="space-y-5">
      <Link
        href="/admin/assessment"
        className="mt-3 inline-flex items-center gap-1 font-bold font-manrope text-mentor-teal text-sm transition-colors hover:text-teal-700"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard Assessment
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold font-bricolage text-2xl text-brand-navy">Sekolah Kerjasama</h1>
          <p className="mt-1 font-manrope text-gray-500 text-sm">
            Kelola sekolah partner — buat batch test, undang siswa, dan pantau rekap.
          </p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-brand-navy font-bold font-bricolage text-white shadow-sm hover:bg-brand-navy-light"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Daftarkan Sekolah
        </Button>
      </div>

      {/* Create school */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama Sekolah *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="misal: SMAN 1 Bandung"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Kota</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Bandung"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "prospek")}>
              <SelectTrigger className="mt-1 rounded-xl border-gray-200 bg-gray-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospek">Prospek</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="selesai">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Email Kontak</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sekolah.sch.id"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Telepon</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="022-xxxx"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <div className="md:col-span-2">
            <Button
              onClick={() =>
                createSchool.mutate({
                  name,
                  city: city || undefined,
                  email: email || undefined,
                  phone: phone || undefined,
                  status: status as any,
                })
              }
              disabled={!name.trim() || createSchool.isPending}
              className="w-full rounded-xl bg-mentor-teal py-5 font-bold font-bricolage text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {createSchool.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Daftarkan Sekolah"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* School list */}
      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" />
        </div>
      ) : schools.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 border-dashed bg-white px-6 py-14 text-center">
          <span className="text-5xl">🏫</span>
          <h3 className="mt-3 font-bold font-bricolage text-gray-900">Belum ada sekolah partner</h3>
          <p className="mt-1 max-w-xs font-manrope text-gray-500 text-sm">
            Daftarkan sekolah yang bekerjasama dengan MULAI+, lalu buat batch test untuk mereka.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {schools.map((s: any, i: number) => {
            const st = STATUS_META[s.status] ?? STATUS_META.prospek;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
              >
                <Link
                  href={`/admin/assessment/schools/${s.id}`}
                  className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-mentor-teal/40 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5">
                      <School className="h-6 w-6 text-brand-navy" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold font-bricolage text-gray-900">{s.name}</p>
                      <p className="font-manrope text-gray-500 text-xs">{s.city || "—"}</p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-0.5 font-bold font-manrope text-[10px]", st.cls)}>
                      {st.label}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.confirm(`Hapus sekolah "${s.name}"? Seluruh batch & siswa terkait ikut terhapus.`)) {
                          deleteSchool.mutate({ id: s.id });
                        }
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="Hapus sekolah"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-lg bg-gray-50 px-2.5 py-1 font-manrope text-[11px] text-gray-600">
                      {s.batchCount} batch
                    </span>
                    <span className="rounded-lg bg-gray-50 px-2.5 py-1 font-manrope text-[11px] text-gray-600">
                      {s.studentCount} siswa
                    </span>
                    <span className="ml-auto flex items-center gap-1 font-bold font-manrope text-mentor-teal text-xs">
                      Kelola <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
