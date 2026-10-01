"use client";

import { ArrowRight, CheckCircle2, Clock, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Latex } from "@/components/assessment/latex";

interface Q {
  id: string;
  dimensionId: string;
  questionText: string;
  hasMathNotation?: boolean;
  mediaUrl?: string | null;
  mediaCaption?: string | null;
  questionType: string;
  weight?: number;
  opts: { id: string; optionValue: string; label: string; imageUrl?: string | null }[];
}
interface Dim {
  id: string;
  code: string;
  name: string;
  shortName?: string | null;
  description?: string | null;
}

/** Renderer engine TALENT (Fase 2) — halaman baru; tidak menyentuh /assessment/bakat. */
export default function TalentAssessmentPage() {
  const { data: session } = authClient.useSession();
  const [phase, setPhase] = useState<"load" | "intro" | "run" | "done">("load");
  const [err, setErr] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [dims, setDims] = useState<Dim[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textVal, setTextVal] = useState("");
  const [pending, setPending] = useState(false);
  const [timer, setTimer] = useState<{ serverNowISO: string; expectedEndISO: string } | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);

  const dimStart = useRef(0);
  const dimElapsed = useRef<Record<string, number>>({});
  const lastDim = useRef<string | null>(null);

  const dimsBy = useMemo(() => new Map(dims.map((d) => [d.id, d])), [dims]);

  const load = useCallback(async () => {
    setPhase("load");
    try {
      const cfg = (await client.discover.config({ code: "TALENT" })) as any;
      if (!cfg?.ok) {
        setErr("Asesmen Talent belum dipublikasikan. Coba lagi nanti.");
        setPhase("intro");
        return;
      }
      const active = (cfg.questions as Q[]).filter((q) => (q as any).isActive);
      setQuestions(active);
      setDims(cfg.dimensions ?? []);
      setPhase("intro");
    } catch (e) {
      setErr((e as Error)?.message ?? "Gagal memuat asesmen");
      setPhase("intro");
    }
  }, []);

  useEffect(() => {
    if (phase === "load") load();
  }, [phase, load]);

  const start = async () => {
    if (!session?.user) {
      window.location.href = "/login?callbackUrl=%2Fassessment%2Ftalent";
      return;
    }
    setPending(true);
    try {
      const r = (await client.discover.start({ code: "TALENT", studentId: session.user.id })) as any;
      setSessionId(r.sessionId);
      setTimer(r.serverTimer ?? null);
      if (r.serverTimer) setRemaining(deltaSeconds(r.serverTimer));
      dimStart.current = Date.now();
      lastDim.current = questions[0]?.dimensionId ?? null;
      setPhase("run");
    } catch (e) {
      setErr((e as Error)?.message ?? "Gagal memulai");
    } finally {
      setPending(false);
    }
  };

  // countdown timer (server-bound perhitungan)
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

  const current = questions[idx];

  const answer = async (optionId: string) => {
    if (!current || pending) return;
    setPending(true);
    setAnswers((a) => ({ ...a, [current.id]: optionId }));
    await client.discover.submit({ sessionId, questionId: current.id, optionId });
    nextTick();
    setPending(false);
  };

  const submitText = async () => {
    if (!current || !textVal.trim() || pending) return;
    setPending(true);
    await client.discover.submitText({ sessionId, questionId: current.id, textAnswer: textVal });
    setAnswers((a) => ({ ...a, [current.id]: textVal }));
    setTextVal("");
    nextTick();
    setPending(false);
  };

  const nextTick = () => {
    // akumulasi waktu per dimensi
    if (current?.dimensionId) {
      const now = Date.now();
      const label = dimsBy.get(current.dimensionId)?.name ?? current.dimensionId;
      dimElapsed.current[current.dimensionId] = (dimElapsed.current[current.dimensionId] ?? 0) + (now - dimStart.current) / 1000;
      dimStart.current = now;
      lastDim.current = current.dimensionId;
      void label;
    }
    if (idx + 1 < questions.length) {
      setIdx((i) => i + 1);
    } else {
      void finishRun();
    }
  };

  const finishRun = async () => {
    if (!sessionId || pending) return;
    setPending(true);
    try {
      const r = (await client.discover.finish({ sessionId, durations: dimElapsed.current })) as any;
      setResult(r);
      setPhase("done");
    } catch (e) {
      setErr((e as Error)?.message ?? "Gagal menyelesaikan");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        {/* Intro */}
        {phase === "intro" && (
          <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-lg shadow-brand-navy/5 sm:p-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/5 px-3 py-1 font-manrope text-xs font-semibold text-teal-700">
              <Sparkles className="h-3.5 w-3.5" /> MULAI Talent™ — Tes Bakat
            </span>
            <h1 className="mt-4 font-bold font-bricolage text-3xl text-brand-navy sm:text-4xl">
              Kenali Kekuatan Bakatmu
            </h1>
            <p className="mx-auto mt-3 max-w-md font-manrope text-sm text-gray-500">
              {dims.length > 0
                ? `${dims.length} dimensi bakat · ${questions.length} soal · gratis.`
                : "Asesmen bakat berbasis engine generik (Fase 2)."}
            </p>
            {err && <p className="mt-3 font-manrope text-xs text-red-500">{err}</p>}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {dims.slice(0, 9).map((d) => (
                <span key={d.id} className="rounded-full bg-brand-navy/5 px-3 py-1 font-manrope text-[11px] font-semibold text-brand-navy">
                  {d.name}
                </span>
              ))}
            </div>
            <button
              onClick={start}
              disabled={pending}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-navy px-8 py-4 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:bg-brand-navy-light active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
              Mulai Sekarang
            </button>
            <p className="mt-3 font-manrope text-[11px] text-gray-400">
              Sudah selesai? <Link href="/dashboard/student/assessment" className="text-brand-navy underline underline-offset-2">Ke dashboard</Link>
            </p>
          </div>
        )}

        {/* Soal */}
        {phase === "run" && current && (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg shadow-brand-navy/5 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
              </div>
              <span className="shrink-0 font-manrope text-xs font-semibold text-gray-400 tabular-nums">{idx + 1}/{questions.length}</span>
              {remaining !== null && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 font-manrope text-[11px] font-semibold text-amber-700">
                  <Clock className="h-3 w-3" /> {fmt(remaining)}
                </span>
              )}
            </div>

            <p className="mt-5 font-manrope text-[10px] font-semibold tracking-wide text-teal-600 uppercase">
              {dimsBy.get(current.dimensionId)?.name ?? "Soal"}
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
                <input
                  value={textVal}
                  onChange={(e) => setTextVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitText()}
                  placeholder="Tulis jawaban (mis. 3/4 atau 0.75)…"
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-manrope text-sm outline-none focus:border-teal-500"
                />
                <button onClick={submitText} disabled={pending} className="rounded-xl bg-teal-600 px-5 py-3 font-manrope text-sm font-semibold text-white transition-all hover:bg-teal-700 disabled:opacity-60">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim"}
                </button>
              </div>
            ) : (
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {current.opts.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => answer(o.id)}
                    disabled={pending}
                    className="group flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left transition-all hover:border-teal-500/50 hover:bg-teal-500/5 disabled:opacity-60"
                  >
                    {o.imageUrl && <img src={o.imageUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />}
                    <span className="font-manrope text-sm text-gray-700">{o.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hasil */}
        {phase === "done" && (
          <div className="rounded-3xl border border-teal-100 bg-teal-50/40 p-8 text-center sm:p-10">
            <CheckCircle2 className="mx-auto h-10 w-10 text-teal-600" />
            <h2 className="mt-3 font-bold font-bricolage text-2xl text-brand-navy">Tes Selesai! 🎉</h2>
            {result?.profileCode && (
              <div className="mt-4">
                <p className="font-manrope text-xs uppercase tracking-widest text-gray-400">Talent Profile</p>
                <p className="mt-1 font-bold font-bricolage text-3xl text-teal-700">{result.profileCode}</p>
              </div>
            )}
            {result?.topDimensions && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {(result.topDimensions as string[]).map((c) => (
                  <span key={c} className="rounded-lg bg-white px-3 py-1 font-bold font-bricolage text-brand-navy shadow-sm">{c}</span>
                ))}
              </div>
            )}
            <button onClick={() => { setResult(null); setIdx(0); setAnswers({}); setPhase("intro"); }} className="mt-7 rounded-xl bg-brand-navy px-6 py-3 font-manrope text-sm font-semibold text-white transition-all hover:bg-brand-navy-light">
              Ulangi Tes
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function deltaSeconds(t: { serverNowISO: string; expectedEndISO: string }) {
  const total = (new Date(t.expectedEndISO).getTime() - new Date(t.serverNowISO).getTime()) / 1000;
  const left = (new Date(t.expectedEndISO).getTime() - Date.now()) / 1000;
  return total > 0 ? Math.max(0, Math.round(left)) : null;
}
function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}