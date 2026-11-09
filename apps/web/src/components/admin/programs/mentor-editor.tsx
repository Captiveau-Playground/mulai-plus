"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ImagePlus, Loader2, Save, XCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/toast";
import { orpc } from "@/utils/orpc";

type Opt = { label: string; value: string };

/** Autocomplete sederhana (data dari PDDikti) — tanpa dependency tambahan. */
function Autocomplete({
  label,
  value,
  onChange,
  onPick,
  fetchOptions,
  placeholder,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPick?: (o: Opt) => void;
  fetchOptions: (q: string) => Promise<Opt[]>;
  placeholder?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<Opt[]>([]);
  const debounced = useDebounce(value, 300);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || debounced.trim().length < 3) {
      setOpts([]);
      return;
    }
    let alive = true;
    fetchOptions(debounced)
      .then((o) => alive && setOpts(o))
      .catch(() => alive && setOpts([]));
    return () => {
      alive = false;
    };
  }, [debounced, open, fetchOptions]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <Label className="mb-1.5 block">{label}</Label>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        data-testid={testId}
        autoComplete="off"
      />
      {open && opts.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {opts.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.label);
                onPick?.(o);
                setOpen(false);
              }}
              data-testid="mentor-opt"
              className="block w-full px-3 py-2 text-left font-manrope text-sm text-text-main transition-colors hover:bg-gray-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MentorEditor({ mentorId }: { mentorId: string }) {
  const { data: session } = authClient.useSession();
  const { data, isLoading, refetch } = useQuery({
    ...orpc.programs.admin.mentors.get.queryOptions({ input: { mentorId } }),
    staleTime: 0,
  });
  const mentor: any = data;

  const [form, setForm] = useState({
    displayName: "",
    jurusan: "",
    jurusanId: "",
    kampus: "",
    kampusId: "",
    tahunMasuk: "",
    bidangPekerjaan: "",
    bergabungPada: "",
    pencapaian: "",
    instagram: "",
    tiktok: "",
    linkedin: "",
    x: "",
    threads: "",
    website: "",
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mentor) return;
    const d = mentor.detail ?? {};
    const sm = d.socialMedia ?? {};
    setForm({
      displayName: d.displayName ?? mentor.name ?? "",
      jurusan: d.jurusan ?? "",
      jurusanId: d.jurusanId ?? "",
      kampus: d.kampus ?? "",
      kampusId: d.kampusId ?? "",
      tahunMasuk: d.tahunMasuk ? String(d.tahunMasuk) : "",
      bidangPekerjaan: d.bidangPekerjaan ?? "",
      bergabungPada: mentor.joinedAt ? new Date(mentor.joinedAt).toISOString().slice(0, 10) : "",
      pencapaian: d.pencapaian ?? "",
      instagram: sm.instagram ?? "",
      tiktok: sm.tiktok ?? "",
      linkedin: sm.linkedin ?? "",
      x: sm.x ?? "",
      threads: sm.threads ?? "",
      website: sm.website ?? "",
    });
    setPhoto(d.photoUrl ?? mentor.image ?? null);
  }, [mentor]);

  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    ...orpc.programs.admin.mentors.saveDetail.mutationOptions(),
    onSuccess: (res: any) => {
      if (res?.ok === false && res?.error === "butuh_persetujuan_mentor") {
        notify.error("Belum bisa ditayangkan", {
          description: "Tunggu persetujuan mentor dulu. Data tetap tersimpan.",
        });
        return;
      }
      notify.success("Data mentor tersimpan");
      void refetch();
    },
    onError: (e: any) => notify.error("Gagal menyimpan", { description: String(e?.message ?? e).slice(0, 120) }),
  });

  const uploadMut = useMutation({
    ...orpc.programs.admin.mentors.uploadPhoto.mutationOptions(),
    onSuccess: (res: any) => {
      setPhoto(res?.url ?? null);
      notify.success("Foto diperbarui");
      void refetch();
    },
    onError: (e: any) => notify.error("Gagal upload foto", { description: String(e?.message ?? e).slice(0, 120) }),
  });

  const activeMut = useMutation({
    ...orpc.programs.admin.mentors.setActive.mutationOptions(),
    onSuccess: () => {
      notify.success("Status mentor diperbarui");
      void refetch();
    },
  });

  // Panggil RPC langsung via fetch — proxy client dari modul utils bermasalah di bundler dev.
  const rpc = async (proc: string, json: any) => {
    const base = String(process.env.NEXT_PUBLIC_SERVER_URL ?? "").replace(/\/$/, "");
    const res = await fetch(`${base}/rpc/${proc}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ json }),
    });
    const body = await res.json().catch(() => ({}));
    return (body as any)?.json ?? body;
  };
  const fetchUni = async (q: string): Promise<Opt[]> => {
    const res: any = await rpc("pddikti/publicListUniversities", { search: q, page: 1, pageSize: 6 });
    return (res?.data ?? []).map((u: any) => ({
      label: `${u.name}${u.shortName ? ` (${u.shortName})` : ""}`,
      value: u.idSp ?? u.id,
    }));
  };
  const fetchProdi = async (q: string): Promise<Opt[]> => {
    const res: any = await rpc("pddikti/publicListStudyPrograms", { search: q, page: 1, pageSize: 6 });
    return (res?.data ?? []).map((p: any) => ({ label: `${p.name} (${p.level ?? "-"})`, value: p.idSms }));
  };

  if (isLoading) {
    return (
      <div className="flex h-56 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-mentor-teal" />
      </div>
    );
  }
  if (!mentor) return <p className="font-manrope text-sm text-text-muted-custom">Mentor tidak ditemukan.</p>;

  const isActive = !mentor.banned;
  const canPublish = !!mentor.detail?.approvedAt;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* FORM */}
      <div className="space-y-5 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold font-bricolage text-brand-navy text-lg">Data Detail Mentor</h3>
            <p className="font-manrope text-text-muted-custom text-xs">
              Diisi PM/Admin. Tampil di landing page hanya setelah mentor menyetujui.
            </p>
          </div>
          <Badge variant="secondary" className={canPublish ? "text-emerald-700" : "text-amber-700"}>
            {mentor.detail?.isPublic ? "Tampil di landing" : canPublish ? "Disetujui mentor" : "Belum disetujui"}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block">Nama tampilan</Label>
            <Input
              value={form.displayName}
              onChange={(e) => set("displayName")(e.target.value)}
              placeholder={mentor.name ?? ""}
              data-testid="mentor-displayName"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Tahun masuk</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={form.tahunMasuk}
              onChange={(e) => set("tahunMasuk")(e.target.value)}
              placeholder="2021"
              data-testid="mentor-tahunMasuk"
            />
          </div>

          <Autocomplete
            label="Kampus"
            value={form.kampus}
            onChange={set("kampus")}
            onPick={(o) => setForm((p) => ({ ...p, kampusId: o.value }))}
            fetchOptions={fetchUni}
            placeholder="Cari kampus (data PDDikti)…"
            testId="mentor-kampus"
          />
          <Autocomplete
            label="Jurusan kuliah"
            value={form.jurusan}
            onChange={set("jurusan")}
            onPick={(o) => setForm((p) => ({ ...p, jurusanId: o.value }))}
            fetchOptions={fetchProdi}
            placeholder="Cari jurusan/prodi (data PDDikti)…"
            testId="mentor-jurusan"
          />

          <div>
            <Label className="mb-1.5 block">Bidang pekerjaan</Label>
            <Input
              value={form.bidangPekerjaan}
              onChange={(e) => set("bidangPekerjaan")(e.target.value)}
              placeholder="mis. Data Analyst di Tokopedia"
              data-testid="mentor-pekerjaan"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Mulai bergabung di MULAI+</Label>
            <Input
              type="date"
              value={form.bergabungPada}
              onChange={(e) => set("bergabungPada")(e.target.value)}
              data-testid="mentor-bergabung"
            />
            <p className="mt-1 font-manrope text-[11px] text-gray-400">Otomatis dari tanggal akun, bisa diubah.</p>
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block">Pencapaian karier</Label>
          <Textarea
            value={form.pencapaian}
            onChange={(e) => set("pencapaian")(e.target.value)}
            rows={4}
            placeholder={
              "Satu pencapaian per baris, mis.\nJuara 1 OSN Informatika 2019\nIntern Data Science di Tokopedia 2023"
            }
            data-testid="mentor-pencapaian"
          />
        </div>

        <div>
          <Label className="mb-2 block">Media sosial</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["instagram", "Instagram"],
              ["tiktok", "TikTok"],
              ["linkedin", "LinkedIn"],
              ["x", "X / Twitter"],
              ["threads", "Threads"],
              ["website", "Website"],
            ].map(([k, label]) => (
              <Input
                key={k}
                value={(form as any)[k]}
                onChange={(e) => set(k as any)(e.target.value.replace(/^@/, ""))}
                placeholder={label}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-gray-100 border-t pt-4">
          <Button
            type="button"
            data-testid="mentor-save"
            disabled={saveMut.isPending}
            onClick={() =>
              saveMut.mutate({
                mentorId,
                displayName: form.displayName || null,
                jurusan: form.jurusan || null,
                jurusanId: form.jurusanId || null,
                kampus: form.kampus || null,
                kampusId: form.kampusId || null,
                tahunMasuk: form.tahunMasuk ? Number(form.tahunMasuk) : null,
                bidangPekerjaan: form.bidangPekerjaan || null,
                bergabungPada: form.bergabungPada ? new Date(form.bergabungPada).toISOString() : null,
                pencapaian: form.pencapaian || null,
                socialMedia: {
                  instagram: form.instagram || undefined,
                  tiktok: form.tiktok || undefined,
                  linkedin: form.linkedin || undefined,
                  x: form.x || undefined,
                  threads: form.threads || undefined,
                  website: form.website || undefined,
                },
                isPublic: mentor.detail?.isPublic ?? undefined,
              } as any)
            }
          >
            {saveMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={activeMut.isPending}
            onClick={() => activeMut.mutate({ mentorId, active: !isActive })}
            data-testid="mentor-toggle-active"
          >
            {isActive ? (
              <XCircle className="mr-2 h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
            )}
            {isActive ? "Nonaktifkan mentor" : "Aktifkan mentor"}
          </Button>
        </div>
      </div>

      {/* FOTO + RINGKASAN */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
          <p className="font-bold font-bricolage text-brand-navy text-sm">Foto profil</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mentor-teal/10">
              {photo ? (
                <Image src={photo} alt="" width={80} height={80} className="h-full w-full object-cover" unoptimized />
              ) : (
                <ImagePlus className="h-6 w-6 text-mentor-teal" />
              )}
            </div>
            <div className="min-w-0">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 3_000_000) {
                    notify.error("Foto terlalu besar", { description: "Maksimal 3 MB." });
                    return;
                  }
                  const buf = await f.arrayBuffer();
                  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
                  uploadMut.mutate({ mentorId, dataB64: b64, mime: f.type || "image/jpeg" } as any);
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                {uploadMut.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="mr-2 h-3.5 w-3.5" />
                )}
                Ganti foto
              </Button>
              <p className="mt-2 font-manrope text-[11px] text-gray-400">JPG/PNG, maks 3 MB (disimpan di R2).</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
          <p className="font-bold font-bricolage text-brand-navy text-sm">Ringkasan</p>
          <dl className="mt-3 space-y-2 font-manrope text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted-custom">Email</dt>
              <dd className="truncate text-text-main">{mentor.email}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted-custom">Sesi</dt>
              <dd className="text-text-main">{mentor.stats?.total ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted-custom">Batch</dt>
              <dd className="text-text-main">{mentor.assignedBatches?.length ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-muted-custom">Mentee</dt>
              <dd className="text-text-main">{mentor.menteeCount ?? 0}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
