"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Brain, Layers, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/toast";
import { client, orpc } from "@/utils/orpc";

interface Version {
  id: string;
  versionNumber: number;
  status: string;
  publishedAt?: string | null;
}
interface SummaryItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  versions: Version[];
}

/** Index Kelola Tes (TanStack Query) — daftar tes + CRUD. */
export default function AssessmentEditorIndex() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing?: SummaryItem } | null>(null);
  const [del, setDel] = useState<SummaryItem | null>(null);
  // Tangga konfirmasi hapus (temuan analis #6): ringkasan dampak → wajib unduh
  // backup → wajib mengetik KODE tes. Server juga memverifikasi kode & melindungi
  // tes minat/bakat.
  const [delInfo, setDelInfo] = useState<any | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [backupDone, setBackupDone] = useState(false);
  const [delCode, setDelCode] = useState("");

  const openDelete = async (a: SummaryItem) => {
    setDel(a);
    setDelInfo(null);
    setBackupDone(false);
    setDelCode("");
    try {
      const r: any = await (client as any).discoverAdmin.inspect({ id: a.id });
      if (r?.ok) setDelInfo(r);
      else notify.error("Gagal memuat ringkasan tes");
    } catch {
      notify.error("Gagal memuat ringkasan tes");
    }
  };

  const unduhBackup = async () => {
    if (!del) return;
    setDelBusy(true);
    try {
      const r: any = await (client as any).discoverAdmin.exportAssessment({ id: del.id });
      if (!r?.ok) throw new Error(r?.error ?? "export gagal");
      const blob = new Blob([JSON.stringify(r.json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename ?? `${del.code}-backup.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupDone(true);
      notify.success("Backup terunduh — lanjut ketik kode tes");
    } catch {
      notify.error("Gagal mengunduh backup");
    } finally {
      setDelBusy(false);
    }
  };

  const hapusPermanen = async () => {
    if (!del) return;
    setDelBusy(true);
    try {
      const r: any = await (client as any).discoverAdmin.remove({ id: del.id, confirmCode: delCode.trim() });
      if (r?.ok) {
        notify.create("Tes dihapus permanen");
        setDel(null);
        void invalidate();
      } else if (r?.error === "confirm_mismatch") notify.error("Kode tes tidak cocok");
      else if (r?.error === "protected_assessment") notify.error("Tes minat/bakat resmi tidak bisa dihapus dari sini");
      else notify.error("Gagal menghapus tes");
    } catch (e: any) {
      notify.error("Gagal menghapus tes", { description: e?.message?.slice(0, 120) });
    } finally {
      setDelBusy(false);
    }
  };

  const summariesKey = orpc.discoverAdmin.summaries.key();
  const { data, isPending } = useQuery(orpc.discoverAdmin.summaries.queryOptions());
  const items: SummaryItem[] = data?.items ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: summariesKey });

  const mCreate = useMutation(
    orpc.discoverAdmin.create.mutationOptions({
      onSuccess: () => {
        notify.create("Tes disimpan ✅");
        setModal(null);
        void invalidate();
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );
  const mUpdate = useMutation(
    orpc.discoverAdmin.updateMeta.mutationOptions({
      onSuccess: () => {
        notify.create("Tes diperbarui ✅");
        setModal(null);
        void invalidate();
      },
      onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
    }),
  );

  const saveTest = async (payload: {
    code: string;
    name: string;
    description?: string;
    id?: string;
    family?: string | null;
  }) => {
    if (payload.id)
      await mUpdate.mutateAsync({
        id: payload.id,
        name: payload.name,
        description: payload.description ?? null,
        family: (payload.family as "minat" | "bakat" | null) ?? null,
      });
    else
      await mCreate.mutateAsync({
        code: payload.code,
        name: payload.name,
        description: payload.description ?? "",
        family: (payload.family as "minat" | "bakat" | null) ?? null,
      });
  };

  const busy = mCreate.isPending || mUpdate.isPending || delBusy;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-bold font-bricolage text-foreground text-xl">
            <Layers className="h-5 w-5 text-brand-navy" /> Kelola Tes
          </h1>
          <p className="font-manrope text-muted-foreground text-sm">
            Pilih tes untuk mengatur aturan, soal, dan menerbitkan.
          </p>
        </div>
        <Button className="bg-brand-navy hover:bg-brand-navy-light" onClick={() => setModal({ open: true })}>
          <Plus className="mr-1 h-4 w-4" /> Buat Tes
        </Button>
      </div>

      {isPending && <p className="font-manrope text-muted-foreground text-sm">Memuat tes…</p>}
      {!isPending && items.length === 0 && (
        <Card>
          <CardContent className="pt-5 font-manrope text-muted-foreground text-sm">
            Belum ada tes — klik <b>Buat Tes</b> untuk memulai.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {items.map((a) => {
          const v = a.versions;
          const live = v.find((x) => x.status === "live");
          const draft = v.find((x) => x.status === "draft");
          return (
            <Link
              key={a.id}
              href={`/admin/assessment/editor/${a.code}`}
              className="group block"
              data-testid={`test-row-${a.code}`}
            >
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-brand-orange/40 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy/10">
                    <Brain className="h-5 w-5 text-brand-navy" />
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 font-bold font-bricolage text-base text-foreground group-hover:text-brand-navy">
                      {a.name}
                      {(a as any).family && (
                        <Badge className="border-gray-200 bg-gray-50 text-gray-500">
                          {(a as any).family === "minat" ? "Tes Minat (B2C)" : "Tes Bakat (B2C)"}
                        </Badge>
                      )}
                    </p>
                    <p className="font-manrope text-muted-foreground text-xs">
                      {v.length} versi ·{" "}
                      {live ? <b className="text-teal-700">● main — aktif utk siswa</b> : "Belum dirilis"}{" "}
                      {draft ? "· ada draf" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden gap-1 sm:flex">
                    {v.slice(0, 4).map((x) => (
                      <Badge
                        key={x.id}
                        className={
                          x.status === "live"
                            ? "border-teal-500/30 bg-teal-500/10 text-teal-700"
                            : x.status === "draft"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                              : "border-gray-200 bg-gray-100 text-gray-500"
                        }
                      >
                        v{x.versionNumber}
                      </Badge>
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setModal({ open: true, editing: a });
                    }}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Ubah nama/deskripsi"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      void openDelete(a);
                    }}
                    data-testid={`del-open-${a.code}`}
                    className="rounded-lg p-2 text-red-300 hover:bg-red-50 hover:text-red-500"
                    title="Hapus tes"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <span className="inline-flex items-center gap-1 font-manrope font-semibold text-brand-navy text-sm">
                    Kelola <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {modal?.open && (
        <TestModal editing={modal.editing} busy={busy} onSave={saveTest} onClose={() => setModal(null)} />
      )}

      <WorkingOverlay
        show={busy}
        label={mCreate.isPending ? "Membuat tes…" : delBusy ? "Menghapus tes…" : "Menyimpan…"}
      />

      {del && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          data-testid="del-dialog"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-bold font-bricolage text-base text-brand-navy">Hapus "{del.name}"?</h3>

            {!delInfo ? (
              <p className="mt-3 flex items-center gap-2 font-manrope text-muted-foreground text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat ringkasan dampak…
              </p>
            ) : delInfo.protectedFamily ? (
              <>
                <p className="mt-2 rounded-lg bg-amber-50 p-3 font-manrope text-amber-800 text-xs">
                  Tes ini bagian dari <b>{delInfo.assessment?.family === "minat" ? "Tes Minat" : "Tes Bakat"}</b> resmi,
                  jadi tidak bisa dihapus dari sini. Nonaktifkan rilisnya lewat versi lain bila perlu.
                </p>
                <div className="mt-5 flex justify-end">
                  <Button variant="outline" onClick={() => setDel(null)}>
                    Mengerti
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Langkah 1 — ringkasan dampak */}
                <div
                  className="mt-2 rounded-lg bg-red-50/70 p-3 font-manrope text-red-800 text-xs"
                  data-testid="del-impact"
                >
                  Yang akan terhapus permanen: <b>{delInfo.counts?.versions ?? 0} versi</b>
                  {delInfo.counts?.liveVersions ? ` (${delInfo.counts.liveVersions} live)` : ""} ·{" "}
                  <b>{delInfo.counts?.questions ?? 0} soal</b> · <b>{delInfo.counts?.sessions ?? 0} sesi/hasil</b>.
                  Tindakan ini <b>tidak bisa dibatalkan</b>.
                </div>

                {/* Langkah 2 — wajib backup */}
                <div className="mt-3 rounded-lg border border-gray-200 p-3">
                  <p className="font-manrope font-semibold text-gray-700 text-xs">Langkah 1 dari 2 — unduh backup</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="del-backup"
                      disabled={delBusy}
                      onClick={() => void unduhBackup()}
                      className="rounded-lg text-xs"
                    >
                      ⬇ Unduh backup JSON
                    </Button>
                    {backupDone && (
                      <span className="font-manrope font-semibold text-teal-600 text-xs" data-testid="del-backup-done">
                        Backup terunduh ✓
                      </span>
                    )}
                  </div>
                </div>

                {/* Langkah 3 — ketik kode tes */}
                <div className="mt-3 rounded-lg border border-gray-200 p-3">
                  <p className="font-manrope font-semibold text-gray-700 text-xs">
                    Langkah 2 dari 2 — ketik kode tes <code className="rounded bg-gray-100 px-1">{del.code}</code> untuk
                    mengaktifkan tombol hapus
                  </p>
                  <Input
                    data-testid="del-code"
                    value={delCode}
                    onChange={(e) => setDelCode(e.target.value)}
                    placeholder={del.code}
                    disabled={!backupDone || delBusy}
                    className="mt-1.5 rounded-lg uppercase"
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDel(null)} disabled={delBusy}>
                    Batal
                  </Button>
                  <Button
                    data-testid="del-confirm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => void hapusPermanen()}
                    disabled={
                      !backupDone || delBusy || delCode.trim().toUpperCase() !== String(del.code ?? "").toUpperCase()
                    }
                  >
                    {delBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}{" "}
                    Hapus permanen
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkingOverlay({ show, label }: { show: boolean; label: string }) {
  if (!show) return null;
  return (
    <div className="fixed right-5 bottom-5 z-[95] flex items-center gap-2 rounded-full bg-brand-navy px-4 py-2.5 font-manrope font-semibold text-white text-xs shadow-2xl">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

function TestModal({
  editing,
  busy,
  onSave,
  onClose,
}: {
  editing?: SummaryItem;
  busy: boolean;
  onSave: (p: { code: string; name: string; description?: string; id?: string }) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState(editing?.code ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [desc, setDesc] = useState(editing?.description ?? "");
  const [family, setFamily] = useState<string>((editing as any)?.family ?? "");
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold font-bricolage text-base text-brand-navy">
            {editing ? "Ubah tes" : "Buat tes baru"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block font-manrope font-semibold text-foreground text-xs">
            Nama tes
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: MULAI Discover™ (Minat)"
            />
          </label>
          <label className="block font-manrope font-semibold text-foreground text-xs">
            Kode unik (tidak bisa diubah setelah dibuat)
            <Input
              className="mt-1 disabled:opacity-50"
              value={code}
              disabled={!!editing}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="cth: DISCOVER"
            />
          </label>
          <label className="block font-manrope font-semibold text-foreground text-xs">
            Deskripsi
            <Input
              className="mt-1"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Sekilas tentang tes ini"
            />
          </label>
          <label className="block font-manrope font-semibold text-foreground text-xs">
            Jenis (badge B2C)
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            >
              <option value="">Bebas (B2B / umum)</option>
              <option value="minat">Tes Minat — max 1 LIVE (B2C)</option>
              <option value="bakat">Tes Bakat — max 1 LIVE (B2C)</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button
            className="bg-brand-navy hover:bg-brand-navy-light"
            disabled={busy || !name.trim() || (!editing && !code.trim())}
            onClick={() =>
              onSave({
                id: editing?.id,
                code: code.trim(),
                name: name.trim(),
                description: desc.trim() || "",
                family: family || null,
              } as any)
            }
          >
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}
