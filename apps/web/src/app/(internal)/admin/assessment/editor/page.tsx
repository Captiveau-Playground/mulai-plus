"use client";

import { CheckCircle2, FilePlus2, GitBranch, HelpCircle, Layers, Loader2, Pencil, Plus, Rocket, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { client } from "@/lib/client";
import { notify } from "@/lib/toast";

interface Assessment { id: string; code: string; name: string }
interface Version { id: string; assessmentId: string; versionNumber: number; status: string; configJson?: any; publishedAt?: string | null }
interface Dimension { id: string; code: string; name: string; displayOrder: number }
interface Option { id?: string; optionValue: string; label: string; score: number }
interface Question { id: string; dimensionId: string; questionText: string; questionType: string; weight?: number; presentationMode?: string; hasMathNotation?: boolean; displayOrder: number; isActive?: boolean }
interface Content { questions: Question[]; options: any[]; textConfigs: any[]; dimensions: Dimension[]; scales: any[] }

const STATUS: Record<string, string> = { live: "bg-teal-500/10 text-teal-700 border-teal-500/30", draft: "bg-gray-100 text-gray-600 border-gray-200", archived: "bg-gray-50 text-gray-400 border-gray-200", preview: "bg-amber-500/10 text-amber-700 border-amber-500/30", validate: "bg-amber-500/10 text-amber-700 border-amber-500/30" };

export default function AssessmentEditorPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [versBy, setVersBy] = useState<Record<string, Version[]>>({});
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<"config" | "content" | "publish">("config");
  const [help, setHelp] = useState(true);
  const [live, setLive] = useState<Version | null>(null);
  const [draft, setDraft] = useState<Version | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [cfg, setCfg] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [editor, setEditor] = useState<{ open: boolean; q?: any }>({ open: false });
  const aClient = client as any;

  const reload = useCallback(async () => {
    const data = (await aClient.discoverAdmin.list()) as any;
    setAssessments(data.assessments ?? []);
    const m: Record<string, Version[]> = {};
    for (const a of data.assessments ?? []) {
      const v = (await aClient.discoverAdmin.versions.list({ assessmentId: a.id })) as any;
      m[a.id] = v.items ?? [];
    }
    setVersBy(m);
    if (!code && data.assessments?.[0]) setCode(data.assessments[0].code);
  }, [code]);

  useEffect(() => { void reload(); }, [reload]);

  const assess = assessments.find((a) => a.code === code);
  const vers = assess ? (versBy[assess.id] ?? []) : [];
  const selLive = useMemo(() => vers.find((v) => v.status === "live") ?? null, [vers]);
  const selDraft = useMemo(() => vers.find((v) => v.status === "draft") ?? null, [vers]);
  const active = selDraft ?? selLive;

  useEffect(() => {
    if (!active) return;
    setCfg((active.configJson ?? {}) as any);
    if (active.status === "draft") {
      void (aClient.discoverAdmin.contentList({ versionId: active.id }) as any).then((c: any) => setContent(c));
    } else {
      setContent(null);
    }
  }, [active?.id, code]);

  const createDraft = async () => {
    if (!code) return;
    setBusy("draft");
    try {
      await aClient.discoverAdmin.versions.createDraft({ code });
      notify.create("Draft dibuat", { description: "Snapshot LIVE — kini bisa diedit." });
      await reload();
      setTab("content");
    } catch (e) { notify.error("Gagal buat draft", { description: (e as Error)?.message?.slice(0, 120) }); }
    finally { setBusy(""); }
  };

  const saveConfig = async () => {
    if (!active) return;
    setBusy("cfg");
    try {
      await aClient.discoverAdmin.configUpdate({ versionId: active.id, config: cfg });
      notify.create("Pengaturan disimpan ✅");
    } catch (e) { notify.error("Gagal simpan", { description: (e as Error)?.message?.slice(0, 120) }); }
    finally { setBusy(""); }
  };

  const delQ = async (questionId: string) => {
    await aClient.discoverAdmin.contentDelete({ questionId });
    setContent(null);
    if (active) setContent(await (aClient.discoverAdmin.contentList({ versionId: active.id }) as any));
    notify.create("Soal dihapus");
  };

  const publish = async () => {
    if (!selDraft) return;
    setBusy("pub");
    try {
      const r = (await aClient.discoverAdmin.versions.publish({ versionId: selDraft.id })) as any;
      if (r.ok) { notify.create("Terbit 🎉", { description: "Versi LIVE; lama di-archive." }); setErrors([]); }
      else setErrors(r.errors ?? ["Ditolak"]);
      await reload();
    } catch (e) { notify.error("Gagal publish", { description: (e as Error)?.message?.slice(0, 120) }); }
    finally { setBusy(""); }
  };

  return (
    <div className="space-y-4">
      <Header help={help} setHelp={setHelp} />

      {/* Pilih assessment */}
      <div className="flex flex-wrap items-center gap-2">
        {assessments.map((a) => (
          <button key={a.id} onClick={() => { setCode(a.code); setTab("config"); }}
            className={`rounded-xl px-4 py-2 font-manrope text-sm font-semibold transition-all ${code === a.code ? "bg-brand-navy text-white shadow" : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
            {a.name}
          </button>
        ))}
        {vers.map((v) => (
          <Badge key={v.id} className={`border ${STATUS[v.status] ?? ""}`}>v{v.versionNumber} · {v.status}</Badge>
        ))}
      </div>

      {!active && (selLive || selDraft) === null && (
        <Card><CardContent className="pt-5 font-manrope text-sm text-muted-foreground">
          Belum ada versi. {selLive === null && selDraft === null && assessments.length > 0 ? "Sebarkan lewat seeder (packages/db) atau hubungi developer." : ""}
        </CardContent></Card>
      )}

      {active && (
        <>
          {/* Wizard tabs */}
          <div className="flex flex-wrap gap-1.5">
            {([["config", "1 · Pengaturan"], ["content", "2 · Konten"], ["publish", "3 · Terbitkan"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`rounded-lg px-4 py-2 font-manrope text-sm font-semibold transition-all ${tab === k ? "bg-brand-orange text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* 1 · PENGATURAN */}
          {tab === "config" && (
            <Card>
              <CardHeader><CardTitle className="text-base">Pengaturan Asesmen</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {[
                  ["total_dim", "Total Dimensi", "number"],
                  ["result_dim_count", "Jumlah hasil (Top-N)", "number"],
                  ["min_q_per_dim", "Min. soal per dimensi", "number"],
                  ["scoring_method", "Metode skoring", "select:sum:average:weighted"],
                  ["randomize_q", "Acak soal", "select:true:false"],
                  ["randomize_a", "Acak opsi", "select:true:false"],
                  ["timer_enabled", "Aktifkan timer", "select:true:false"],
                  ["allow_pause", "Izinkan pause/resume", "select:true:false"],
                ].map(([key, label, kind]) => (
                  <div key={key}>
                    <label className="mb-1 block font-manrope text-xs font-semibold text-foreground">{label}</label>
                    {kind.startsWith("select:") ? (
                      <Select value={String(cfg[key] ?? "")} onValueChange={(v) => setCfg((c) => ({ ...c, [key]: kind.includes("select:true:false") ? v === "true" : v }))}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {kind.split(":").slice(1).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input type={kind} value={cfg[key] ?? ""} onChange={(e) => setCfg((c) => ({ ...c, [key]: Number(e.target.value) }))} />
                    )}
                  </div>
                ))}
                <div className="md:col-span-2">
                  <Button onClick={() => void saveConfig()} disabled={busy === "cfg"} className="bg-brand-navy hover:bg-brand-navy-light">
                    {busy === "cfg" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />} Simpan Pengaturan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2 · KONTEN */}
          {tab === "content" && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Soal — {selDraft ? `v${selDraft.versionNumber} (draft)` : (selLive ? `v${selLive.versionNumber} (LIVE, terkunci)` : "")}</CardTitle>
                {selDraft ? (
                  <Button size="sm" className="bg-brand-orange hover:bg-brand-orange/90" onClick={() => setEditor({ open: true })}>
                    <Plus className="mr-1 h-4 w-4" /> Tambah Soal
                  </Button>
                ) : selLive ? (
                  <Button size="sm" variant="outline" onClick={() => void createDraft()} disabled={busy === "draft"}>
                    {busy === "draft" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <GitBranch className="mr-1 h-4 w-4" />} Buat Draft v{selLive.versionNumber + 1} & Edit
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-2">
                {selDraft && !content && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-muted-foreground" />}
                {(!content || content.questions.length === 0) && selDraft && (
                  <p className="font-manrope text-sm text-muted-foreground">Belum ada soal di draft ini.</p>
                )}
                {(content?.questions ?? []).map((q, i) => {
                  const opts = (content?.options ?? []).filter((o) => o.questionId === q.id);
                  const dim = content?.dimensions.find((d) => d.id === q.dimensionId);
                  const tc = content?.textConfigs.find((t) => t.questionId === q.id);
                  return (
                    <div key={q.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-manrope text-sm font-medium text-gray-800">
                          <span className="mr-2 text-xs text-gray-400">{i + 1}.</span>
                          {q.questionText}
                        </p>
                        <p className="font-manrope text-[11px] text-muted-foreground">
                          {dim?.name ?? q.dimensionId} · {q.questionType === "text_input" ? `Isian (${tc?.evaluationType ?? "?"})` : `${opts.length} opsi`} · bobot {q.weight ?? 1}
                          {q.hasMathNotation ? " · LaTeX" : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button onClick={() => setEditor({ open: true, q })} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => void delQ(q.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* 3 · TERBITKAN */}
          {tab === "publish" && (
            <Card>
              <CardHeader><CardTitle className="text-base">Terbitkan & Uji</CardTitle></CardHeader>
              <CardContent className="space-y-3 font-manrope text-sm text-muted-foreground">
                {selLive && (
                  <p>
                    Versi LIVE saat ini: <b className="text-brand-navy">v{selLive.versionNumber}</b>
                    {selLive.publishedAt && <> (terbit {new Date(selLive.publishedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })})</>}.
                  </p>
                )}
                {selDraft ? (
                  <>
                    <p>Draft <b>v{selDraft.versionNumber}</b> siap diterbitkan. Validasi otomatis dijalankan — jika ada yang kurang, kamu lihat daftar kesalahannya di bawah.</p>
                    <Button className="bg-brand-orange hover:bg-brand-orange/90" onClick={() => void publish()} disabled={busy === "pub"}>
                      {busy === "pub" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Rocket className="mr-1 h-4 w-4" />} Terbitkan v{selDraft.versionNumber}
                    </Button>
                  </>
                ) : (
                  <p>Tidak ada draft — buka tab <b>Konten</b> lalu <b>Buat Draft</b> untuk mengubah soal versi baru.</p>
                )}
                {selLive && (
                  <a href="/assessment/talent?preview=1" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 font-manrope text-xs font-semibold text-white hover:bg-teal-700">
                    👁 Coba halaman siswa (preview) →
                  </a>
                )}
                {errors.length > 0 && (
                  <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
                    <p className="font-manrope text-xs font-semibold text-red-700">Validasi gagal:</p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5">
                      {errors.map((e, i) => <li key={i} className="text-[11px] text-red-700/90">{e}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modal builder soal */}
      {editor.open && active && content && <QuestionModal q={editor.q} versionId={active.id} dims={content.dimensions} onSave={async () => { setEditor({ open: false }); setContent(await (aClient.discoverAdmin.contentList({ versionId: active.id }) as any)); }} onClose={() => setEditor({ open: false })} />}
    </div>
  );
}

function Header({ help, setHelp }: { help: boolean; setHelp: (v: boolean) => void }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 font-bold font-bricolage text-xl text-foreground">
            <Layers className="h-5 w-5 text-brand-navy" /> Kelola Asesmen
          </h1>
          <p className="mt-0.5 font-manrope text-sm text-muted-foreground">Alur simpel: <b>1·Atur → 2·Isi Soal → 3·Terbitkan</b>.</p>
        </div>
        <button onClick={() => setHelp(!help)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-manrope text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <HelpCircle className="h-3.5 w-3.5" /> {help ? "Tutup panduan" : "Bagaimana cara pakai?"}
        </button>
      </div>
      {help && (
        <div className="mt-3 rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
          <p className="font-manrope text-xs font-semibold text-teal-800">Panduan singkat</p>
          <ol className="mt-1.5 space-y-1 font-manrope text-xs text-gray-600">
            <li>① <b>Pengaturan</b> — pilih asesmen (Discover = minat · Talent = bakat), atur jumlah dimensi, top-N, metode skoring, timer.</li>
            <li>② <b>Konten</b> — jika versi LIVE, tekan <b>Buat Draft</b> (versi lama tak bisa diubah agar hasil historis aman). Tambah/edit soal: pilih dimensi, tipe (Pilihan / Isian), isi opsi + bobot. Soal isian punya aturan penilaian (tepat/toleransi angka/kata/kunci pola).</li>
            <li>③ <b>Terbitkan</b> — sistem memvalidasi otomatis (min. soal per dimensi, opsi ≥2, konfigurasi valid). Jika lolos → jadi LIVE; versi lama otomatis di-archive. Siswa langsung melihat versi terbaru.</li>
            <li>💡 Versi LIVE <b>terkunci</b> — perubahan selalu lewat draft baru. Itu kunci integritas hasil historis.</li>
          </ol>
        </div>
      )}
    </div>
  );
}


function QuestionModal({ q, versionId, dims, onSave, onClose }: { q?: any; versionId: string; dims: Dimension[]; onSave: () => void; onClose: () => void }) {
  const aClient = client as any;
  const [form, setForm] = useState<any>({
    id: q?.id, dimensionId: q?.dimensionId ?? dims[0]?.id ?? "", scaleId: q?.scaleId ?? null,
    questionText: q?.questionText ?? "", questionType: q?.questionType ?? "multiple_choice",
    hasMathNotation: q?.hasMathNotation ?? false, weight: q?.weight ?? 1, mediaUrl: q?.mediaUrl ?? "", mediaCaption: q?.mediaCaption ?? "",
    options: (q?.opts?.length ?? 0) > 0 ? q.opts.map((o: any) => ({ id: o.id, optionValue: o.optionValue, label: o.label, score: o.score })) : [{ optionValue: "A", label: "", score: 1 }, { optionValue: "B", label: "", score: 0 }],
    textEval: q?.tc ? { evaluationType: q.tc.evaluationType, answerKey: q.tc.answerKey, numericTolerance: q.tc.numericTolerance ?? "" } : { evaluationType: "numeric_tolerance", answerKey: "", numericTolerance: "0.01" },
  });
  const [busy, setBusy] = useState(false);

  const patch = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const patchOpt = (i: number, k: string, v: any) => setForm((f: any) => {
    const opts = [...f.options]; opts[i] = { ...opts[i], [k]: v }; return { ...f, options: opts };
  });

  const save = async () => {
    if (!form.questionText.trim()) { notify.error("Teks soal wajib diisi"); return; }
    if (form.questionType === "multiple_choice" && form.options.filter((o: any) => o.label.trim()).length < 2) { notify.error("Pilihan ganda butuh minimal 2 opsi berlabel"); return; }
    setBusy(true);
    try {
      await aClient.discoverAdmin.contentSave({
        versionId,
        questionData: {
          id: form.id, dimensionId: form.dimensionId, scaleId: form.scaleId, questionText: form.questionText,
          questionType: form.questionType, hasMathNotation: form.hasMathNotation, mediaUrl: form.mediaUrl || null,
          mediaCaption: form.mediaCaption || null, weight: Number(form.weight) || 1, displayOrder: q?.displayOrder ?? 0, isActive: q?.isActive ?? true,
          options: form.questionType === "multiple_choice" ? form.options.filter((o: any) => o.label.trim()) : [],
          textEval: form.questionType === "text_input" ? form.textEval : null,
        },
      });
      notify.create("Soal tersimpan ✅");
      onSave();
    } catch (e) { notify.error("Gagal simpan", { description: (e as Error)?.message?.slice(0, 120) }); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="mt-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold font-bricolage text-base text-brand-navy">{q?.id ? "Edit Soal" : "Tambah Soal"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block font-manrope text-xs font-semibold text-foreground">Dimensi
            <Select value={String(form.dimensionId)} onValueChange={(v) => patch("dimensionId", v)}>
              <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{dims.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="block font-manrope text-xs font-semibold text-foreground">Tipe
            <Select value={form.questionType} onValueChange={(v) => patch("questionType", v)}>
              <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Pilihan Ganda</SelectItem>
                <SelectItem value="text_input">Isian (TEXT)</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="block font-manrope text-xs font-semibold text-foreground md:col-span-2">Teks soal (dukung LaTeX $…$ bila tanda)
            <Input className="mt-1" value={form.questionText} onChange={(e) => patch("questionText", e.target.value)} placeholder="cth: Hitung hasil dari $\\frac{3}{4} + 0.125$" />
          </label>
          <label className="block font-manrope text-xs font-semibold text-foreground">Bobot
            <Input type="number" className="mt-1" value={form.weight} onChange={(e) => patch("weight", Number(e.target.value))} />
          </label>
          <label className="block font-manrope text-xs font-semibold text-foreground">Gambar (opsional)
            <Input className="mt-1" value={form.mediaUrl} onChange={(e) => patch("mediaUrl", e.target.value)} placeholder="URL gambar / R2" />
          </label>
        </div>

        {form.questionType === "multiple_choice" ? (
          <div className="mt-4 space-y-2">
            <p className="font-manrope text-xs font-semibold text-foreground">Opsi Jawaban (label + skor)</p>
            {form.options.map((o: any, i: number) => (
              <div key={i} className="flex gap-2">
                <Input className="flex-1" placeholder={`Opsi ${o.optionValue}`} value={o.label} onChange={(e) => patchOpt(i, "label", e.target.value)} />
                <Input type="number" className="w-20" value={o.score} onChange={(e) => patchOpt(i, "score", Number(e.target.value))} title="Skor ke dimensi" />
                {form.options.length > 2 && <button onClick={() => patch("options", form.options.filter((_: any, x: number) => x !== i))} className="text-red-400"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
            {form.options.length < 6 && (
              <Button size="sm" variant="outline" onClick={() => patch("options", [...form.options, { optionValue: String.fromCharCode(65 + form.options.length), label: "", score: 0 }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Tambah opsi
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <p className="font-manrope text-xs font-semibold text-foreground md:col-span-2">Aturan penilaian isian</p>
            <label className="block font-manrope text-xs text-foreground">Metode
              <Select value={form.textEval.evaluationType} onValueChange={(v) => patch("textEval", { ...form.textEval, evaluationType: v })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact_match">Persis (teks/angka)</SelectItem>
                  <SelectItem value="numeric_tolerance">Angka (toleransi)</SelectItem>
                  <SelectItem value="keyword_match">Mengandung kata kunci</SelectItem>
                  <SelectItem value="pattern_match">Pola (regex)</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="block font-manrope text-xs text-foreground">Kunci jawaban
              <Input className="mt-1" value={form.textEval.answerKey} onChange={(e) => patch("textEval", { ...form.textEval, answerKey: e.target.value })} placeholder="cth: 0.75 / 3/4" />
            </label>
            {form.textEval.evaluationType === "numeric_tolerance" && (
              <label className="block font-manrope text-xs text-foreground md:col-span-2">Toleransi (cth 0.01)
                <Input className="mt-1" value={form.textEval.numericTolerance} onChange={(e) => patch("textEval", { ...form.textEval, numericTolerance: e.target.value })} />
              </label>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button className="bg-brand-navy hover:bg-brand-navy-light" onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-1 h-4 w-4" />} Simpan Soal
          </Button>
        </div>
      </div>
    </div>
  );
}