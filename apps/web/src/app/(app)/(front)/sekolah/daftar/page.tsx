"use client";

// Pendaftaran sekolah (B2B). Bisa diakses semua akun yang sudah login; setelah
// dikirim, statusnya "menunggu persetujuan admin MULAI+" dan dashboard sekolah
// baru terbuka setelah disetujui.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, GraduationCap, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { orpc } from "@/utils/orpc";

const TIPE = [
  { value: "sekolah", label: "Sekolah (SMA/SMK/MA)" },
  { value: "kampus", label: "Kampus / Universitas" },
  { value: "bimbel", label: "Bimbel / Lembaga Kursus" },
  { value: "korporat", label: "Korporat / Instansi" },
];

export default function DaftarSekolahPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useQuery(orpc.school.me.queryOptions());
  const [form, setForm] = useState({
    name: "",
    type: "sekolah",
    npsn: "",
    city: "",
    address: "",
    picName: "",
    picPosition: "",
    picPhone: "",
    picEmail: "",
  });
  const [selesai, setSelesai] = useState(false);

  const daftar = useMutation({
    ...orpc.school.register.mutationOptions(),
    onSuccess: async (r: any) => {
      if (r?.ok === false && r?.error === "sudah_terdaftar") {
        notify.warn(`Akun ini sudah terdaftar untuk ${r.orgName ?? "sebuah sekolah"}`);
      } else {
        notify.success("Pendaftaran terkirim — menunggu persetujuan admin MULAI+");
      }
      setSelesai(true);
      await qc.invalidateQueries({ queryKey: orpc.school.me.key() });
    },
    onError: (e: any) => notify.error(e?.message ?? "Gagal mengirim pendaftaran"),
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim().length >= 3 && form.picName.trim().length >= 2 && form.picPhone.trim().length >= 8;

  const submit = () => {
    if (!valid) {
      notify.warn("Lengkapi nama sekolah, nama PIC, dan nomor WhatsApp");
      return;
    }
    daftar.mutate({
      name: form.name.trim(),
      type: form.type as "sekolah" | "kampus" | "bimbel" | "korporat",
      npsn: form.npsn.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      picName: form.picName.trim(),
      picPosition: form.picPosition.trim(),
      picPhone: form.picPhone.trim(),
      picEmail: form.picEmail.trim(),
    });
  };

  const sudahTerdaftar = !!me.data?.org;

  // ── Sudah mendaftar / baru selesai mendaftar ──────────────────────────────
  if (sudahTerdaftar || selesai) {
    const org = me.data?.org;
    const status = org?.status ?? "pending";
    return (
      <div className="mx-auto max-w-lg px-4 py-14" data-testid="school-register-done">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
            {status === "aktif" ? (
              <CheckCircle2 className="h-7 w-7 text-teal-600" />
            ) : (
              <GraduationCap className="h-7 w-7 text-brand-navy" />
            )}
          </span>
          <h1 className="mt-4 font-bold font-bricolage text-gray-900 text-xl">
            {status === "aktif" ? "Sekolah sudah aktif" : "Pendaftaran terkirim"}
          </h1>
          <p className="mt-2 font-manrope text-gray-500 text-sm">
            {status === "aktif"
              ? "Dashboard sekolah sudah bisa dibuka."
              : "Tim MULAI+ akan memverifikasi maksimal 1×24 jam kerja. Kami kabari lewat email/WhatsApp."}
          </p>
          {org?.name && (
            <p className="mt-3 font-manrope font-semibold text-gray-700 text-sm" data-testid="registered-school-name">
              {org.name}
            </p>
          )}
          <Button
            onClick={() => router.push("/sekolah" as Parameters<typeof router.push>[0])}
            className="mt-5 rounded-xl bg-brand-navy px-5 py-3 font-bold font-manrope text-sm text-white hover:brightness-110"
          >
            Buka dashboard sekolah
          </Button>
        </div>
      </div>
    );
  }

  // ── Formulir ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl px-4 py-10" data-testid="school-register-form">
      <p className="font-manrope font-semibold text-[11px] text-teal-600 uppercase tracking-wide">Kemitraan Sekolah</p>
      <h1 className="mt-1 font-bold font-bricolage text-2xl text-gray-900">Daftarkan sekolahmu</h1>
      <p className="mt-2 font-manrope text-gray-500 text-sm">
        Gratis. Setelah disetujui, kamu mendapat akses dashboard untuk memantau peserta, hasil tes, dan insight kelas.
        Isi data berikut — verifikasi maksimal 1×24 jam kerja.
      </p>

      <div className="mt-6 space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama sekolah *</Label>
            <Input
              data-testid="school-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="cth: SMA Negeri 1 Bandung"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Jenis institusi</Label>
            <select
              data-testid="school-type"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 font-manrope text-sm outline-none focus:border-mentor-teal"
            >
              {TIPE.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">NPSN (opsional)</Label>
            <Input
              data-testid="school-npsn"
              value={form.npsn}
              onChange={(e) => set("npsn", e.target.value)}
              placeholder="8 digit"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Kota / Kabupaten</Label>
            <Input
              data-testid="school-city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="cth: Bandung"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Alamat (opsional)</Label>
            <Input
              data-testid="school-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Jl. …"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        <p className="font-manrope font-semibold text-gray-700 text-xs">Penanggung jawab (PIC)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Nama PIC *</Label>
            <Input
              data-testid="school-pic-name"
              value={form.picName}
              onChange={(e) => set("picName", e.target.value)}
              placeholder="cth: Budi Santoso"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Jabatan</Label>
            <Input
              data-testid="school-pic-position"
              value={form.picPosition}
              onChange={(e) => set("picPosition", e.target.value)}
              placeholder="cth: Guru BK"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">No. WhatsApp *</Label>
            <Input
              data-testid="school-pic-phone"
              value={form.picPhone}
              onChange={(e) => set("picPhone", e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
          <div>
            <Label className="font-manrope font-semibold text-gray-600 text-xs">Email sekolah (opsional)</Label>
            <Input
              data-testid="school-pic-email"
              value={form.picEmail}
              onChange={(e) => set("picEmail", e.target.value)}
              placeholder="bk@sekolah.sch.id"
              className="mt-1 rounded-xl border-gray-200 bg-gray-50"
            />
          </div>
        </div>

        <Button
          data-testid="school-submit"
          onClick={daftar.isPending ? () => undefined : submit}
          disabled={daftar.isPending}
          className="w-full rounded-xl bg-brand-navy px-5 py-3 font-bold font-manrope text-sm text-white hover:brightness-110 disabled:opacity-60"
        >
          {daftar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Kirim pendaftaran
        </Button>
        <p className="text-center font-manrope text-[11px] text-gray-400">
          Dengan mendaftar kamu menyetujui data sekolah & peserta digunakan hanya untuk layanan assessment MULAI+.{" "}
          <Link href="/" className="underline">
            Kembali ke beranda
          </Link>
        </p>
      </div>
    </div>
  );
}
