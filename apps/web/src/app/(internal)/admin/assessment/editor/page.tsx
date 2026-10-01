"use client";

import { ArrowRight, Brain, Layers, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { client } from "@/lib/client";
import { notify } from "@/lib/toast";

interface Assessment { id: string; code: string; name: string; description?: string | null }
interface Version { id: string; versionNumber: number; status: string; publishedAt?: string | null }

/** Index Kelola Tes — daftar semua tes + CRUD (buat/ubah/hapus). */
export default function AssessmentEditorIndex() {
  const aClient = client as any;
  const [items, setItems] = useState<{ a: Assessment; v: Version[] }[] | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editing?: Assessment } | null>(null);
  const [del, setDel] = useState<Assessment | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      const data = await aClient.discoverAdmin.list();
      const rows: { a: Assessment; v: Version[] }[] = [];
      for (const a of data.assessments ?? []) {
        const v = await aClient.discoverAdmin.versions.list({ assessmentId: a.id });
        rows.push({ a, v: v.items ?? [] });
      }
      setItems(rows);
    } catch { setItems([]); }
  };
  useEffect(() => { void reload(); }, []);

  const saveTest = async (payload: { code: string; name: string; description?: string; id?: string }) => {
    setBusy(true);
    try {
      if (payload.id) await aClient.discoverAdmin.updateMeta({ id: payload.id, name: payload.name, description: payload.description ?? null });
      else await aClient.discoverAdmin.create({ code: payload.code, name: payload.name, description: payload.description ?? "" });
      notify.create("Tes disimpan ✅");
      setModal(null);
      await reload();
    } catch (e) { notify.error("Gagal", { description: (e as Error)?.message?.slice(0, 120) }); }
    finally { setBusy(false); }
  };

  const removeTest = async () => {
    if (!del) return;
    setBusy(true);
    try { await aClient.discoverAdmin.remove({ id: del.id }); notify.create("Tes dihapus"); setDel(null); await reload(); }
    catch (e) { notify.error("Gagal hapus", { description: (e as Error)?.message?.slice(0, 120) }); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-bold font-bricolage text-xl text-foreground">
            <Layers className="h-5 w-5 text-brand-navy" /> Kelola Tes
          </h1>
          <p className="font-manrope text-sm text-muted-foreground">Pilih tes untuk mengatur aturan, soal, dan menerbitkan.</p>
        </div>
        <Button className="bg-brand-navy hover:bg-brand-navy-light" onClick={() => setModal({ open: true })}>
          <Plus className="mr-1 h-4 w-4" /> Buat Tes
        </Button>
      </div>

      {items === null && <p className="font-manrope text-sm text-muted-foreground">Memuat tes…</p>}
      {items !== null && items.length === 0 && <Card><CardContent className="pt-5 font-manrope text-sm text-muted-foreground">Belum ada tes — klik <b>Buat Tes</b> untuk memulai.</CardContent></Card>}

      <div className="grid gap-3">
        {items?.map(({ a, v }) => {
          const live = v.find((x) => x.status === "live");
          const draft = v.find((x) => x.status === "draft");
          return (
            <Link key={a.id} href={`/admin/assessment/editor/${a.code}`} className="group block">
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-brand-orange/40 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy/10">
                    <Brain className="h-5 w-5 text-brand-navy" />
                  </span>
                  <div>
                    <p className="font-bold font-bricolage text-base text-foreground group-hover:text-brand-navy">{a.name}</p>
                    <p className="font-manrope text-xs text-muted-foreground">
                      {v.length} versi · {live ? <b className="text-teal-700">● main — aktif utk siswa</b> : "Belum dirilis"} {draft ? "· ada draf" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden gap-1 sm:flex">
                    {v.slice(0, 4).map((x) => (
                      <Badge key={x.id} className={x.status === "live" ? "border-teal-500/30 bg-teal-500/10 text-teal-700" : x.status === "draft" ? "border-amber-500/30 bg-amber-500/10 text-amber-700" : "border-gray-200 bg-gray-100 text-gray-500"}>
                        v{x.versionNumber}
                      </Badge>
                    ))}
                  </div>
                  <button onClick={(e) => { e.preventDefault(); setModal({ open: true, editing: a }); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Ubah nama/deskripsi"><Pencil className="h-4 w-4" /></button>
                  <button onClick={(e) => { e.preventDefault(); setDel(a); }} className="rounded-lg p-2 text-red-300 hover:bg-red-50 hover:text-red-500" title="Hapus tes"><Trash2 className="h-4 w-4" /></button>
                  <span className="inline-flex items-center gap-1 font-manrope text-sm font-semibold text-brand-navy">
                    Kelola <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Modal buat/ubah tes */}
      {modal?.open && <TestModal editing={modal.editing} busy={busy} onSave={saveTest} onClose={() => setModal(null)} />}

      {/* Modal konfirmasi hapus */}
      {del && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-bold font-bricolage text-base text-brand-navy">Hapus "{del.name}"?</h3>
            <p className="mt-1 font-manrope text-xs text-muted-foreground">
              Seluruh versi, soal, dan sesi akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDel(null)} disabled={busy}>Batal</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => void removeTest()} disabled={busy}>
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />} Hapus tes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TestModal({ editing, busy, onSave, onClose }: { editing?: Assessment; busy: boolean; onSave: (p: { code: string; name: string; description?: string; id?: string }) => void; onClose: () => void }) {
  const [code, setCode] = useState(editing?.code ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [desc, setDesc] = useState(editing?.description ?? "");
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold font-bricolage text-base text-brand-navy">{editing ? "Ubah tes" : "Buat tes baru"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block font-manrope text-xs font-semibold text-foreground">Nama tes
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: MULAI Discover™ (Minat)" />
          </label>
          <label className="block font-manrope text-xs font-semibold text-foreground">Kode unik (tidak bisa diubah setelah dibuat)
            <Input className="mt-1 disabled:opacity-50" value={code} disabled={!!editing} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="cth: DISCOVER" />
          </label>
          <label className="block font-manrope text-xs font-semibold text-foreground">Deskripsi
            <Input className="mt-1" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Sekilas tentang tes ini" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
          <Button className="bg-brand-navy hover:bg-brand-navy-light" disabled={busy || !name.trim() || (!editing && !code.trim())} onClick={() => onSave({ id: editing?.id, code: code.trim(), name: name.trim(), description: desc.trim() || "" })}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}