"use client";

import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronUp, Copy, Eye, FilePlus2, GripVertical, Loader2, Plus, Rocket, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { client } from "@/lib/client";
import { notify } from "@/lib/toast";

interface Assessment { id: string; code: string; name: string }
interface Version { id: string; assessmentId: string; versionNumber: number; status: string; configJson?: any; publishedAt?: string | null }
interface Dim { id: string; code: string; name: string }
interface Qn { id: string; dimensionId: string; questionText: string; questionType: string; weight?: number; hasMathNotation?: boolean; displayOrder: number }
interface Content { questions: Qn[]; options: any[]; textConfigs: any[]; dimensions: Dim[]; scales: any[] }

/** UI PM-friendly: satu layar — Aturan, Soal, Terbitkan. Versi tersembunyi (auto-snapshot). */
export default function AssessmentEditorPage() {
  const aClient = client as any;
  const [asses, setAsses] = useState<Assessment[]>([]);
  const [versBy, setVersBy] = useState<Record<string, Version[]>>({});
  const [code, setCode] = useState("");
  const [rules, setRules] = useState<Record<string, any>>({});
  const [rulesOpen, setRulesOpen] = useState(false);
  const [content, setContent] = useState<Content | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [modal, setModal] = useState<{ open: boolean; q?: any }>({ open: false });
  const [gate, setGate] = useState<{ ok: boolean; errors: string[] } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const reload = useCallback(async () => {
    const data = await aClient.discoverAdmin.list();
    setAsses(data.assessments ?? []);
    const m: Record<string, Version[]> = {};
    for (const a of data.assessments ?? []) { const v = await aClient.discoverAdmin.versions.list({ assessmentId: a.id }); m[a.id] = v.items ?? []; }
    setVersBy(m);
    if (!code && data.assessments?.[0]) setCode(data.assessments[0].code);
  }, [code]);
  useEffect(() => { void reload(); }, [reload]);

  const vers = useMemo(() => { const a = asses.find((x) => x.code === code); return a ? (versBy[a.id] ?? []) : []; }, [asses, code, versBy]);
  const live = vers.find((v) => v.status === "live") ?? null;
  const draft = vers.find((v) => v.status === "draft") ?? null;

  const ensureEdit = async () => {
    if (draft) return draft;
    if (live) { await aClient.discoverAdmin.versions.createDraft({ code }); await reload(); }
    return null;
  };

  const loadContent = useCallback(async (v: Version | null) => {
    if (!v) { setContent(null); return; }
    setRules(v.configJson ?? {});
    try { setContent(await aClient.discoverAdmin.contentList({ versionId: v.id })); } catch { setContent(null); }
    setCanEdit(v.status === "draft");
  }, []);
  useEffect(() => { const sel = draft ?? live; void loadContent(sel); }, [draft?.id, live?.id]);

  const startEdit = async () => {
    setBusy("edit");
    try { const d = await ensureEdit(); await reload(); const nd = (await aClient.discoverAdmin.versions.list({ assessmentId: asses.find((x) => x.code === code)!.id })).items.find((v: any) => v.status === "draft");
      await loadContent(nd); setErrors([]); notify.create("Mode ubah aktif", { description: "Perubahan otomatis tersimpan sebagai draf aman." }); }
    catch (e) { notify.error("Gagal", { description: (e as Error)?.message?.slice(0, 120) }); }
    finally { setBusy(""); }
  };

  const checkGate = useCallback(async () => {
    if (!draft) { setGate(null); return; }
    try { setGate(await aClient.discoverAdmin.validate({ versionId: draft.id })); }
    catch { setGate(null); }
  }, [draft?.id]);

  useEffect(() => { void checkGate(); }, [checkGate, content]);

  const saveRules = async () => {
    if (!draft) return;
    setBusy("rules");
    try { await aClient.discoverAdmin.configUpdate({ versionId: draft.id, config: rules }); notify.create("Aturan disimpan ✅"); }
    catch (e) { notify.error("Gagal", { description: (e as Error)?.message?.slice(0, 120) }); } finally { setBusy(""); }
  };

  const reloadContent = async () => { if (draft) setContent(await aClient.discoverAdmin.contentList({ versionId: draft.id })); };
  const dropQ = async (from: number, to: number) => {
    if (!content || from === to) return;
    const qs = [...content.questions];
    const [moved] = qs.splice(from, 1);
    qs.splice(to, 0, moved!);
    setContent({ ...content, questions: qs });
    await aClient.discoverAdmin.contentReorder({ versionId: draft!.id, orderedIds: qs.map((q) => q.id) });
    setDragIdx(null);
  };
  const delQ = async (id: string) => {
    await aClient.discoverAdmin.contentDelete({ questionId: id });
    await reloadContent();
  };
  const dupQ = async (id: string) => {
    await aClient.discoverAdmin.contentDuplicate({ questionId: id });
    await reloadContent();
    notify.create("Soal disalin");
  };
  const moveQ = async (idx: number, dir: number) => {
    if (!content) return;
    const qs = [...content.questions];
    const j = idx + dir;
    if (j < 0 || j >= qs.length) return;
    [qs[idx], qs[j]] = [qs[j]!, qs[idx]!];
    await aClient.discoverAdmin.contentReorder({ versionId: draft!.id, orderedIds: qs.map((q) => q.id) });
    await reloadContent();
  };

  const publish = async () => {
    if (!draft) return; setBusy("pub");
    try { const r = await aClient.discoverAdmin.versions.publish({ versionId: draft.id }); if (r.ok) { notify.create("Terbit 🎉 didik"); setErrors([]); } else setErrors(r.errors ?? []); await reload(); }
    catch (e) { notify.error("Gagal", { description: (e as Error)?.message?.slice(0, 120) }); } finally { setBusy(""); }
  };

  const active = draft ?? live;
  const dims = useMemo(() => { const a = asses.find((x) => x.code === code); return a ? (versBy[a.id] ?? []) : []; }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header + pemilih asesmen + Terbitkan */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold font-bricolage text-xl text-foreground">Kelola Tes</span>
          <div className="flex flex-wrap gap-1.5">
            {asses.map((a) => (
              <button key={a.id} onClick={() => setCode(a.code)}
                className={`rounded-full px-3.5 py-1.5 font-manrope text-xs font-semibold transition-all ${code === a.code ? "bg-brand-navy text-white shadow" : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
                {a.name}
              </button>
            ))}
          </div>
          {active && <Badge className={active.status === "live" ? "border-teal-500/30 bg-teal-500/10 text-teal-700" : "border-amber-500/30 bg-amber-500/10 text-amber-700"}>{active.status === "live" ? "Online" : "Draf"}</Badge>}
          {active?.publishedAt && active.status === "live" && <span className="font-manrope text-[11px] text-muted-foreground">Terakhir diperbarui {new Date(active.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>}
        </div>
        <div className="flex items-center gap-2">
          {live && (<a href="/assessment/talent?preview=1" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 font-manrope text-xs font-semibold text-gray-600 hover:bg-gray-50"><Eye className="h-3.5 w-3.5" /> Lihat sebagai siswa</a>)}
          <Button className={(gate && !gate.ok) || !draft ? "bg-gray-300 hover:bg-gray-300" : "bg-brand-orange hover:bg-brand-orange/90"} disabled={!draft || (gate ? !gate.ok : false) || busy === "pub" || busy === "edit"} onClick={() => void publish()}>
            {busy === "pub" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Rocket className="mr-1 h-4 w-4" />} Terbitkan
          </Button>
        </div>
      </div>

      {/* Aturan tes (collapsible) */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <button onClick={() => setRulesOpen(!rulesOpen)} className="flex w-full items-center justify-between px-5 py-3.5">
          <span className="font-bold font-bricolage text-sm text-brand-navy">Aturan tes</span>
          {rulesOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {rulesOpen && (
          <div className="grid gap-3 border-t border-gray-100 px-5 pb-5 pt-4 md:grid-cols-3">
            <Rule label="Tampilkan hasil N kode teratas" hint="cth: 3" type="number" value={rules.result_dim_count ?? ""} onChange={(v) => setRules((r) => ({ ...r, result_dim_count: Number(v) }))} />
            <Rule label="Min. soal per dimensi" value={rules.min_q_per_dim ?? ""} type="number" onChange={(v) => setRules((r) => ({ ...r, min_q_per_dim: Number(v) }))} />
            <Rule label="Cara nilai" type="select" opts={[["sum", "Jumlah poin"], ["average", "Rata-rata"], ["weighted", "Bobot soal"]]} value={rules.scoring_method ?? "sum"} onChange={(v) => setRules((r) => ({ ...r, scoring_method: v }))} />
            <Rule label="Acak urutan soal" type="bool" value={rules.randomize_q === true} onChange={(v) => setRules((r) => ({ ...r, randomize_q: v }))} />
            <Rule label="Acak urutan pilihan" type="bool" value={rules.randomize_a === true} onChange={(v) => setRules((r) => ({ ...r, randomize_a: v }))} />
            <Rule label="Izinkan lanjut kemudian" type="bool" value={rules.allow_pause === true} onChange={(v) => setRules((r) => ({ ...r, allow_pause: v }))} />
            <div className="md:col-span-3"><Button size="sm" variant="outline" onClick={() => void saveRules()} disabled={busy === "rules"}>{busy === "rules" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />} Simpan aturan</Button></div>
          </div>
        )}
      </div>

      {/* Daftar soal */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <span className="font-bold font-bricolage text-sm text-brand-navy">Daftar soal <span className="ml-1 font-manrope text-[11px] font-normal text-muted-foreground">{content?.questions.length ?? 0} soal {!canEdit ? "· tampilan hanya-baca" : ""}</span></span>
          {!canEdit && live && <Button size="sm" className="bg-brand-navy hover:bg-brand-navy-light" onClick={() => void startEdit()} disabled={busy === "edit"}>{busy === "edit" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PencilIcon />} Ubah soal</Button>}
          {canEdit && <Button size="sm" className="bg-brand-orange hover:bg-brand-orange/90" onClick={() => setModal({ open: true })}><Plus className="mr-1 h-4 w-4" /> Tambah soal</Button>}
        </div>
        {modal.open && draft && content && (
          <div className="border-b border-teal-100 bg-teal-50/20 px-4 py-4">
            <QuestionPanel q={modal.q} versionId={draft.id} content={content} onDone={async () => { setModal({ open: false }); await reloadContent(); }} onClose={() => setModal({ open: false })} />
          </div>
        )}
        <div className="divide-y divide-gray-50 px-2 pb-2">
          {canEdit && (!content || content.questions.length === 0) && <p className="px-3 py-6 text-center font-manrope text-sm text-muted-foreground">Belum ada soal.</p>}
          {(content?.questions ?? []).map((q, i) => {
            const opts = (content?.options ?? []).filter((o: any) => o.questionId === q.id);
            const tc = (content?.textConfigs ?? []).find((t: any) => t.questionId === q.id);
            const dim = content?.dimensions.find((d) => d.id === q.dimensionId);
            return (
              <div
                key={q.id}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => dragIdx !== null && void dropQ(dragIdx, i)}
                onDragEnd={() => setDragIdx(null)}
                className={`group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 ${dragIdx === i ? "opacity-40" : ""} ${dragIdx !== null && dragIdx !== i ? "cursor-grabbing" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" />
                  <div className="min-w-0">
                  <p className="truncate font-manrope text-sm font-medium text-gray-800"><span className="mr-2 text-xs text-gray-400">{i + 1}.</span>{q.questionText}</p>
                  <p className="font-manrope text-[11px] text-muted-foreground">{dim?.name ?? "—"} · {q.questionType === "text_input" ? "Isian" : `${opts.length} pilihan`}</p>
                  </div>
                </div>
                {canEdit && (
                <div className="flex shrink-0 gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                  <button title="Naik" onClick={() => void moveQ(i, -1)} disabled={i === 0} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button title="Turun" onClick={() => void moveQ(i, 1)} disabled={i === (content?.questions.length ?? 1) - 1} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button title="Salin soal" onClick={() => void dupQ(q.id)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"><Copy className="h-4 w-4" /></button>
                  <button onClick={() => setModal({ open: true, q })} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"><PencilIcon /></button>
                  <button onClick={() => void delQ(q.id)} className="rounded-md p-1.5 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* Status siap terbit (live) */}
      {gate && draft && (
        gate.ok ? (
          <div className="flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
            <p className="font-manrope text-sm font-semibold text-teal-700">Siap terbit — tidak ada masalah. 🎉</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
            <p className="font-manrope text-sm font-semibold text-red-700">{gate.errors.length} hal perlu diperbaiki sebelum terbit:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-red-700/90">{gate.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )
      )}
      {errors.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
          <p className="font-manrope text-sm font-semibold text-red-700">Terbit ditolak:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-red-700/90">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}


    </div>
  );
}

function PencilIcon() { return <span className="mr-1 inline-block h-4 w-4 align-[-2px]">✏️</span>; }

function Rule({ label, hint, type, opts, value, onChange }: { label: string; hint?: string; type: "number" | "bool" | "select"; opts?: [string, string][]; value: any; onChange: (v: any) => void }) {
  return (
    <label className="block font-manrope text-xs font-semibold text-foreground">
      {label} {hint && <span className="font-normal text-muted-foreground">({hint})</span>}
      {type === "number" && <Input type="number" className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} />}
      {type === "bool" && (
        <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm" value={value ? "1" : "0"} onChange={(e) => onChange(e.target.value === "1")}>
          <option value="1">Ya</option><option value="0">Tidak</option>
        </select>
      )}
      {type === "select" && (
        <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
          {(opts ?? []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
    </label>
  );
}

function QuestionPanel({ q, versionId, content, onDone, onClose }: { q?: any; versionId: string; content: Content; onDone: () => void; onClose: () => void }) {
  const aClient = client as any;
  const [form, setForm] = useState<any>({
    id: q?.id, dimensionId: q?.dimensionId ?? content.dimensions[0]?.id ?? "", questionText: q?.questionText ?? "",
    questionType: q?.questionType ?? "multiple_choice", weight: q?.weight ?? 1,
    options: (q?.opts?.length ?? 0) > 0 ? q.opts.map((o: any) => ({ label: o.label, score: o.score })) : [{ label: "", score: 1 }, { label: "", score: 0 }],
    textEval: { evaluationType: "numeric_tolerance", answerKey: "", numericTolerance: "0.01" },
  });
  const [busy, setBusy] = useState(false);
  const patch = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const patchOpt = (i: number, k: string, v: any) => setForm((f: any) => { const o = [...f.options]; o[i] = { ...o[i], [k]: v }; return { ...f, options: o }; });

  const save = async () => {
    if (!form.questionText.trim()) { notify.error("Teks soal wajib diisi"); return; }
    if (form.questionType === "multiple_choice" && form.options.filter((o: any) => String(o.label || "").trim()).length < 2) { notify.error("Butuh minimal 2 pilihan"); return; }
    setBusy(true);
    try {
      await aClient.discoverAdmin.contentSave({
        versionId,
        questionData: {
          id: form.id, dimensionId: form.dimensionId, scaleId: null, questionText: form.questionText,
          questionType: form.questionType, hasMathNotation: false, mediaUrl: null, mediaCaption: null,
          weight: Number(form.weight) || 1, displayOrder: q?.displayOrder ?? 0, isActive: true,
          options: form.questionType === "multiple_choice" ? form.options.filter((o: any) => String(o.label || "").trim()) : [],
          textEval: form.questionType === "text_input" && form.textEval.answerKey ? form.textEval : null,
        },
      });
      notify.create("Soal tersimpan ✅"); onDone();
    } catch (e) { notify.error("Gagal", { description: (e as Error)?.message?.slice(0, 120) }); } finally { setBusy(false); }
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
              <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm" value={form.dimensionId} onChange={(e) => patch("dimensionId", e.target.value)}>
                {content.dimensions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
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
              {form.options.length < 6 && <Button size="sm" variant="outline" onClick={() => patch("options", [...form.options, { label: "", score: 0 }])}><Plus className="mr-1 h-3.5 w-3.5" /> Tambah pilihan</Button>}
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
          {/* Preview live siswa */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="font-manrope text-[10px] font-semibold uppercase tracking-wide text-teal-600">Tampilan siswa</p>
            <p className="mt-2 font-manrope text-[10px] text-gray-400">{content.dimensions.find((d) => d.id === form.dimensionId)?.name ?? "Dimensi"}</p>
            <h4 className="mt-1 font-bold font-bricolage text-sm text-gray-900 leading-snug">{form.questionText || "Teks soal…"}</h4>
            {form.questionType === "multiple_choice" ? (
              <div className="mt-2 space-y-1.5">
                {form.options.filter((o: any) => String(o.label || "").trim()).map((o: any, i: number) => (
                  <div key={i} className={`flex items-center gap-2 rounded-lg border p-2.5 ${i === 0 ? "border-teal-500/60 bg-teal-500/5" : "border-gray-200 bg-white"}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold ${i === 0 ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"}`}>{["A", "B", "C", "D", "E", "F"][i]}</span>
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
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button className="bg-brand-navy hover:bg-brand-navy-light" onClick={() => void save()} disabled={busy}>{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-1 h-4 w-4" />} Simpan soal</Button>
      </div>
    </div>
  );
}