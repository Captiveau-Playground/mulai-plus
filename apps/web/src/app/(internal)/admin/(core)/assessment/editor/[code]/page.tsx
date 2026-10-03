"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronUp, Copy, Eye, FilePlus2, FileUp, GitBranch, GripVertical, Loader2, Plus, Rocket, ShieldCheck, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/toast";
import { orpc, client } from "@/utils/orpc";
import "katex/dist/katex.min.css";

interface Ver { id: string; versionNumber: number; status: string; configJson?: any; publishedAt?: string | null }
interface Dim { id: string; code: string; name: string }
interface Qn { id: string; dimensionId: string; questionText: string; questionType: string; weight?: number; hasMathNotation?: boolean; displayOrder: number }
interface Content { questions: Qn[]; options: any[]; textConfigs: any[]; dimensions: Dim[]; scales: any[] }

/** Detail tes (TanStack Query) — aturan, soal, simulasi branch & rilis. */
export default function AssessmentDetailPage() {
  const code = (useParams().code as string) ?? "";
  const queryClient = useQueryClient();
  const rawClient = client as any;
  const [rules, setRules] = useState<Record<string, any>>({});
  const [rulesOpen, setRulesOpen] = useState(true);
  // Ingat versi yg sedang diedit (refresh tidak pindah versi → data gambar yg tersimpan tetap tampil)
  const [selectedId, setSelectedId] = useState<string | null>(() => typeof window !== "undefined" ? localStorage.getItem("assess-editor-ver") : null);
  const pickVer = (id: string | null) => { setSelectedId(id); try { if (id) localStorage.setItem("assess-editor-ver", id); else localStorage.removeItem("assess-editor-ver"); } catch { /* abaikan */ } };
  const [branchOpen, setBranchOpen] = useState(false);
  const [verify, setVerify] = useState<{ vid: string } | null>(null);
  const [modal, setModal] = useState<{ open: boolean; q?: any } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dimCode, setDimCode] = useState("");
  const [dimName, setDimName] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [gal, setGal] = useState<{ open: boolean; cb: (u: string) => void; kind: "question" | "option" } | null>(null);
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
    if (versionId) void queryClient.invalidateQueries({ queryKey: cfgKey });
    if (draft) void queryClient.invalidateQueries({ queryKey: gateKey() });
  };

  const { data: content } = useQuery(
    orpc.discoverAdmin.versions.contentList.queryOptions({
      input: { versionId },
      enabled: !!selVer,
    }),
  );
  const cfgKey = ["assess-cfg", versionId];
  const { data: cfgV } = useQuery({
    queryKey: cfgKey,
    queryFn: () => rawClient.discover.config({ versionId }),
    enabled: !!versionId,
  });
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
  const mSecSave = useMutation({ mutationFn: (i: any) => rawClient.discoverAdmin.versions.sectionSave(i), onSuccess: () => { void invalidate(); notify.create("Pengantar disimpan ✅"); }, onError: (e: any) => notify.error("Gagal", { description: e?.message?.slice(0, 120) }) });
  const mSecDel = useMutation({ mutationFn: (i: any) => rawClient.discoverAdmin.versions.sectionDelete(i), onSuccess: () => { void invalidate(); }, onError: (e: any) => notify.error("Gagal", { description: e?.message?.slice(0, 120) }) });
  const mInstr = useMutation({ mutationFn: (i: any) => rawClient.discoverAdmin.versions.instrSave(i), onSuccess: () => { notify.create("Instruksi disimpan ✅"); void invalidate(); }, onError: (e: any) => notify.error("Gagal", { description: e?.message?.slice(0, 120) }) });
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
    onSuccess: () => { notify.create("Versi dijadikan rilis 🎉", { description: "Siswa kini menerima versi ini." }); setVerify(null); pickVer(null); void invalidate(); void queryClient.invalidateQueries({ queryKey: summariesKey }); },
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

  const startEdit = () => { if (draft) pickVer(draft.id); else void mDraft.mutateAsync({ code }); };
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/assessment/editor" className="font-manrope text-xs font-semibold text-muted-foreground hover:text-brand-navy">← Semua Tes</Link>
          <h1 className="flex flex-wrap items-center gap-2 font-bold font-bricolage text-xl text-foreground">
            {assess.name}
            {(assess as any).family && <span className="rounded-full bg-gray-100 px-2 py-0.5 font-manrope text-[10px] font-semibold text-gray-500">{(assess as any).family === "minat" ? "Tes Minat · B2C" : "Tes Bakat · B2C"}</span>}

          </h1>
        </div>
        <div className="flex items-center gap-2">
          {live && <a href={`/assessment/talent?preview=1&code=${code}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 font-manrope text-xs font-semibold text-gray-600 hover:bg-gray-50"><Eye className="h-3.5 w-3.5" /> Lihat sebagai siswa</a>}
          <Button disabled={!draft || (gate ? !gate.ok : false)} className={(gate && !gate.ok) || !draft ? "bg-gray-300 hover:bg-gray-300" : "bg-brand-orange hover:bg-brand-orange/90"} onClick={() => draft && setVerify({ vid: draft.id })}>
            <Rocket className="mr-1 h-4 w-4" /> Terbitkan
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-5">
      {/* Aturan tes */}
      <div id="aturan" className={`rounded-2xl border bg-white transition-shadow lg:order-2 lg:col-span-2 lg:sticky lg:top-20 lg:self-start ${hlDim ? "ring-2 ring-brand-orange/60 shadow-lg" : "border-gray-200"}`}>
        <button onClick={() => setRulesOpen(!rulesOpen)} className="flex w-full items-center justify-between px-5 py-3.5">
          <span className="font-bold font-bricolage text-sm text-brand-navy">Aturan tes</span>
          {rulesOpen ? <ChevronDown className="h-4 w-4 rotate-180 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {rulesOpen && (
          <div className="border-t border-gray-100 px-5 pb-5 pt-4">
            {/* Rilis & Versi */}
            <div className="mb-2">
              <p className="flex items-center gap-1 font-manrope text-xs font-semibold text-foreground">
                Rilis &amp; Versi
                <span className="cursor-help rounded-full border border-gray-200 px-1 text-[9px] leading-4 text-gray-400" title="main = versi yang dipakai siswa sekarang. Pilih versi lain utk melihat isinya; 'Verifikasi & Rilis' utk mengganti rilis (maks 1 LIVE per jenis B2C).">?</span>
              </p>
              <div className="mt-1.5 space-y-1.5">
                {vers.map((v) => {
                  const isLive = v.status === "live";
                  const selected = selVer?.id === v.id;
                  return (
                    <div key={v.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${selected ? "border-teal-500/40 bg-teal-500/5" : "border-gray-100 bg-gray-50/50"}`}>
                      <button onClick={() => { pickVer(v.id); }} className="min-w-0 flex-1 text-left" title="Lihat isi versi ini">
                        <p className="font-manrope text-[11px] font-semibold text-gray-800">
                          v{v.versionNumber} {v.versionNumber === 1 ? "" : `· ${v.versionNumber === vers.length ? "terbaru" : ""}`}
                          {isLive ? <span className="ml-1 rounded-full bg-teal-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-teal-700">● main · aktif utk siswa</span>
                            : v.status === "draft" ? <span className="ml-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">draf</span>
                            : <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">lama</span>}
                        </p>
                      </button>
                      {!isLive && (
                        <>
                          <a href={`/assessment/talent?preview=1&v=${v.id}`} target="_blank" title="Simulasi siswa versi ini" className="shrink-0 rounded-md border border-gray-200 px-2 py-1 font-manrope text-[9px] font-semibold text-gray-500 hover:bg-gray-50">👁</a>
                          <button onClick={() => { setVerify({ vid: v.id }); }} className="shrink-0 rounded-md bg-brand-navy px-2 py-1 font-manrope text-[9px] font-semibold text-white hover:bg-brand-navy-light">
                            {v.status === "draft" ? "Verifikasi & Rilis" : "Rilis kembali"}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Jenis B2C */}
            <div className="mb-2 flex items-center gap-3 border-t border-gray-100 pt-2">
              <span className="font-manrope text-xs font-semibold text-foreground">Jenis (B2C/B2B)</span>
              <select
                value={(assess as any).family ?? ""}
                onChange={(e) => setFamily(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 font-manrope text-[11px] outline-none focus:border-brand-orange/50"
              >
                <option value="">Bebas (B2B / umum)</option>
                <option value="minat">Tes Minat — max 1 LIVE (B2C)</option>
                <option value="bakat">Tes Bakat — max 1 LIVE (B2C)</option>
              </select>
            </div>

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
            <div className="grid gap-3">
            <Rule label="Tampilkan hasil N kode teratas" hint="Berapa peringkat teratas yang ditampilkan ke siswa (cth 3 → S-I-A)." type="number" value={rules.result_dim_count ?? ""} onChange={(v) => setRules((r) => ({ ...r, result_dim_count: Number(v) }))} disabled={!canEdit} />
            <Rule label="Min. soal per dimensi" hint="Syarat jumlah soal per dimensi agar versi bisa dirilis." type="number" value={rules.min_q_per_dim ?? ""} onChange={(v) => setRules((r) => ({ ...r, min_q_per_dim: Number(v) }))} disabled={!canEdit} />
            <Rule label="Cara nilai" hint="Jumlah poin = skor dijumlah; Rata-rata = dibagi banyak soal; Bobot = dikali bobot soal." type="select" opts={[["sum", "Jumlah poin"], ["average", "Rata-rata"], ["weighted", "Bobot soal"]]} value={rules.scoring_method ?? "sum"} onChange={(v) => setRules((r) => ({ ...r, scoring_method: v }))} disabled={!canEdit} />
            <Rule label="Acak urutan soal" hint="Urutan soal diacak setiap siswa memulai." type="bool" value={rules.randomize_q === true} onChange={(v) => setRules((r) => ({ ...r, randomize_q: v }))} disabled={!canEdit} />
            <Rule label="Acak urutan pilihan" hint="Urutan opsi jawaban diacak per siswa." type="bool" value={rules.randomize_a === true} onChange={(v) => setRules((r) => ({ ...r, randomize_a: v }))} disabled={!canEdit} />
            <Rule label="Izinkan lanjut kemudian" hint="Siswa boleh berhenti & melanjutkan tes lain waktu." type="bool" value={rules.allow_pause === true} onChange={(v) => setRules((r) => ({ ...r, allow_pause: v }))} disabled={!canEdit} />
            <Rule label="Pembagian bagian soal" hint="Pecah alur tes jadi beberapa bagian dgn checkpoint XP antar bagian." type="select" opts={[["none", "Satu bagian (lurus)"], ["by_dimension", "Per dimensi"], ["chunk:10", "Per 10 soal"], ["chunk:20", "Per 20 soal"]]} value={rules.section_mode ?? "none"} onChange={(v) => setRules((r) => ({ ...r, section_mode: v }))} disabled={!canEdit} />
          <Rule label="Pembobotan bagian" hint="Cara tiap bagian memberi poin." type="select" opts={[["free_text", "Bobot bebas: bobot tiap pilihan diisi manual di form soal (pilihan menang = poin ke dimensinya, sisanya 0)"], ["likert", "Linear scale (skala Likert): poin naik linier per pilihan"]]} value={rules.scoring_mode ?? "free_text"} onChange={(v) => setRules((r) => ({ ...r, scoring_mode: v }))} disabled={!canEdit} />
          {rules.scoring_mode === "likert" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block font-manrope text-xs font-semibold text-foreground">Skala minimal
                <Input type="number" className="mt-1" value={rules.likert_min ?? 1} onChange={(e) => setRules((r) => ({ ...r, likert_min: Number(e.target.value) }))} disabled={!canEdit} />
              </label>
              <label className="block font-manrope text-xs font-semibold text-foreground">Skala maksimal
                <Input type="number" className="mt-1" value={rules.likert_max ?? 5} onChange={(e) => setRules((r) => ({ ...r, likert_max: Number(e.target.value) }))} disabled={!canEdit} />
              </label>
            </div>
          )}
            <Rule label="Bahasa antarmuka" hint="Bahasa tombol & label yang dilihat siswa." type="select" opts={[["id", "Indonesia"], ["en", "English"]]} value={rules.lang ?? "id"} onChange={(v) => setRules((r) => ({ ...r, lang: v }))} disabled={!canEdit} />
            <div className="">
              {canEdit ? (
                <Button size="sm" variant="outline" onClick={() => void mRules.mutateAsync({ versionId, config: rules })} disabled={mRules.isPending}>
                  {mRules.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />} Simpan aturan
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={startEdit} disabled={mDraft.isPending}>{mDraft.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="mr-1 h-3.5 w-3.5" />} Ubah aturan</Button>
              )}
            </div>
            <div className="">
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
                {canEdit && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="flex items-center gap-1 font-manrope text-xs font-semibold text-foreground">
                      Pengantar &amp; Instruksi
                      <span className="cursor-help rounded-full border border-gray-200 px-1 text-[9px] leading-4 text-gray-400" title="Sections = halaman pengantar sebelum tes dimulai. Instruksi = petunjuk singkat sebelum soal dimensi dimulai.">?</span>
                    </p>
                    <p className="font-manrope text-[10px] font-normal text-muted-foreground">Editable saat draf. Instruksi per dimensi tampil sebelum bagiannya.</p>
                    <div className="mt-2 space-y-2">
                      {((cfgV as any)?.sections ?? []).map((sc: any, i: number) => (
                        <div key={sc.id ?? i} className="rounded-lg border border-gray-100 bg-gray-50/50 p-2">
                          <div className="flex gap-1.5">
                            <DebouncedInput idKey={sc.id ?? "s" + i} className="flex-1 text-xs" placeholder="Judul pengantar" value={sc.title} onCommit={(v) => { sc.title = v; void mSecSave.mutateAsync({ versionId, id: sc.id, title: v, contentType: sc.contentType ?? "description", contentJson: sc.contentJson ?? { text: sc.title ?? "" }, displayOrder: sc.displayOrder, visibility: sc.visibility }); }} />
                            <select className="rounded-lg border border-gray-200 px-2 py-1 font-manrope text-[10px]" value={sc.contentType} onChange={(e) => { const ct = e.target.value as any; sc.contentType = ct; void mSecSave.mutateAsync({ versionId, id: sc.id, title: sc.title ?? "", contentType: ct, contentJson: sc.contentJson ?? { text: "" }, displayOrder: sc.displayOrder, visibility: sc.visibility }); }}>
                              <option value="description">Deskripsi</option><option value="bullet_list">Poin</option><option value="cards">Kartu</option>
                            </select>
                            <Button size="sm" variant="outline" className="!px-2 !py-0.5 text-[10px]" onClick={() => void mSecSave.mutateAsync({ versionId, id: sc.id, title: sc.title, contentType: sc.contentType, contentJson: sc.contentJson, displayOrder: sc.displayOrder, visibility: sc.visibility })}>Simpan</Button>
                            <button onClick={() => void mSecDel.mutateAsync({ id: sc.id })} className="text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                          <DebouncedInput idKey={(sc.id ?? "s" + i) + "-c"} className="mt-1.5 w-full text-xs" placeholder="Isi (deskripsi / satu poin per baris)" value={(sc.contentJson?.text ?? "") || (sc.contentJson?.items ?? []).join(" | ")} onCommit={(v) => { sc.contentJson = sc.contentType === "description" ? { text: v } : { items: v.split("\n") }; void mSecSave.mutateAsync({ versionId, id: sc.id, title: sc.title ?? "", contentType: sc.contentType ?? "description", contentJson: sc.contentJson, displayOrder: sc.displayOrder, visibility: sc.visibility }); }} />
                        </div>
                      ))}
                      <Button size="sm" variant="outline" onClick={() => void mSecSave.mutateAsync({ versionId, title: "Pengantar baru", contentType: "description", contentJson: { text: "Tulis…" } })}><Plus className="mr-1 h-3.5 w-3.5" /> Tambah pengantar</Button>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {dims.map((d) => {
                        const ins = ((cfgV as any)?.instructions ?? []).find((x: any) => x.dimensionId === d.id);
                        return (
                          <div key={d.id} className="grid grid-cols-1 gap-1 rounded-lg border border-gray-100 bg-white p-2">
                            <p className="font-manrope text-[10px] font-semibold text-gray-600">Instruksi · {d.name}</p>
                            <DebouncedInput idKey={ins?.id ?? d.id} className="text-xs" placeholder="Judul instruksi (cth: Bagian {d.name})" value={ins?.header ?? ""} onCommit={(v) => { void mInstr.mutateAsync({ dimensionId: d.id, id: ins?.id, header: v || d.name, contentType: ins?.contentType ?? "bullet_list", contentJson: ins?.contentJson ?? { items: [] } }); }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Daftar soal */}
      <div className="lg:order-1 lg:col-span-3 rounded-2xl border border-gray-200 bg-white lg:self-start">
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
            <QuestionPanel q={modal.q} versionId={versionId} content={content} rules={rules} openPicker={(cb, kind) => setGal({ open: true, cb, kind: kind ?? "question" })} onDone={async (qid) => { const id = modal.q?.id; await mSaveQ.mutateAsync({ ...(id ? { id } : {}), versionId, questionData: qid as any }); setModal(null); }} onClose={() => setModal(null)} />
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

      {gal?.open && <MediaManager onPick={(u) => { gal.cb(u); setGal(null); }} onClose={() => setGal(null)} />}

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

function MediaManager({ onPick, onClose, kind = "question" }: { onPick: (u: string) => void; onClose: () => void; kind?: "question" | "option" }) {
  const aClient = client as any;
  const qc = useQueryClient();
  const key = ["assess-media", kind];
  const { data, isPending } = useQuery({ queryKey: key, queryFn: () => aClient.discoverAdmin.media.list({ kind }) });
  const items: { key: string; url: string; name: string; size: number }[] = data?.items ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const mUp = useMutation({
    mutationFn: (i: any) => aClient.discoverAdmin.media.upload(i),
    onSuccess: () => { notify.create("Gambar diunggah ✅"); void invalidate(); },
    onError: (e: any) => notify.error("Gagal unggah", { description: e?.message?.slice(0, 120) }),
  });
  const mDel = useMutation({
    mutationFn: (i: any) => aClient.discoverAdmin.media.delete(i),
    onSuccess: () => { void invalidate(); },
    onError: (e: any) => notify.error("Gagal hapus", { description: e?.message?.slice(0, 120) }),
  });

  const onFile = async (f: File) => {
    const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => { const s = String(r.result ?? ""); res(s.split(",")[1] ?? ""); }; r.onerror = rej; r.readAsDataURL(f); });
    const res = (await mUp.mutateAsync({ dataB64: b64, mime: f.type || "image/png", filename: f.name, kind })) as any;
    if (res?.url) { notify.create(kind === "question" ? "Gambar soal dipasang ✅ — cek preview di kanan" : "Gambar opsi dipasang ✅ — cek preview di kanan"); onPick(res.url); } // upload = langsung pasang + tutup
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold font-bricolage text-base text-brand-navy">{kind === "question" ? "Galeri Media — Gambar Soal" : "Galeri Media — Gambar Jawaban/Opsi"} (R2)</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-4 py-4 font-manrope text-sm text-gray-600 hover:border-brand-orange/40">
          <Plus className="h-4 w-4 text-brand-navy" /> Unggah gambar {kind === "question" ? "soal" : "jawaban/opsi"} baru
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />
        </label>
        {isPending && <p className="mt-2 font-manrope text-xs text-muted-foreground">Memuat…</p>}
        <div className="mt-3 grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {items.map((o) => (
            <button key={o.key} onClick={() => onPick(o.url)} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <img src={o.url} alt={o.name} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} className="h-24 w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 hidden bg-black/50 px-1 py-0.5 font-manrope text-[9px] text-white group-hover:block">{o.name}</span>
              <span onClick={(e) => { e.stopPropagation(); if (confirm("Hapus gambar ini?")) void mDel.mutateAsync({ key: o.key }); }} className="absolute top-1 right-1 rounded-md bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"><Trash2 className="h-3 w-3" /></span>
            </button>
          ))}
          {items.length === 0 && !isPending && <p className="col-span-full py-6 text-center font-manrope text-xs text-muted-foreground">Belum ada gambar.</p>}
        </div>
      </div>
    </div>
  );
}

function MathPreview({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const katex = (await import("katex")).default;
        if (!ref.current || !alive) return;
        katex.render(text || "\\text{(isi rumus LaTeX di atas…)}", ref.current, { throwOnError: true, displayMode: true });
        if (alive) setErr(null);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "LaTeX tidak valid");
      }
    })();
    return () => { alive = false; };
  }, [text]);
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-3">
      <p className="font-manrope text-[10px] font-semibold uppercase tracking-wide text-gray-400">Pratinjau LaTeX</p>
      <div ref={ref} className="mt-1 min-h-[2rem] text-base" />
      {err && <p className="mt-1 font-manrope text-[10px] text-red-600">⚠ {err}</p>}
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

