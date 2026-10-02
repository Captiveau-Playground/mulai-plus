"use client";

import { ArrowRight, CheckCircle2, Clock, List, Loader2, Pause, Play, PlayCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Latex } from "@/components/assessment/latex";

interface Q {
  id: string;
  dimensionId: string;
  questionText: string;
  hasMathNotation?: boolean;
  mediaUrl?: string | null;
  mediaCaption?: string | null;
  questionType: string;
  presentationMode?: string;
  opts: { id: string; optionValue: string; label: string; imageUrl?: string | null; icon?: string | null }[];
}
interface Dim {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}
interface Sect {
  id: string;
  title: string;
  contentType: string;
  contentJson: { text?: string; items?: string[]; cards?: { title: string; desc: string }[] };
}
interface Ins {
  id: string;
  dimensionId: string;
  header?: string | null;
  contentType: string;
  contentJson: { text?: string; items?: string[] };
}

/** Renderer engine TALENT™ (Fase 1): sections, instruction per dimensi, pause/resume, preview, gamification, CAT-lite. */
export function EngineRun({ code, defaultVersionId }: { code: string; defaultVersionId?: string | null }) {
  const { data: session } = useSearchParamsSafe();
  const search = useSearchParams();
  const preview = search?.get("preview") === "1";
  const verIdParam = search?.get("v") ?? defaultVersionId ?? null;
  const codeQ = code;
  const [studentId, setStudentId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"load" | "intro" | "instruction" | "run" | "done">("load");
  const [err, setErr] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [dims, setDims] = useState<Dim[]>([]);
  const [sections, setSections] = useState<Sect[]>([]);
  const [instructions, setInstructions] = useState<Ins[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { opt?: string; text?: string }>>({});
  const [textVal, setTextVal] = useState("");
  const [pending, setPending] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [instDim, setInstDim] = useState<string | null>(null);
  const [timer, setTimer] = useState<{ serverNowISO: string; expectedEndISO: string } | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [runSections, setRunSections] = useState<{ key: string; title: string; from: number; to: number }[]>([]);
  const [cp, setCp] = useState<{ next: number; done: number } | null>(null);
  const [lang, setLang] = useState<"id" | "en">("id");
  const t = useMemo(() => dict(lang), [lang]);
  const [sectionMode, setSectionMode] = useState("none");
  const lastSec = useRef<number | null>(null);

  const dimStart = useRef(0);
  const dimElapsed = useRef<Record<string, number>>({});
  const renderedDim = useRef<string | null>(null);

  const dimsBy = useMemo(() => new Map(dims.map((d) => [d.id, d])), [dims]);
  const insBy = useMemo(() => new Map(instructions.map((i) => [i.dimensionId, i])), [instructions]);

  const load = useCallback(async () => {
    setPhase("load");
    try {
      const cfg = verIdParam
        ? ((await client.discover.config({ versionId: verIdParam })) as any)
        : ((await client.discover.config({ code: codeQ })) as any);
      if (!cfg?.ok) { setErr("Talent belum tersedia."); setPhase("intro"); return; }
      setQuestions((cfg.questions as Q[]).filter((q: any) => q.isActive));
      setDims(cfg.dimensions ?? []);
      setSections(cfg.sections ?? []);
      setInstructions(cfg.instructions ?? []);
      setRunSections(cfg.runSections ?? []);
      setLang((cfg.config?.lang as any) === "en" ? "en" : "id");
      setSectionMode(cfg.config?.section_mode ?? "none");
      setPhase("intro");
    } catch (e) {
      setErr((e as Error)?.message ?? "Gagal memuat");
      setPhase("intro");
    }
  }, []);

  useEffect(() => { if (phase === "load") void load(); }, [phase, load]);

  const uid = useMemo(() => {
    if (preview) return "preview-" + Math.random().toString(36).slice(2, 9);
    return session?.user?.id ?? "";
  }, [preview, session]);

  const start = async () => {
    if (!uid && !preview) { window.location.href = "/login?callbackUrl=%2Fassessment%2Ftalent"; return; }
    setPending(true);
    try {
      const r = (await client.discover.start({ code: codeQ, studentId: uid || "preview-" + Math.random().toString(36).slice(2, 9), versionId: verIdParam ?? undefined })) as any;
      setSessionId(r.sessionId);
      setTimer(r.serverTimer ?? null);
      if (r.serverTimer) setRemaining(deltaSeconds(r.serverTimer));
      dimStart.current = Date.now();
      renderedDim.current = null;
      lastSec.current = null;
      setIdx(0);
      enterOrRun(questions[0]!);
    } catch (e) { setErr((e as Error)?.message ?? "Gagal mulai"); } finally { setPending(false); }
  };

  const resume = async () => {
    setPending(true);
    try {
      const det = (await client.discover.session({ sessionId: activeSession.id })) as any;
      // Muat KONTEN VERSI SESI (bukan versi live terbaru) — integritas v1/v2
      const cfgV = (await client.discover.config({ versionId: det.session.versionId })) as any;
      const qsV = (cfgV.questions ?? []).filter((q: any) => q.isActive) as Q[];
      const dimsV = (cfgV.dimensions ?? []) as Dim[];
      setQuestions(qsV);
      setDims(dimsV);
      setSections(cfgV.sections ?? []);
      setInstructions(cfgV.instructions ?? []);
      setRunSections(cfgV.runSections ?? []);
      setLang((cfgV.config?.lang as any) === "en" ? "en" : "id");
      setSectionMode(cfgV.config?.section_mode ?? "none");
      const saved = new Set(det.answers?.map((a: any) => a.questionId) ?? []);
      const map: Record<string, { opt?: string; text?: string }> = {};
      const optsById = new Map<string, string>();
      for (const q of qsV) for (const o of q.opts) optsById.set(o.id, o.optionValue);
      for (const a of det.answers ?? []) map[a.questionId] = a.optionId ? { opt: optsById.get(a.optionId) ?? a.optionId } : { text: a.text };
      const firstUnanswered = qsV.findIndex((q) => !saved.has(q.id));
      setAnswers(map);
      setSessionId(det.session.id);
      setTimer(det.session.configJson?.timer ?? null);
      dimStart.current = Date.now();
      renderedDim.current = null;
      lastSec.current = null;
      const startIdx = firstUnanswered >= 0 ? firstUnanswered : 0;
      setIdx(startIdx);
      enterOrRun(qsV[startIdx]!);
    } catch (e) { setErr((e as Error)?.message ?? "Gagal resume"); } finally { setPending(false); }
  };

  const checkActive = async () => {
    if (!uid || preview) return;
    try {
      const r = (await client.discover.mySessions({ studentId: uid, code: "TALENT" })) as any;
      const act = r.items?.[0];
      if (act) setActiveSession(act);
    } catch { /* ignore */ }
  };

  useEffect(() => { if (session?.user?.id && phase === "intro") void checkActive(); }, [session, phase]);
  useEffect(() => { if (uid) setStudentId(uid); }, [uid]);

  const enterOrRun = (q: Q) => {
    if (!q) { void finishRun(); return; }
    const secNow = secIndex(q.id === questions[idx]?.id ? idx : 0);
    if (sectionMode === "by_dimension" && secNow !== lastSec.current) {
      lastSec.current = secNow;
      setInstDim(q.dimensionId);
      setPhase("instruction");
    } else {
      lastSec.current = secIndex(idx);
      setPhase("run");
    }
  };

  const startDimension = () => { dimStart.current = Date.now(); setPhase("run"); };

  const current = questions[idx];
  const secIndex = (pos: number) => runSections.findIndex((sc) => pos >= sc.from && pos <= sc.to);
  const curSec = secIndex(idx);
  const secLabel = curSec >= 0 ? runSections[curSec]?.title ?? "" : "";

  const nextIdx = () => {
    // CAT-lite: pilih soal berikutnya dari dimensi yang paling sedikit terjawab
    const dimCount = new Map<string, number>();
    for (const q of questions) {
      const answered = answers[q.id] !== undefined;
      if (!answered && q.dimensionId) dimCount.set(q.dimensionId, (dimCount.get(q.dimensionId) ?? 0) + 0);
    }
    for (const q of questions) {
      if (q.dimensionId && answers[q.id] !== undefined) dimCount.set(q.dimensionId, (dimCount.get(q.dimensionId) ?? 0) + 1);
    }
    let best = -1;
    let bestCount = Infinity;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      if (q.id in answers) continue;
      const c = dimCount.get(q.dimensionId) ?? 0;
      if (c < bestCount) { bestCount = c; best = i; }
    }
    return best;
  };

  const answer = async (optionId: string) => {
    if (!current || pending) return;
    setPending(true);
    setAnswers((a) => ({ ...a, [current.id]: { opt: optionId } }));
    await client.discover.submit({ sessionId, questionId: current.id, optionId });
    advance();
    setPending(false);
  };

  const submitText = async () => {
    if (!current || !textVal.trim() || pending) return;
    setPending(true);
    await client.discover.submitText({ sessionId, questionId: current.id, textAnswer: textVal });
    setAnswers((a) => ({ ...a, [current.id]: { text: textVal } }));
    setTextVal("");
    advance();
    setPending(false);
  };

  const advance = () => {
    if (current?.dimensionId) {
      dimElapsed.current[current.dimensionId] = (dimElapsed.current[current.dimensionId] ?? 0) + (Date.now() - dimStart.current) / 1000;
      dimStart.current = Date.now();
    }
    const n = nextIdx();
    if (n >= 0) {
      const fromSec = curSec;
      const toSec = secIndex(n);
      if (fromSec >= 0 && toSec > fromSec && toSec < runSections.length) {
        setCp({ next: n, done: Object.keys(answers).length });
      } else {
        setIdx(n); enterOrRun(questions[n]!);
      }
    }
    else void finishRun();
  };

  const pause = async () => {
    if (!sessionId) return;
    await client.discover.pause({ sessionId, currentDimensionId: current?.dimensionId });
    setPhase("intro");
    setActiveSession(null);
    window.location.hash = "paused";
  };

  const finishRun = async () => {
    if (!sessionId || pending) return;
    setPending(true);
    try {
      const r = (await client.discover.finish({ sessionId, durations: dimElapsed.current })) as any;
      setResult(r);
      setPhase("done");
      try { confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } }); } catch { /* ignore */ }
    } catch (e) { setErr((e as Error)?.message ?? "Gagal selesai"); } finally { setPending(false); }
  };

  useEffect(() => {
    if (!timer) return;
    const t = setInterval(() => {
      const left = deltaSeconds(timer);
      setRemaining(left);
      if (left !== null && left <= 0) void finishRun();
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, sessionId]);

  const previewBanner = preview ? (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 font-manrope text-xs text-amber-800">
      Mode <b>Preview (admin)</b> — hasil tidak terhubung ke akun & tidak mencemari data.
    </div>
  ) : null;

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        {previewBanner}

        {/* INTRO */}
        {phase === "intro" && (
          <div className="mx-auto max-w-xl rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-lg shadow-brand-navy/5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/5 px-3 py-1 font-manrope text-xs font-semibold text-teal-700">
              <Sparkles className="h-3.5 w-3.5" /> {codeQ === "DISCOVER" ? "Tes Minat · Holland" : "Tes Bakat · Kemampuan"}
            </span>
            <h1 className="mt-4 font-bold font-bricolage text-3xl text-brand-navy">{codeQ === "DISCOVER" ? "Kenali Minatmu" : "Kenali Kekuatan Bakatmu"}</h1>
            <p className="mt-2 font-manrope text-sm text-gray-500">{questions.length} soal{runSections.length > 1 ? ` · ${runSections.length} bagian` : ""} · jawaban tersimpan otomatis</p>
            {sections.map((sx) => (
              <div key={sx.id} className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-left">
                <p className="font-bold font-bricolage text-sm text-brand-navy">{sx.title}</p>
                {sx.contentType === "bullet_list" && <ul className="mt-1 space-y-1">{((sx.contentJson ?? {}).items ?? []).map((it: string, ii: number) => <li key={ii} className="flex items-start gap-2 font-manrope text-xs text-gray-600">• {it}</li>)}</ul>}
                {sx.contentType === "description" && <p className="mt-1 font-manrope text-xs text-gray-600">{(sx.contentJson ?? {}).text}</p>}
              </div>
            ))}
            {err && <p className="mt-3 font-manrope text-xs text-red-500">{err}</p>}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {dims.map((d) => <span key={d.id} className="rounded-full bg-brand-navy/5 px-3 py-1 font-manrope text-[11px] font-semibold text-brand-navy">{d.name}</span>)}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button onClick={start} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-8 py-3.5 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:bg-brand-navy-light active:scale-[0.98] disabled:opacity-60">
                {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />} {t.start}
              </button>
              {activeSession && (
                <button onClick={() => void resume()} className="inline-flex items-center gap-2 rounded-xl border border-teal-500/40 bg-teal-500/5 px-6 py-3.5 font-bold font-manrope text-sm text-teal-700 transition-all hover:bg-teal-500/10">
                  <Play className="h-4 w-4" /> Lanjutkan Tes
                </button>
              )}
            </div>
          </div>
        )}

{phase === "instruction" && instDim && (
          <div className="rounded-3xl border border-teal-100 bg-teal-50/30 p-8 text-center sm:p-10">
            <span className="rounded-full bg-teal-500/10 px-3 py-1 font-manrope text-xs font-semibold text-teal-700">Bagian {dimsBy.get(instDim)?.name}</span>
            {(() => {
              const ins = insBy.get(instDim);
              const desc = dimsBy.get(instDim)?.description;
              return (
                <>
                  <h2 className="mt-3 font-bold font-bricolage text-xl text-brand-navy">{ins?.header ?? "Instruksi"}</h2>
                  {desc && <p className="mt-2 font-manrope text-sm text-gray-500">{desc}</p>}
                  {ins && ins.contentType === "bullet_list" && (
                    <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left">
                      {(ins.contentJson.items ?? []).map((it, i) => (
                        <li key={i} className="flex items-start gap-2 font-manrope text-sm text-gray-600">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" /> {it}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              );
            })()}
            <button onClick={startDimension} className="mt-6 rounded-xl bg-teal-600 px-8 py-3.5 font-bold font-manrope text-sm text-white shadow-lg transition-all hover:bg-teal-700">
              {t.beginSection}
            </button>
          </div>
        )}

        {/* RUN */}
        {phase === "run" && current && (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg shadow-brand-navy/5 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
              </div>
              <span className="shrink-0 font-manrope text-xs font-semibold text-gray-400 tabular-nums">{Object.keys(answers).length}/{questions.length}</span>
              {remaining !== null && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 font-manrope text-[11px] font-semibold text-amber-700">
                  <Clock className="h-3 w-3" /> {fmt(remaining)}
                </span>
              )}
            </div>

            <p className="mt-5 font-manrope text-[10px] font-semibold tracking-wide text-teal-600 uppercase">
              {secLabel ? `${secLabel} · ` : ""}{dimsBy.get(current.dimensionId)?.name ?? "Soal"}
            </p>
            <h3 className="mt-1 font-bold font-bricolage text-lg text-gray-900 leading-snug">
              {current.hasMathNotation ? <Latex text={current.questionText} /> : current.questionText}
            </h3>
            {current.mediaUrl && (
              <figure className="mt-3">
                <img src={current.mediaUrl} alt={current.mediaCaption ?? "Diagram soal"} className="mx-auto max-h-64 rounded-xl border border-gray-100 object-contain" />
                {current.mediaCaption && <figcaption className="mt-1 text-center font-manrope text-[11px] text-gray-400">{current.mediaCaption}</figcaption>}
              </figure>
            )}

            {current.questionType === "text_input" ? (
              <div className="mt-5 flex gap-2">
                <input value={textVal} onChange={(e) => setTextVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitText()} placeholder={t.answerPlaceholder} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-manrope text-sm outline-none focus:border-teal-500" />
                <button onClick={submitText} disabled={pending} className="rounded-xl bg-teal-600 px-5 py-3 font-manrope text-sm font-semibold text-white transition-all hover:bg-teal-700 disabled:opacity-60">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "{t.send}"}
                </button>
              </div>
            ) : (
              <div className={current.presentationMode === "visual_comparison" ? "mt-5 grid gap-3 sm:grid-cols-2" : "mt-5 grid gap-2.5 sm:grid-cols-2"}>
                {current.opts.map((o) => {
                  const emoji = current.presentationMode === "emoji_option" && o.icon;
                  const hasImg = !!o.imageUrl;
                  return (
                    <button key={o.id} onClick={() => answer(o.id)} disabled={pending}
                      className={`group flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left transition-all hover:border-teal-500/50 hover:bg-teal-500/5 ${current.presentationMode === "visual_comparison" ? "min-h-28 justify-center" : ""} disabled:opacity-60`}>
                      {hasImg && <img src={o.imageUrl!} alt="" className="h-12 w-12 rounded-lg object-contain" />}
                      {emoji && <span className="text-2xl">{emoji}</span>}
                      <span className="font-manrope text-sm text-gray-700">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button onClick={() => void pause()} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-manrope text-xs font-semibold text-gray-500 transition-all hover:bg-gray-100">
                <Pause className="h-3.5 w-3.5" /> {t.pause}
              </button>
              <span className="font-manrope text-[11px] text-gray-400">{t.autosave}</span>
            </div>
          </div>
        )}

        {/* CHECKPOINT ANTAR BAGIAN */}
        {cp && (
          <div className="rounded-3xl border border-brand-orange/25 bg-white p-8 text-center shadow-xl shadow-brand-orange/5 sm:p-10">
            <span className="text-4xl">🎯</span>
            <h2 className="mt-3 font-bold font-bricolage text-2xl text-brand-navy">Bagian {curSec + 1}/{runSections.length} selesai!</h2>
            <p className="mt-2 font-manrope text-sm text-gray-500">
              {cp.done}/{questions.length} soal terjawab · <b className="text-brand-orange">+10 XP</b> · streak 🔥
            </p>
            <p className="mx-auto mt-2 max-w-sm font-manrope text-xs text-gray-400">{t.restHint}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => { setCp(null); setIdx(cp.next); enterOrRun(questions[cp.next]!); }} className="rounded-xl bg-brand-navy px-7 py-3.5 font-bold font-manrope text-sm text-white shadow-lg transition-all hover:bg-brand-navy-light">
                {t.continueTo} {runSections[secIndex(cp.next)]?.title ?? "bagian berikutnya"} →
              </button>
              <button onClick={() => { void pause(); setCp(null); }} className="rounded-xl border border-gray-200 px-6 py-3.5 font-manrope text-sm font-semibold text-gray-600 hover:bg-gray-50">
                {t.rest}
              </button>
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && (
          <div className="rounded-3xl border border-teal-100 bg-teal-50/40 p-8 text-center sm:p-10">
            <CheckCircle2 className="mx-auto h-10 w-10 text-teal-600" />
            <h2 className="mt-3 font-bold font-bricolage text-2xl text-brand-navy">{preview ? "Preview selesai" : "{t.done}"}</h2>
            {result?.profileCode && (
              <div className="mt-4">
                <p className="font-manrope text-xs uppercase tracking-widest text-gray-400">{t.profile}</p>
                <p className="mt-1 font-bold font-bricolage text-3xl text-teal-700">{result.profileCode}</p>
              </div>
            )}
            {result?.recommendations?.length > 0 && (
              <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 text-left">
                <p className="font-manrope text-xs font-semibold text-gray-500">Jurusan yang cocok utkmu</p>
                <div className="mt-2 space-y-1.5">
                  {(result.recommendations as any[]).slice(0, 5).map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-manrope text-sm font-semibold text-brand-navy">{r.categoryName}</p>
                        <p className="font-manrope text-[10px] text-gray-400">{r.careers?.slice(0, 3).join(" · ") ?? ""}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-teal-500/10 px-2 py-0.5 font-manrope text-[10px] font-semibold text-teal-700">{r.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(result?.xpEarned ?? 0) > 0 && (
              <p className="mt-3 font-manrope text-sm font-semibold text-brand-orange">
                +{result.xpEarned} XP · streak 🔥 {result.streak} bagian
              </p>
            )}
            {result?.timedOut && <p className="mt-2 font-manrope text-[11px] text-amber-600">Waktu habis — jawaban yang terisi otomatis dikirim & diverifikasi.</p>}
            {result?.topDimensions && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {(result.topDimensions as string[]).map((c) => (
                  <span key={c} className="rounded-lg bg-white px-3 py-1 font-bold font-bricolage text-brand-navy shadow-sm">{c}</span>
                ))}
              </div>
            )}
            <button onClick={() => { setResult(null); setAnswers({}); setSessionId(""); setPhase("intro"); }} className="mt-7 rounded-xl bg-brand-navy px-6 py-3 font-manrope text-sm font-semibold text-white transition-all hover:bg-brand-navy-light">
              {preview ? "Preview ulang" : "Ulangi Tes"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function dict(lang: "id" | "en") {
  const id = {
    start: "Mulai Sekarang",
    beginSection: "Mulai Bagian Ini",
    done: "Tes Selesai! 🎉",
    profile: "Talent Profile",
    answerPlaceholder: "Tulis jawaban (mis. 3/4 atau 0.75)…",
    send: "Kirim",
    autosave: "Semua jawaban auto-tersimpan",
    pause: "Berhenti & lanjutkan nanti",
    sectionDone: "Bagian selesai!",
    continueTo: "Lanjut ke",
    rest: "Istirahat dulu",
    restHint: "Istirahat sebentar? Jawaban sudah tersimpan otomatis.",
  };
  if (lang === "en") {
    return {
      start: "Start now",
      beginSection: "Start this section",
      done: "Test completed! 🎉",
      profile: "Talent Profile",
      answerPlaceholder: "Type your answer (e.g. 3/4 or 0.75)…",
      send: "Submit",
      autosave: "All answers are auto-saved",
      pause: "Pause & continue later",
      sectionDone: "Section done!",
      continueTo: "Continue to",
      rest: "Take a break",
      restHint: "Take a break? Your answers are saved automatically.",
    };
  }
  return id;
}

function useSearchParamsSafe() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return authClient.useSession();
}
function deltaSeconds(t: { serverNowISO: string; expectedEndISO: string }) {
  const total = (new Date(t.expectedEndISO).getTime() - new Date(t.serverNowISO).getTime()) / 1000;
  return total > 0 ? Math.max(0, Math.round((new Date(t.expectedEndISO).getTime() - Date.now()) / 1000)) : null;
}
function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}