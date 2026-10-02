"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronUp, Copy, Eye, FilePlus2, FileUp, GitBranch, GripVertical, Loader2, Plus, Rocket, ShieldCheck, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/toast";
import { orpc } from "@/utils/orpc";

interface Ver { id: string; versionNumber: number; status: string; configJson?: any; publishedAt?: string | null }
interface Dim { id: string; code: string; name: string }
interface Qn { id: string; dimensionId: string; questionText: string; questionType: string; weight?: number; hasMathNotation?: boolean; displayOrder: number }
interface Content { questions: Qn[]; options: any[]; textConfigs: any[]; dimensions: Dim[]; scales: any[] }

/** Detail tes (TanStack Query) — aturan, soal, simulasi branch & rilis. */
export default function AssessmentDetailPage() {
  const code = (useParams().code as string) ?? "";
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<Record<string, any>>({});
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [branchOpen, setBranchOpen] = useState(false);
  const [verify, setVerify] = useState<{ vid: string } | null>(null);
  const [modal, setModal] = useState<{ open: boolean; q?: any } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dimCode, setDimCode] = useState("");
  const [dimName, setDimName] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [focusQ, setFocusQ] = useState<string | null>(null);
  const [focusDim, setFocusDim] = useState(false);
  const [hlQ, setHlQ] = useState<string | null>(null);
  const [hlDim, setHlDim] = useState(false);

  const summariesKey = orpc.discoverAdmin.summaries.key();
  const { data: sums } = useQuery(orpc.discoverAdmin.summaries.queryOptions());
  const assess = sums?.items?.find((x: any) => x.code === code);
  const vers: Ver[] = (assess?.versions ?? []) as Ver[];
  const live = vers.find((v) => v.status === "live") ?? null;
  const draft = vers.find((v) => v.status === "draft") ?? null;
  const selVer = vers.find((v) => v.id === selectedId) ?? draft ?? live;

  const canEdit = selVer?.status === "draft" && !!selVer;
  const versionId = selVer?.id ?? "";

  const contentKey = () => orpc.discoverAdmin.versions.contentList.key({ input: { versionId } });
  const gateKey = () => orpc.discoverAdmin.versions.validate.key({ input: { versionId: draft?.id ?? "" } });
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: summariesKey });
    if (versionId) void queryClient.invalidateQueries({ queryKey: contentKey() });
    if (draft) void queryClient.invalidateQueries({ queryKey: gateKey() });
  };

  const { data: content } = useQuery(
    orpc.discoverAdmin.versions.contentList.queryOptions({
      input: { versionId },
      enabled: !!selVer,
    }),
  );
  const { data: gate } = useQuery(
    orpc.discoverAdmin.versions.validate.queryOptions({
      input: { versionId: selVer?.status === "draft" ? selVer.id : (draft?.id ?? "") },
      enabled: !!selVer && selVer.status === "draft",
    }),
  );

  useEffect(() => { if (selVer) setRules(selVer.configJson ?? {}); }, [selVer?.id]);

  const mMeta = useMutation(orpc.discoverAdmin.updateMeta.mutationOptions({
    onSuccess: () => { notify.create("Jenis badge diperbarui ✅"); void queryClient.invalidateQueries({ queryKey: summariesKey }); },
    onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
  }));
  const setFamily = (f: string) => {
    if (!assess) return;
    void mMeta.mutateAsync({ id: assess.id, name: assess.name, description: assess.description ?? null, family: (f as any) || null });
  };
  const mDraft = useMutation(orpc.discoverAdmin.versions.createDraft.mutationOptions({
    onSuccess: () => { notify.create("Mode ubah aktif", { description: "Perubahan otomatis tersimpan sebagai draf aman." }); void invalidate(); void queryClient.invalidateQueries({ queryKey: summariesKey }); },
    onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
  }));
  const mRules = useMutation(orpc.discoverAdmin.versions.configUpdate.mutationOptions({
    onSuccess: () => { notify.create("Aturan disimpan ✅"); void invalidate(); },
    onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
  }));
  const mSaveQ = useMutation(orpc.discoverAdmin.versions.contentSave.mutationOptions({
    onSuccess: () => { notify.create("Soal tersimpan ✅"); setModal(null); void invalidate(); },
    onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
  }));
  const mDelQ = useMutation(orpc.discoverAdmin.versions.contentDelete.mutationOptions({
    onSuccess: () => { void invalidate(); },
    onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
  }));
  const mDupQ = useMutation(orpc.discoverAdmin.versions.contentDuplicate.mutationOptions({
    onSuccess: () => { notify.create("Soal disalin"); void invalidate(); },
    onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
  }));
  const mReorder = useMutation(orpc.discoverAdmin.versions.contentReorder.mutationOptions({
    onSuccess: () => { void invalidate(); },
    onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
  }));
  const mImport = useMutation(orpc.discoverAdmin.versions.importQuestions.mutationOptions({
    onSuccess: () => { void invalidate(); void queryClient.invalidateQueries({ queryKey: summariesKey }); },
    onError: (e) => notify.error("Impor gagal", { description: e.message?.slice(0, 160) }),
  }));
  const mDimsAdd = useMutation(orpc.discoverAdmin.versions.dimsAdd.mutationOptions({
    onSuccess: () => { notify.create("Dimensi ditambahkan ✅"); setDimCode(""); setDimName(""); void invalidate(); void queryClient.invalidateQueries({ queryKey: summariesKey }); },
    onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
  }));
  const mDimsDel = useMutation(orpc.discoverAdmin.versions.dimsDelete.mutationOptions({
    onSuccess: () => { void invalidate(); void queryClient.invalidateQueries({ queryKey: summariesKey }); },
    onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
  }));
  const mPub = useMutation(orpc.discoverAdmin.versions.publish.mutationOptions({
    onSuccess: () => { notify.create("Versi dijadikan rilis 🎉", { description: "Siswa kini menerima versi ini." }); setVerify(null); setSelectedId(null); void invalidate(); void queryClient.invalidateQueries({ queryKey: summariesKey }); },
    onError: (e) => notify.error("Gagal", { description: e.message?.slice(0, 120) }),
  }));

  useEffect(() => {
    if (focusQ) {
      const el = document.getElementById("q-" + focusQ);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHlQ(focusQ);
      const t = setTimeout(() => setHlQ(null), 2000);
      return () => clearTimeout(t);
    }
  }, [focusQ]);
  useEffect(() => {
    if (focusDim) {
      const el = document.getElementById("aturan");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHlDim(true);
      const t = setTimeout(() => setHlDim(false), 2200);
      return () => clearTimeout(t);
    }
  }, [focusDim]);

  const questions = (content?.questions ?? []) as Qn[];
  const busyAny = mDraft.isPending || mRules.isPending || mSaveQ.isPending || mDelQ.isPending || mDupQ.isPending || mReorder.isPending || mDimsAdd.isPending || mDimsDel.isPending || mPub.isPending;
  const dims = (content?.dimensions ?? []) as Dim[];

  const startEdit = () => { if (draft) setSelectedId(draft.id); else void mDraft.mutateAsync({ code }); };
  const moveQ = useCallback((idx: number, dir: number) => {
    const j = idx + dir;
    if (j < 0 || j >= questions.length) return;
    const qs = [...questions];
    [qs[idx], qs[j]] = [qs[j]!, qs[idx]!];
    void mReorder.mutateAsync({ versionId, orderedIds: qs.map((q) => q.id) });
  }, [questions, versionId]);
  const dropQ = useCallback((from: number, to: number) => {
    if (from === to) return;
    const qs = [...questions];
    const [moved] = qs.splice(from, 1);
    qs.splice(to, 0, moved!);
    void mReorder.mutateAsync({ versionId, orderedIds: qs.map((q) => q.id) });
    setDragIdx(null);
  }, [questions, versionId]);
  const openEdit = (id: string) => {
    const q = questions.find((x) => x.id === id);
    if (!q) { setFocusQ(id); return; }
    setModal({ open: true, q: { ...q, opts: (content?.options ?? []).filter((o: any) => o.questionId === q.id), tc: (content?.textConfigs ?? []).find((t: any) => t.questionId === q.id) } });
    setTimeout(() => document.getElementById("q-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const delQ = (id: string) => void mDelQ.mutateAsync({ questionId: id });
  const dupQ = (id: string) => void mDupQ.mutateAsync({ questionId: id });

  if (!assess) return <div className="font-manrope text-sm text-muted-foreground">Tes tidak ditemukan.</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/assessment/editor" className="font-manrope text-xs font-semibold text-muted-foreground hover:text-brand-navy">← Semua Tes</Link>
          <h1 className="flex items-center gap-2 font-bold font-bricolage text-xl text-foreground">
            {assess.name}
            {(assess as any).family && <span className="rounded-full bg-gray-100 px-2 py-0.5 font-manrope text-[10px] font-semibold text-gray-500">{(assess as any).family === "minat" ? "Tes Minat · B2C" : "Tes Bakat · B2C"}</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {live && <a href="/assessment/talent?preview=1" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 font-manrope text-xs font-semibold text-gray-600 hover:bg-gray-50"><Eye className="h-3.5 w-3.5" /> Lihat sebagai siswa</a>}
          <Button disabled={!draft || (gate ? !gate.ok : false)} className={(gate && !gate.ok) || !draft ? "bg-gray-300 hover:bg-gray-300" : "bg-brand-orange hover:bg-brand-orange/90"} onClick={() => draft && setVerify({ vid: draft.id })}>
            <Rocket className="mr-1 h-4 w-4" /> Terbitkan
          </Button>
        </div>
      </div>

      {/* Branch selector ala GitHub */}
      <div className="relative">
        <button onClick={() => setBranchOpen(!branchOpen)} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-manrope text-xs font-semibold text-gray-700 hover:border-gray-300">
          <GitBranch className="h-4 w-4 text-gray-400" />
          <span>main</span>
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${branchOpen ? "rotate-180" : ""}`} />
          {live && <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-700">aktif utk siswa</span>}
        </button>
        {branchOpen && (
          <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-gray-50/70 px-3 py-2 font-manrope text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Versi tes — pilih mana yang dirilis utk siswa</div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {vers.map((v) => {
                const isLive = v.status === "live";
                const selected = selVer?.id === v.id;
                return (
                  <div key={v.id} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${selected ? "bg-teal-500/5" : ""}`}>
                    <button onClick={() => { setSelectedId(v.id); setBranchOpen(false); }} className="min-w-0 flex-1 text-left">
                      <p className="flex items-center gap-1.5 font-manrope text-xs font-semibold text-gray-800">
                        <GitBranch className="h-3.5 w-3.5 text-gray-400" /> v{v.versionNumber}
                        {isLive ? <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-700">● main · aktif utk siswa</span>
                          : v.status === "draft" ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">draf</span>
                          : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">lama</span>}
                        {v.publishedAt && !isLive && <span className="font-manrope text-[10px] text-gray-400">{new Date(v.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>}
                      </p>
                      <p className="truncate font-manrope text-[10px] text-muted-foreground">{v.versionNumber === 1 ? "Versi perdana" : `Pembaruan ke-${v.versionNumber}`}</p>
                    </button>
                    {!isLive && (
                      <button onClick={() => { setVerify({ vid: v.id }); setBranchOpen(false); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-navy px-2.5 py-1.5 font-manrope text-[10px] font-semibold text-white hover:bg-brand-navy-light">
                        <Rocket className="h-3 w-3" /> Verifikasi &amp; Rilis
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Aturan tes */}
      <div id="aturan" className={`rounded-2xl border bg-white transition-shadow ${hlDim ? "ring-2 ring-brand-orange/60 shadow-lg" : "border-gray-200"}`}>
        <button onClick={() => setRulesOpen(!rulesOpen)} className="flex w-full items-center justify-between px-5 py-3.5">
          <span className="font-bold font-bricolage text-sm text-brand-navy">Aturan tes</span>
          {rulesOpen ? <ChevronDown className="h-4 w-4 rotate-180 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {rulesOpen && (
          <div className="border-t border-gray-100 px-5 pb-5 pt-4">
            <div className="mb-3 rounded-xl bg-blue-50/60 p-3">
              <p className="font-manrope text-[11px] font-semibold text-blue-800">Apa yang dicek sistem sebelum versi bisa terbit ("verifikasi"):</p>
              <ul className="mt-1 grid gap-1 font-manrope text-[10px] text-blue-800/80 sm:grid-cols-2">
                <li>✓ Tes punya nama & kode</li>
                <li>✓ Dimensi aktif sesuai jumlah total</li>
                <li>✓ Setiap soal punya dimensi & skala jawaban</li>
                <li>✓ Pilihan ganda punya ≥2 opsi berlabel</li>
                <li>✓ Tiap dimensi memenuhi min. soal (atur di atas)</li>
                <li>✓ Urutan soal unik per dimensi (pakai ↑↓/drag bila bentrok)</li>
                <li>✓ Jumlah hasil (top-N) tidak lebih dari total dimensi</li>
              </ul>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
            <Rule label="Tampilkan hasil N kode teratas" hint="Berapa peringkat teratas yang ditampilkan ke siswa (cth 3 → S-I-A)." type="number" value={rules.result_dim_count ?? ""} onChange={(v) => setRules((r) => ({ ...r, result_dim_count: Number(v) }))} disabled={!canEdit} />
            <Rule label="Min. soal per dimensi" hint="Syarat jumlah soal per dimensi agar versi bisa dirilis." type="number" value={rules.min_q_per_dim ?? ""} onChange={(v) => setRules((r) => ({ ...r, min_q_per_dim: Number(v) }))} disabled={!canEdit} />
            <Rule label="Cara nilai" hint="Jumlah poin = skor dijumlah; Rata-rata = dibagi banyak soal; Bobot = dikali bobot soal." type="select" opts={[["sum", "Jumlah poin"], ["average", "Rata-rata"], ["weighted", "Bobot soal"]]} value={rules.scoring_method ?? "sum"} onChange={(v) => setRules((r) => ({ ...r, scoring_method: v }))} disabled={!canEdit} />
            <Rule label="Acak urutan soal" hint="Urutan soal diacak setiap siswa memulai." type="bool" value={rules.randomize_q === true} onChange={(v) => setRules((r) => ({ ...r, randomize_q: v }))} disabled={!canEdit} />
            <Rule label="Acak urutan pilihan" hint="Urutan opsi jawaban diacak per siswa." type="bool" value={rules.randomize_a === true} onChange={(v) => setRules((r) => ({ ...r, randomize_a: v }))} disabled={!canEdit} />
            <Rule label="Izinkan lanjut kemudian" hint="Siswa boleh berhenti & melanjutkan tes lain waktu." type="bool" value={rules.allow_pause === true} onChange={(v) => setRules((r) => ({ ...r, allow_pause: v }))} disabled={!canEdit} />
            <div className="md:col-span-3">
              {canEdit ? (
                <Button size="sm" variant="outline" onClick={() => void mRules.mutateAsync({ versionId, config: rules })} disabled={mRules.isPending}>
                  {mRules.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />} Simpan aturan
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={startEdit} disabled={mDraft.isPending}>{mDraft.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="mr-1 h-3.5 w-3.5" />} Ubah aturan</Button>
              )}
            </div>
            <div className="md:col-span-3">
              <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
                <span className="font-manrope text-xs font-semibold text-foreground">Jenis (badge B2C)</span>
                <select
                  disabled={!canEdit}
                  value={(assess as any).family ?? ""}
                  onChange={(e) => setFamily(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 font-manrope text-xs disabled:bg-gray-50"
                >
                  <option value="">Bebas (B2B / umum)</option>
                  <option value="minat">Tes Minat — max 1 LIVE (B2C)</option>
                  <option value="bakat">Tes Bakat — max 1 LIVE (B2C)</option>
                </select>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="flex items-center gap-1 font-manrope text-xs font-semibold text-foreground">
                  Dimensi ({dims.length}) {!canEdit && <span className="font-normal text-muted-foreground">· hanya baca</span>}
                  <span className="cursor-help rounded-full border border-gray-200 px-1 text-[9px] leading-4 text-gray-400" title="Dimensi = bagian tes (cth R/I/A/S/E/C utk minat). Siswa melihat soal per dimensi; hasil = peringkat antardimensi.">?</span>
                </p>
                <p className="font-manrope text-[10px] font-normal text-muted-foreground">Dimensi = bagian tes. Siswa melihat soal per dimensi; hasil = peringkat antardimensi.</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {dims.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 font-manrope text-[11px] font-semibold text-gray-700">
                      {d.name} ({d.code})
                      {canEdit && <button onClick={() => void mDimsDel.mutateAsync({ dimensionId: d.id })} className="text-red-300 hover:text-red-500" title="Hapus dimensi"><Trash2 className="h-3 w-3" /></button>}
                    </span>
                  ))}
                </div>
                {canEdit && (
                  <div className="mt-2 flex gap-2">
                    <Input className="w-24" placeholder="Kode" value={dimCode} onChange={(e) => setDimCode(e.target.value.toUpperCase().slice(0, 8))} />
                    <Input className="flex-1" placeholder="Nama dimensi (cth: Realistic)" value={dimName} onChange={(e) => setDimName(e.target.value)} />
                    <Button size="sm" className="shrink-0 bg-brand-navy hover:bg-brand-navy-light" disabled={!dimCode.trim() || !dimName.trim() || mDimsAdd.isPending} onClick={() => void mDimsAdd.mutateAsync({ versionId, code: dimCode.trim(), name: dimName.trim() })}>
                      {mDimsAdd.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />} Tambah
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Daftar soal */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <span className="font-bold font-bricolage text-sm text-brand-navy">
            Daftar soal <span className="ml-1 font-manrope text-[11px] font-normal text-muted-foreground">{questions.length} soal {canEdit ? "" : "· hanya baca"}</span>
          </span>
          {canEdit ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} title="Import banyak soal dari CSV/Excel"><FileUp className="mr-1 h-4 w-4" /> Import Soal</Button>
              <Button size="sm" className="bg-brand-orange hover:bg-brand-orange/90" onClick={() => setModal({ open: true })}><Plus className="mr-1 h-4 w-4" /> Tambah soal</Button>
            </div>
          ) : (
            <Button size="sm" className="bg-brand-navy hover:bg-brand-navy-light" onClick={startEdit} disabled={mDraft.isPending}>
              {mDraft.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Ubah soal
            </Button>
          )}
        </div>

        {modal?.open && selVer && content && (
          <div id="q-panel" className="border-b border-teal-100 bg-teal-50/20 px-4 py-4">
            <QuestionPanel q={modal.q} versionId={versionId} content={content} onDone={async (qid) => { const id = modal.q?.id; await mSaveQ.mutateAsync({ ...(id ? { id } : {}), versionId, questionData: qid as any }); setModal(null); }} onClose={() => setModal(null)} />
          </div>
        )}

        <div className="divide-y divide-gray-50 px-2 pb-2">
          {!canEdit && questions.length === 0 && <p className="px-3 py-6 text-center font-manrope text-sm text-muted-foreground">Belum ada soal di versi ini.</p>}
          {questions.map((q, i) => {
            const opts = (content?.options ?? []).filter((o: any) => o.questionId === q.id);
            const tc = (content?.textConfigs ?? []).find((t: any) => t.questionId === q.id);
            const dim = dims.find((d) => d.id === q.dimensionId);
            return (
              <div
                key={q.id}
                draggable={canEdit}
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => dragIdx !== null && canEdit && void dropQ(dragIdx, i)}
                onDragEnd={() => setDragIdx(null)}
                id={"q-" + q.id}
                className={`group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition-all ${dragIdx === i ? "opacity-40" : ""} ${hlQ === q.id ? "bg-brand-orange/10 ring-2 ring-brand-orange/60" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {canEdit && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" />}
                  <div className="min-w-0">
                    <p className="truncate font-manrope text-sm font-medium text-gray-800"><span className="mr-2 text-xs text-gray-400">{i + 1}.</span>{q.questionText}</p>
                    <p className="font-manrope text-[11px] text-muted-foreground">{dim?.name ?? "—"} · {q.questionType === "text_input" ? `Isian (${tc?.evaluationType ?? "?"})` : `${opts.length} pilihan`} · bobot {q.weight ?? 1} {q.hasMathNotation ? "· LaTeX" : ""}</p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                    <button title="Naik" onClick={() => moveQ(i, -1)} disabled={i === 0} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button title="Turun" onClick={() => moveQ(i, 1)} disabled={i === questions.length - 1} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button title="Salin soal" onClick={() => dupQ(q.id)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"><Copy className="h-4 w-4" /></button>
                    <button
                      onClick={() => setModal({ open: true, q: { ...q, opts: (content?.options ?? []).filter((o: any) => o.questionId === q.id), tc: (content?.textConfigs ?? []).find((t: any) => t.questionId === q.id) } })}
                      className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                    >✏️</button>
                    <button onClick={() => delQ(q.id)} className="rounded-md p-1.5 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status rilis */}
      {gate && !gate.ok && (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
          <p className="font-manrope text-sm font-semibold text-red-700">{(gate.errors ?? []).length} hal perlu diperbaiki sebelum terbit — klik untuk lompat:</p>
          <div className="mt-1.5 flex flex-col gap-1">
              {((gate.details?.length ? gate.details : (gate.errors ?? []).map((e: string) => {
                const qm = e.match(/Soal (?:\\|[a-z0-9]{8,24})/i);
                const qid = e.match(/Soal\s+([a-z0-9]{8,24})/i);
                if (qid) return { kind: "question" as const, id: qid[1]!, message: e };
                if (/Dimensi\s+\S/i.test(e) && /butuh minimal/i.test(e)) return { kind: "dimension" as const, message: e };
                return { kind: "config" as const, message: e };
              }))).map((d: any, i: number) => (
                <button
                  key={i}
                  onClick={() => { if (d.kind === "question" && d.id) openEdit(d.id); else if (d.kind === "dimension") { setRulesOpen(true); setFocusDim(true); } }}
                  className="flex items-start gap-2 rounded-lg bg-white/70 px-2 py-1.5 text-left font-manrope text-[11px] text-red-700/90 transition-all hover:bg-white hover:shadow-sm disabled:opacity-60"
                >
                  {d.kind === "question" ? "☰ " : d.kind === "dimension" ? "▦ " : "⚙ "}
                  <span className="underline decoration-dotted underline-offset-2">{d.message}</span>
                </button>
              ))}
              </div>
        </div>
      )}

      {gate?.ok && selVer?.status === "draft" && (
        <div key={selVer.id} className="flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
          <p className="font-manrope text-sm font-semibold text-teal-700">Siap terbit — tidak ada masalah. 🎉</p>
        </div>
      )}

      <WorkingOverlay show={busyAny} label={mSaveQ.isPending ? "Menyimpan soal…" : mPub.isPending ? "Menerbitkan…" : mDimsAdd.isPending ? "Menambah dimensi…" : mReorder.isPending ? "Menyimpan urutan…" : "Menyimpan…"} />

      {importOpen && canEdit && <ImportModal versionId={versionId} dims={dims} mImport={mImport} onDone={() => setImportOpen(false)} onClose={() => setImportOpen(false)} />}

      {verify && <ReleaseVerifyModal versionId={verify.vid} publish={mPub} onClose={() => setVerify(null)} />}
    </div>
  );
}

function WorkingOverlay({ show, label }: { show: boolean; label: string }) {
  if (!show) return null;
  return (
    <div className="fixed right-5 bottom-5 z-[95] flex items-center gap-2 rounded-full bg-brand-navy px-4 py-2.5 font-manrope text-xs font-semibold text-white shadow-2xl">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

function ReleaseVerifyModal({ versionId, publish, onClose }: { versionId: string; publish: any; onClose: () => void }) {
  const { data: checks, isPending } = useQuery(
    orpc.discoverAdmin.versions.validate.queryOptions({ input: { versionId } }),
  );
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold font-bricolage text-base text-brand-navy">
            <ShieldCheck className="h-5 w-5 text-teal-600" /> Verifikasi sebelum rilis
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 font-manrope text-xs text-muted-foreground">Versi ini akan menjadi rilis utk siswa. Periksa kelengkapan dulu — seperti merge branch di GitHub.</p>
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          {isPending ? (
            <p className="flex items-center gap-2 font-manrope text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menjalankan verifikasi…</p>
          ) : checks?.ok ? (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
              <p className="font-manrope text-xs font-semibold text-teal-700">Semua verifikasi lolos — versi siap dirilis.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {(checks?.errors ?? ["Ada masalah."]).map((e: string, i: number) => (
                <li key={i} className="flex items-start gap-2 font-manrope text-[11px] text-red-700"><X className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {e}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={publish.isPending}>Batal</Button>
          <Button className="bg-teal-600 hover:bg-teal-700" disabled={!checks?.ok || publish.isPending} onClick={() => void publish.mutateAsync({ versionId })}>
            {publish.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Rocket className="mr-1 h-4 w-4" />} Aktifkan &amp; Rilis
          </Button>
        </div>
        {!checks?.ok && !isPending && <p className="mt-2 text-center font-manrope text-[10px] text-muted-foreground">Perbaiki masalah di versi tersebut sebelum bisa dirilis.</p>}
      </div>
    </div>
  );
}

function ImportModal({ versionId, dims, mImport, onDone, onClose }: { versionId: string; dims: Dim[]; mImport: any; onDone: () => void; onClose: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created: number; failed: string[]; dimsCreated?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const cols = ["Teks", "Dimensi", "Tipe", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Opsi E", "Opsi F", "Kunci", "Bobot", "Kunci Isian", "Cara nilai", "Toleransi"];

  const downloadTemplate = async (asCsv: boolean) => {
    const XLSX: any = await import("xlsx");
    const sample = {
      Teks: "Kamu lebih suka bekerja dengan…", Dimensi: "R", Tipe: "pilihan",
      "Opsi A": "Data dan eksperimen ilmiah", "Opsi B": "Ide kreatif dan visual", "Opsi C": "", "Opsi D": "", "Opsi E": "", "Opsi F": "",
      Kunci: "A", Bobot: 1, "Kunci Isian": "", "Cara nilai": "", Toleransi: "",
    };
    const sample2 = {
      Teks: "Hitung 3/4 + 0", Dimensi: "NUM", Tipe: "isian", "Opsi A": "", "Opsi B": "", "Opsi C": "", "Opsi D": "", "Opsi E": "", "Opsi F": "",
      Kunci: "", Bobot: 1, "Kunci Isian": "0.75", "Cara nilai": "angka", Toleransi: "0.01",
    };
    const ws = XLSX.utils.aoa_to_sheet([cols, Object.values(sample), Object.values(sample2)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Soal");
    const data = asCsv ? XLSX.utils.sheet_to_csv(ws) : (XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer);
    const blob = new Blob([data], { type: asCsv ? "text/csv;charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = asCsv ? "template-soal.csv" : "template-soal.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (f: File) => {
    setFileName(f.name); setResult(null);
    const XLSX: any = await import("xlsx");
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]!];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];
    const mapType = (v: any) => { const t = String(v ?? "").toLowerCase(); if (t.includes("isian") || t.includes("text") || t.includes("ketik")) return "text_input"; if (t.includes("pilih") || t.includes("ganda") || t === "mc") return "multiple_choice"; return undefined; };
    const mapEval = (v: any) => { const t = String(v ?? "").toLowerCase(); if (!t) return "exact_match"; if (t.includes("kata") || t.includes("keyword")) return "keyword_match"; if (t.includes("pola") || t.includes("regex") || t.includes("pattern")) return "pattern_match"; if (t.includes("angka") || t.includes("numeric") || t.includes("toler")) return "numeric_tolerance"; if (t.includes("persis") || t.includes("exact")) return "exact_match"; return "exact_match"; };
    setRows(raw.map((r) => ({
      text: String(r["Teks"] ?? r["Soal"] ?? ""),
      dimension: String(r["Dimensi"] ?? ""),
      type: mapType(r["Tipe"]),
      options: ["A", "B", "C", "D", "E", "F"].map((l) => String(r["Opsi " + l] ?? r["Opsi" + l] ?? "")).filter((o) => o.trim().length > 0),
      key: String(r["Kunci"] ?? "A").toUpperCase().slice(0, 1),
      weight: Number(r["Bobot"]) || 1,
      answerKey: String(r["Kunci Isian"] ?? r["Jawaban"] ?? ""),
      evalType: mapEval(r["Cara nilai"]),
      numericTolerance: String(r["Toleransi"] ?? "0.01"),
    })).filter((r: any) => r.text.trim()));
  };

  const doImport = async () => {
    if (!rows?.length) return;
    setBusy(true);
    try {
      const r = (await mImport.mutateAsync({ versionId, rows })) as any;
      setResult({ created: r.created ?? 0, failed: r.failed ?? [] });
      notify.create(`Impor selesai — ${r.created ?? 0} soal ditambahkan`, { description: (r.failed ?? []).length ? `${r.failed.length} baris dilewati (lihat hasil).` : "Semua baris berhasil." });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold font-bricolage text-base text-brand-navy">Import Soal (CSV/Excel)</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 font-manrope text-xs text-muted-foreground">
          Kolom: Teks · Dimensi (kode/nama) · Tipe (pilihan/isian) · Opsi A–F · Kunci · Bobot · Kunci Isian · Cara nilai · Toleransi.
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void downloadTemplate(false)}>⬇ Unduh template .xlsx</Button>
          <Button size="sm" variant="outline" onClick={() => void downloadTemplate(true)}>⬇ Unduh template .csv</Button>
        </div>
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-4 py-6 font-manrope text-sm text-gray-600 hover:border-brand-orange/40 hover:bg-gray-50">
          <FileUp className="h-5 w-5 text-brand-navy" />
          {fileName || "Pilih file .csv / .xlsx / .xls"}
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />
        </label>

        {rows !== null && (
          <div className="mt-3">
            {(() => {
              const known = new Set<string>(dims.flatMap((d) => [d.code.toLowerCase(), d.name.toLowerCase()]));
              const unknown = [...new Set(rows.map((r: any) => String(r.dimension ?? "").trim().toLowerCase()).filter((v: string) => v && !known.has(v)))];
              return unknown.length > 0 ? (
                <p className="mb-1 rounded-lg bg-amber-50 px-2 py-1.5 font-manrope text-[10px] text-amber-700">
                  Dimensi <b>{unknown.length}</b> ini belum ada & akan <b>dibuat otomatis</b>: {unknown.join(", ")}
                </p>
              ) : null;
            })()}
          <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100">
            <table className="w-full text-left font-manrope text-[11px]">
              <thead className="sticky top-0 bg-gray-50 text-gray-500"><tr><th className="px-2 py-1">#</th><th className="px-2 py-1">Teks</th><th className="px-2 py-1">Dimensi</th><th className="px-2 py-1">Tipe</th><th className="px-2 py-1">Opsi</th></tr></thead>
              <tbody>
                {rows.slice(0, 50).map((r: any, i: number) => {
                    const tipe = r.type ?? "multiple_choice";
                    const mc = tipe === "multiple_choice";
                    const bad = mc ? (r.options.length < 2) : !r.answerKey.trim();
                    return (
                  <tr key={i} className={`border-t border-gray-50 ${bad ? "bg-red-50/50" : ""}`}>
                    <td className="px-2 py-1 text-gray-400">{i + 2}</td>
                    <td className="max-w-[200px] truncate px-2 py-1">{r.text}</td>
                    <td className="px-2 py-1">{r.dimension}</td>
                    <td className="px-2 py-1">{mc ? `pilihan · ${r.options.length} opsi` : `isian · ${r.answerKey.trim() || "tanpa kunci"}`}</td>
                    <td className="px-2 py-1">
                      {mc ? (r.options.length >= 2 ? `${r.options.length} opsi [kunci ${r.key}]` : <span className="text-red-600">min. 2 opsi!</span>) : (r.answerKey.trim() ? `exact "${r.answerKey}"` : <span className="text-amber-600">isi kunci setelah impor</span>)}
                    </td>
                  </tr>
                    );
                })}
              </tbody>
            </table>
            {rows.length > 50 && <p className="px-2 py-1 text-[10px] text-gray-400">… +{rows.length - 50} baris</p>}
          </div>
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/50 p-3">
            <p className="font-manrope text-xs font-semibold text-teal-700">{result.created} soal berhasil ditambahkan{result.dimsCreated?.length ? ` + ${result.dimsCreated.length} dimensi baru dibuat` : ""}.</p>
            {result.failed.length > 0 && <ul className="mt-1 max-h-28 overflow-y-auto font-manrope text-[10px] text-red-700">{(result.failed.slice(0, 10)).map((e, i) => <li key={i}>{e}</li>)}</ul>}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <p className="font-manrope text-[11px] text-muted-foreground">{rows ? `${rows.length} baris terbaca` : ""}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>Tutup</Button>
            <Button className="bg-brand-navy hover:bg-brand-navy-light" disabled={!rows?.length || busy || mImport.isPending} onClick={() => void doImport()}>
              {busy || mImport.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileUp className="mr-1 h-4 w-4" />} Impor {rows?.length ?? 0} soal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Rule({ label, hint, type, opts, value, onChange, disabled }: { label: string; hint?: string; type: "number" | "bool" | "select"; opts?: [string, string][]; value: any; onChange: (v: any) => void; disabled: boolean }) {
  return (
    <label className={`block font-manrope text-xs font-semibold text-foreground ${disabled ? "opacity-60" : ""}`}>
      <span className="flex items-center gap-1">
        {label}
        {hint && <span className="cursor-help rounded-full border border-gray-200 px-1 text-[9px] leading-4 text-gray-400" title={hint}>?</span>}
      </span>
      {hint && <span className="block pb-1 font-manrope text-[10px] font-normal text-muted-foreground">{hint}</span>}
      {type === "number" && <Input type="number" className="mt-1" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />}
      {type === "bool" && (
        <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm disabled:bg-gray-50" disabled={disabled} value={value ? "1" : "0"} onChange={(e) => onChange(e.target.value === "1")}>
          <option value="1">Ya</option><option value="0">Tidak</option>
        </select>
      )}
      {type === "select" && (
        <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm disabled:bg-gray-50" disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}>
          {(opts ?? []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
    </label>
  );
}

function QuestionPanel({ q, versionId, content, onDone, onClose }: { q?: any; versionId: string; content: Content; onDone: (payload: any) => void; onClose: () => void }) {
  const dims0 = content.dimensions ?? [];
  const [form, setForm] = useState<any>({
    id: q?.id, dimensionId: q?.dimensionId ?? content.dimensions[0]?.id ?? "", questionText: q?.questionText ?? "",
    questionType: q?.questionType ?? "multiple_choice", weight: q?.weight ?? 1,
    options: (q?.opts?.length ?? 0) > 0 ? q.opts.map((o: any) => ({ id: o.id, optionValue: o.optionValue, label: o.label, score: o.score })) : [{ optionValue: "A", label: "", score: 1 }, { optionValue: "B", label: "", score: 0 }],
    textEval: { evaluationType: "numeric_tolerance", answerKey: "", numericTolerance: "0.01" },
  });
  const [busy, setBusy] = useState(false);
  const patch = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const patchOpt = (i: number, k: string, v: any) => setForm((f: any) => { const o = [...f.options]; o[i] = { ...o[i], [k]: v }; return { ...f, options: o }; });

  const issue =
    !form.questionText.trim() ? "Teks soal wajib diisi"
    : dims0.length === 0 ? "Belum ada dimensi — tambahkan di 'Aturan tes'."
    : !form.dimensionId ? "Pilih dimensi untuk soal ini."
    : form.questionType === "multiple_choice" && form.options.filter((o: any) => String(o.label || "").trim()).length < 2 ? "Pilih ganda butuh minimal 2 opsi berlabel."
    : "";
  const [formErr, setFormErr] = useState<string[]>([]);
  const save = async () => {
    if (issue) { notify.error(issue); return; }
    setBusy(true);
    setFormErr([]);
    try {
      await onDone({
        id: form.id, dimensionId: form.dimensionId, scaleId: null, questionText: form.questionText,
        questionType: form.questionType, hasMathNotation: false, mediaUrl: null, mediaCaption: null,
        weight: Number(form.weight) || 1, displayOrder: q?.displayOrder ?? 0, isActive: true,
        options: form.questionType === "multiple_choice" ? form.options.filter((o: any) => String(o.label || "").trim()).map((o: any, i: number) => ({ id: o.id, optionValue: o.optionValue || "ABCDEF"[i], label: o.label, score: o.score, targetDimension: form.dimensionId, displayOrder: i })) : [],
        textEval: form.questionType === "text_input" && form.textEval.answerKey ? form.textEval : null,
      });
    } catch (e: any) {
      const msg = e?.message ?? e?.data?.message ?? "Gagal menyimpan soal.";
      const issues: string[] = (e?.data?.issues ?? []).map((x: any) => `Field "${(x.path ?? []).join(".")}" — ${x.message}`);
      setFormErr([msg, ...issues.slice(0, 4)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-bold font-bricolage text-base text-brand-navy">{form.id ? "Ubah soal" : "Tambah soal"} <span className="ml-1 rounded-md bg-teal-500/10 px-2 py-0.5 font-manrope text-[10px] font-semibold text-teal-700">preview live di samping</span></h3>
        <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block font-manrope text-xs font-semibold text-foreground">Teks soal
            <Input className="mt-1" value={form.questionText} onChange={(e) => patch("questionText", e.target.value)} placeholder="cth: Kamu lebih suka bekerja dengan…" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block font-manrope text-xs font-semibold text-foreground">Dimensi
              <select className={"mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm " + (dims0.length === 0 ? "bg-gray-50 text-gray-400" : "")} value={form.dimensionId} onChange={(e) => patch("dimensionId", e.target.value)}>
                {dims0.length === 0 && <option value="">— belum ada dimensi —</option>}
                {dims0.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="block font-manrope text-xs font-semibold text-foreground">Jenis jawaban
              <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm" value={form.questionType} onChange={(e) => patch("questionType", e.target.value)}>
                <option value="multiple_choice">Pilihan ganda</option><option value="text_input">Mengetik jawaban</option>
              </select>
            </label>
          </div>
          {form.questionType === "multiple_choice" ? (
            <div className="space-y-2">
              <p className="font-manrope text-xs font-semibold text-foreground">Pilihan (pilihan mendapat 1 poin utk dimensi; sisanya 0)</p>
              {form.options.map((o: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input className="flex-1" placeholder={`Pilihan ${["A", "B", "C", "D", "E", "F"][i]}`} value={o.label} onChange={(e) => patchOpt(i, "label", e.target.value)} />
                  <Input type="number" className="w-20" value={o.score} onChange={(e) => patchOpt(i, "score", Number(e.target.value))} />
                  {form.options.length > 2 && <button onClick={() => patch("options", form.options.filter((_: any, x: number) => x !== i))} className="text-red-400"><Trash2 className="h-4 w-4" /></button>}
                </div>
              ))}
              {form.options.length < 6 && <Button size="sm" variant="outline" onClick={() => patch("options", [...form.options, { optionValue: "ABCDEF"[form.options.length], label: "", score: 0 }])}><Plus className="mr-1 h-3.5 w-3.5" /> Tambah pilihan</Button>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="block font-manrope text-xs font-semibold text-foreground">Jawaban benar (angka/persis)
                <Input className="mt-1" value={form.textEval.answerKey} onChange={(e) => patch("textEval", { ...form.textEval, answerKey: e.target.value })} placeholder="cth: 0.75 atau 3/4" />
              </label>
              <label className="block font-manrope text-xs font-semibold text-foreground">Toleransi angka
                <Input className="mt-1" value={form.textEval.numericTolerance} onChange={(e) => patch("textEval", { ...form.textEval, numericTolerance: e.target.value })} placeholder="0.01" />
              </label>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
          <p className="font-manrope text-[10px] font-semibold uppercase tracking-wide text-teal-600">Tampilan siswa</p>
          <p className="mt-2 font-manrope text-[10px] text-gray-400">{content.dimensions.find((d) => d.id === form.dimensionId)?.name ?? "Dimensi"}</p>
          <h4 className="mt-1 font-bold font-bricolage text-sm text-gray-900 leading-snug">{form.questionText || "Teks soal…"}</h4>
          {form.questionType === "multiple_choice" ? (
            <div className="mt-2 space-y-1.5">
              {form.options.filter((o: any) => String(o.label || "").trim()).map((o: any, i: number) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg border p-2.5 ${i === 0 ? "border-teal-500/60 bg-teal-500/5" : "border-gray-200 bg-white"}`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold ${i === 0 ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"}`}>{o.optionValue || ["A", "B", "C", "D", "E", "F"][i]}</span>
                  <span className="font-manrope text-xs text-gray-700">{o.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2">
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-manrope text-xs text-gray-400">Jawaban siswa di sini…</div>
              {form.textEval.answerKey && <p className="mt-1.5 font-manrope text-[10px] text-gray-400">Kunci: {form.textEval.answerKey} (toleransi {form.textEval.numericTolerance || "0.01"})</p>}
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
        {issue && <p className="mr-auto self-center font-manrope text-[11px] font-medium text-red-600">{issue}</p>}
        <Button className="bg-brand-navy hover:bg-brand-navy-light" onClick={save} disabled={busy || !!issue}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-1 h-4 w-4" />} Simpan soal
        </Button>
      </div>
    </div>
  );
}