function QuestionPanel({ q, versionId, content, rules, onDone, onClose, openPicker }: { q?: any; versionId: string; content: Content; rules?: any; onDone: (payload: any) => void; onClose: () => void; openPicker?: (cb: (u: string) => void, kind?: "question" | "option") => void }) {
  const dims0 = content.dimensions ?? [];
  const [form, setForm] = useState<any>({
    id: q?.id, dimensionId: q?.dimensionId ?? content.dimensions[0]?.id ?? "", scaleId: q?.scaleId ?? null, questionText: q?.questionText ?? "",
    questionType: q?.questionType ?? "multiple_choice", weight: q?.weight ?? 1,
    hasMathNotation: q?.hasMathNotation ?? false, mediaUrl: q?.mediaUrl ?? "", mediaCaption: q?.mediaCaption ?? "", presentationMode: q?.presentationMode ?? "standard_option_card",
    options: (q?.opts?.length ?? 0) > 0 ? q.opts.map((o: any) => ({ id: o.id, optionValue: o.optionValue, label: o.label, score: o.score, imageUrl: o.imageUrl ?? null, icon: o.icon ?? null })) : [{ optionValue: "A", label: "", score: 1, icon: null }, { optionValue: "B", label: "", score: 0, icon: null }],
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
        id: form.id, dimensionId: form.dimensionId, scaleId: form.scaleId ?? null, questionText: form.questionText,
        questionType: form.questionType, hasMathNotation: !!form.hasMathNotation, mediaUrl: form.mediaUrl || null, mediaCaption: form.mediaCaption || null, presentationMode: form.presentationMode ?? "standard_option_card",
        weight: Number(form.weight) || 1, displayOrder: q?.displayOrder ?? 0, isActive: true,
        options: form.questionType === "multiple_choice" ? form.options.filter((o: any) => String(o.label || "").trim() || o.imageUrl || o.icon).map((o: any, i: number) => ({ id: o.id, optionValue: o.optionValue || "ABCDEF"[i], label: o.label, score: o.score, imageUrl: o.imageUrl ?? null, icon: o.icon ?? null, targetDimension: form.dimensionId, displayOrder: i })) : [],
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
          <label className="flex items-center gap-2 font-manrope text-xs font-medium text-gray-700">
            <input type="checkbox" checked={form.hasMathNotation === true} onChange={(e) => patch("hasMathNotation", e.target.checked)} className="accent-brand-orange" />
            Soal berisi rumus matematika (LaTeX $…$ — di-parse otomatis)
          </label>
          {form.hasMathNotation && <MathPreview text={form.questionText} />}
          <div className="grid grid-cols-2 gap-3">
            <label className="block font-manrope text-xs font-semibold text-foreground">Media gambar (URL)
              <Input className="mt-1" value={form.mediaUrl} onChange={(e) => patch("mediaUrl", e.target.value)} placeholder="https://cdn…/gambar.png" />
              {openPicker && <button type="button" onClick={() => openPicker((u) => patch("mediaUrl", u), "question")} className="mt-1 inline-flex items-center gap-1 rounded-md bg-teal-600 px-2 py-1 font-manrope text-[10px] font-semibold text-white hover:bg-teal-700">
                📁 Galeri gambar soal
              </button>}
            </label>
            <label className="block font-manrope text-xs font-semibold text-foreground">Keterangan gambar
              <Input className="mt-1" value={form.mediaCaption} onChange={(e) => patch("mediaCaption", e.target.value)} placeholder="Gambar 1.1: …" />
            </label>
          </div>
          <label className="block font-manrope text-xs font-semibold text-foreground">Tampilan pilihan
            <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm" value={form.presentationMode} onChange={(e) => { const v = e.target.value; setForm((f: any) => ({ ...f, presentationMode: v, options: v === "standard_option_card" ? f.options.map((o: any) => ({ ...o, imageUrl: null })) : f.options })); }}>
              <option value="standard_option_card">Kartu standar (teks)</option>
              <option value="emoji_option">Emoji / ikon (teks + gambar)</option>
              <option value="image_option">Gambar per opsi (teks + gambar)</option>
              <option value="visual_comparison">Banding visual besar (teks + gambar)</option>
            </select>
            <span className="mt-1 block font-manrope text-[10px] text-muted-foreground">{form.presentationMode === "standard_option_card" ? "Opsi berupa teks saja." : "Opsi berisi teks + gambar (upload aset dari galeri)."}</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block font-manrope text-xs font-semibold text-foreground">Bobot soal (utk metode Bobot)
              <Input type="number" className="mt-1" value={form.weight ?? 1} onChange={(e) => patch("weight", Number(e.target.value))} />
            </label>
            <label className="block font-manrope text-xs font-semibold text-foreground">Skala jawaban
              <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm" value={form.scaleId ?? ""} onChange={(e) => patch("scaleId", e.target.value || null)}>
                <option value="">Bawaan otomatis</option>
                {(content.scales ?? []).map((sx: any) => <option key={sx.id} value={sx.id}>{sx.name}</option>)}
              </select>
            </label>
          </div>
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
              <p className="font-manrope text-xs font-semibold text-foreground">{rules.scoring_mode === "likert" ? `Skala Likert ${rules.likert_min ?? 1}–${rules.likert_max ?? 5} — poin naik linier per pilihan` : form.presentationMode === "standard_option_card" ? "Pilihan teks — pilihan yang dipilih mendapat poin untuk dimensinya, sisanya 0" : "Pilihan teks + gambar — pilihan yang dipilih mendapat poin untuk dimensinya, sisanya 0"}</p>
              {form.options.map((o: any, i: number) => (
                <div key={i} className="space-y-1.5 rounded-xl border border-gray-200 bg-white p-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[9px] font-bold text-gray-500">{o.optionValue || ["A", "B", "C", "D", "E", "F"][i]}</span>
                    {form.presentationMode === "emoji_option" && (
                      <input value={o.icon ?? ""} onChange={(e) => patchOpt(i, "icon", e.target.value)} placeholder="😀" title="Emoji / ikon utk opsi ini" className="w-12 rounded-lg border border-gray-200 px-1 py-1 text-center font-manrope text-sm" />
                    )}
                    <Input className="flex-1" placeholder={`Pilihan ${["A", "B", "C", "D", "E", "F"][i]} (kosongkan bila hanya gambar)`} value={o.label} onChange={(e) => patchOpt(i, "label", e.target.value)} />
                    <Input type="number" className="w-16" title="Bobot (mode Bobot bebas)" value={o.score} onChange={(e) => patchOpt(i, "score", Number(e.target.value))} />
                    {form.options.length > 2 && <button onClick={() => patch("options", form.options.filter((_: any, x: number) => x !== i))} className="text-red-400"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                  {(o.imageUrl || true) && (o.imageUrl ? (
                    <div className="flex items-center gap-2">
                      <img src={o.imageUrl} alt="" className="h-10 w-14 rounded-lg border border-gray-200 object-cover" />
                      <Input className="flex-1" value={o.imageUrl} onChange={(e) => patchOpt(i, "imageUrl", e.target.value)} placeholder="URL gambar…" />
                      {openPicker && <button type="button" onClick={() => openPicker((u: string) => patchOpt(i, "imageUrl", u), "option")} className="inline-flex shrink-0 items-center gap-1 font-manrope text-[10px] font-semibold text-teal-600 hover:text-teal-700">📁 Galeri jawaban</button>}
                      <button onClick={() => patchOpt(i, "imageUrl", null)} className="text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    openPicker ? <button type="button" onClick={() => openPicker((u: string) => patchOpt(i, "imageUrl", u), "option")} className="inline-flex items-center gap-1 font-manrope text-[10px] font-semibold text-teal-600 hover:text-teal-700">📁 + pilih gambar jawaban utk opsi ini</button> : null
                  ))}
                </div>
              ))}
              {rules.scoring_mode === "likert" && (
                <button type="button" onClick={() => { const mn = Number(rules.likert_min ?? 1); const mx = Number(rules.likert_max ?? 5); const lv: any[] = []; for (let v = mn; v <= mx; v++) lv.push({ optionValue: "ABCDEF"[lv.length], label: String(v), score: v - mn + 1, imageUrl: null, icon: null }); patch("options", lv); }} className="w-full rounded-lg border border-dashed border-brand-orange/40 bg-brand-orange/5 px-3 py-2 font-manrope text-[11px] font-semibold text-brand-orange hover:bg-brand-orange/10">⚖ Isi otomatis skala Likert {rules.likert_min ?? 1}–{rules.likert_max ?? 5} (poin naik linier)</button>
              )}
              {form.options.length < 6 && <Button size="sm" variant="outline" onClick={() => patch("options", [...form.options, { optionValue: "ABCDEF"[form.options.length], label: "", score: 0, imageUrl: null, icon: null }])}><Plus className="mr-1 h-3.5 w-3.5" /> Tambah pilihan</Button>}
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
          <h4 className="mt-1 font-bold font-bricolage text-sm text-gray-900 leading-snug">{form.hasMathNotation ? <MathPreview text={form.questionText} /> : form.questionText || "Teks soal…"}</h4>
          {form.mediaUrl ? (
            <figure className="mt-2">
              <img src={form.mediaUrl} alt={form.mediaCaption ?? "Gambar soal"} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='60'><rect width='100%25' height='100%25' fill='%23f5f5f5'/><text x='50%25' y='55%25' font-size='11' fill='%23b0b0b0' text-anchor='middle' font-family='sans-serif'>GAMBAR RUSAK</text></svg>"; }} className="mx-auto max-h-40 rounded-xl border border-gray-100 object-contain" />
              {form.mediaCaption && <figcaption className="mt-1 text-center font-manrope text-[10px] text-gray-400">{form.mediaCaption}</figcaption>}
            </figure>
          ) : (
            <p className="mt-2 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-center font-manrope text-[10px] text-gray-400">Gambar soal belum dipasang — klik “📁 Galeri gambar soal” lalu pilih / unggah.</p>
          )}
          {form.questionType === "multiple_choice" ? (
            <div className={`mt-2 ${form.presentationMode === "visual_comparison" ? "grid grid-cols-2 gap-2" : "space-y-1.5"}`}>
              {form.options.filter((o: any) => String(o.label || "").trim()).map((o: any, i: number) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg border p-2.5 ${i === 0 ? "border-teal-500/60 bg-teal-500/5" : "border-gray-200 bg-white"}`}>
                  {form.presentationMode === "emoji_option" && o.icon ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-base">{o.icon}</span>
                  ) : (
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold ${i === 0 ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"}`}>{o.optionValue || ["A", "B", "C", "D", "E", "F"][i]}</span>
                  )}
                  {o.imageUrl && <img src={o.imageUrl} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} className="h-8 w-11 shrink-0 rounded-md border border-gray-100 object-cover" />}
                  {String(o.label || "").trim() && <span className="font-manrope text-xs text-gray-700">{o.label}</span>}
                  {rules.scoring_mode === "likert" && <span className="ml-auto rounded bg-brand-navy/5 px-1.5 py-0.5 font-manrope text-[9px] font-bold text-brand-navy">{o.score} pts</span>}
                </div>
              ))}
              {rules.scoring_mode === "likert" && form.options.length === 0 && <p className="font-manrope text-[10px] text-gray-400">Klik "Isi otomatis skala Likert" utk membuat pilihan skala.</p>}
            </div>
          ) : (
            <div className="mt-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <input type="text" inputMode="decimal" placeholder={form.textEval.evaluationType === "numeric" ? "Ketik angka… (cth 0.75)" : "Ketik jawaban…"} onChange={(e) => { const v = e.target.value.replace(/[^\d.,/\-]/g, ""); if (v !== e.target.value) e.target.value = v; }} className="flex-1 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-1.5 font-manrope text-xs outline-none focus:border-teal-400" />
                <span className="rounded-md bg-brand-navy px-3 py-1.5 font-manrope text-[10px] font-semibold text-white">Jawab</span>
              </div>
              {form.textEval.answerKey && <p className="mt-1.5 font-manrope text-[10px] text-gray-400">Kunci: {form.textEval.answerKey} (toleransi {form.textEval.numericTolerance || "0.01"}) · tipe {form.textEval.evaluationType}</p>}
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

// Input dengan save debounced (700ms idle / blur) — hindari save per ketukan
function DebouncedInput({ value, onCommit, idKey, className, placeholder, disabled }: { value: string; onCommit: (v: string) => void; idKey?: string; className?: string; placeholder?: string; disabled?: boolean }) {
  const [v, setV] = useState(value);
  const t = useRef<any>(null);
  useEffect(() => { setV(value); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey]);
  const commit = (val: string) => { clearTimeout(t.current); t.current = setTimeout(() => onCommit(val), 700); };
  return (
    <Input disabled={disabled} className={className ?? ""} placeholder={placeholder} value={v}
      onChange={(e) => { const val = e.target.value; setV(val); commit(val); }}
      onBlur={() => { clearTimeout(t.current); onCommit(v); }} />
  );
}
