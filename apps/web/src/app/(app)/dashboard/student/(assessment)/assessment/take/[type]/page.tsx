"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { ArrowRight, Check, Flame, Home, Sparkles, Timer, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { EngineRun } from "@/components/assessment/engine-run";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

type Question = {
  id: string;
  text: string;
  dimension: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  answered: string | null;
};

function fireConfetti() {
  const colors = ["#1a1f6d", "#0d9488", "#fe9114", "#f93447"];
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0 }, colors }), 250);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1 }, colors }), 400);
}

export default function TmbTestPage() {
  const t = String(useParams().type ?? "");
  if (t === "DISCOVER" || t === "TALENT") return <EngineWrapper code={t} />;
  return <LegacyWizard />;
}

function EngineWrapper({ code }: { code: string }) {
  const [ready, setReady] = useState<{ sessionId: string; questions: any[]; dims: any[]; otherCode: string; otherLabel: string; studentId: string; sections: number } | null>(null);
  const [errg, setErrg] = useState("");
  const { data: authSession } = authClient.useSession();
  const startedRef = useRef(false);
  useEffect(() => {
    if (!authSession?.user?.id) return;
    if (startedRef.current) return; // StrictMode/dev double-mount → jangan start 2x
    startedRef.current = true;
    (async () => {
      try {
        const sid = authSession!.user!.id;
        const cfg = (await client.discover.config({ code } as any)) as any;
        let st: any = { sessionId: "" };
        try { st = (await client.discover.start({ code, studentId: sid, versionId: null } as any)) as any; } catch { st = (await client.discover.start({ code, studentId: sid } as any)) as any; }
        setReady({ sessionId: st.sessionId, questions: (cfg.questions ?? []).filter((q: any) => q.isActive), dims: cfg.dimensions ?? [], otherCode: code === "DISCOVER" ? "TALENT" : "DISCOVER", otherLabel: code === "DISCOVER" ? "Tes Bakat" : "Tes Minat", studentId: sid, sections: (cfg.runSections ?? []).length });
      } catch (e: any) { setErrg(e?.message ?? "Gagal memuat tes"); }
    })();
  }, [code, authSession?.user?.id]);
  if (errg) return <p className="font-manrope text-sm text-red-500">{errg}</p>;
  if (!ready) return <div className="flex min-h-[40vh] items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-2 border-mentor-teal border-t-transparent" /></div>;
  return <LegacyWizard engine={{ code, sessionId: ready.sessionId, questions: ready.questions, dims: ready.dims, otherCode: ready.otherCode, otherLabel: ready.otherLabel, studentId: ready.studentId, sections: ready.sections }} />;
}

function LegacyWizard({ engine }: { engine?: { code: string; sessionId: string; questions: any[]; dims: any[]; otherCode: string; otherLabel: string; studentId: string; sections?: number } }) {
  const isEngine = !!engine;
  const engineQs = engine?.questions ?? [];
  const [eq, setEq] = useState(0);
  const [intro, setIntro] = useState<boolean | null>(isEngine ? null : false); // null = masih cek resume → jangan render intro dulu
  const introStarted = useRef(false);
  const resumeStartRef = useRef(0);
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!isEngine || !engine?.sessionId || resumedRef.current) return;
    resumedRef.current = true;
    (async () => {
      try {
        const rs = (await (client as any).discover.session({ sessionId: engine!.sessionId })) as any;
        const answered = new Set((rs?.answers ?? []).map((a: any) => a.questionId));
        if (answered.size > 0) {
          // RESUME: lewati layar intro — langsung ke pembuka dimensi / posisi belum dijawab
          const fi = engineQs.findIndex((q) => !answered.has(q.id));
          resumeStartRef.current = fi >= 0 ? fi : 0;
          setIntro(false);
        } else {
          setIntro(true); // tes baru → tampilkan info sebelum mulai
        }
      } catch { setIntro(true); }
    })();
  }, [isEngine, engine?.sessionId]);
  const otherDoneQ = useQuery({
    queryKey: ["engine-other-done", engine?.code, engine?.studentId],
    enabled: isEngine && !!engine?.studentId,
    queryFn: () => (client as any).discover.resultsFor({ code: engine!.otherCode, studentId: engine!.studentId }),
  });
  const otherDone = isEngine ? (otherDoneQ.data as any)?.present === true : false;
  const attQ = useQuery({
    queryKey: ["engine-attempts", engine?.studentId],
    enabled: isEngine && !!engine?.studentId,
    queryFn: () => (client as any).discover.attempts({ studentId: engine!.studentId }),
  });
  const attempts: any[] = (attQ.data as any)?.attempts ?? [];
  const attemptNo = attempts.length === 0 ? 1 : attempts[attempts.length - 1]?.complete ? attempts.length + 1 : attempts.length;
  const params = useParams();
  const router = useRouter();
  const testCode = isEngine
    ? (engine!.code === "DISCOVER" ? "interest" : "ability")
    : (params.type as string) === "ability" ? "ability" : "interest";
  const isInterest = testCode === "interest";
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const [demoIdx, setDemoIdx] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  const DEMO_QUESTIONS = [
    // 2 soal minat (2 opsi)
    {
      id: "dm1",
      text: "Kamu lebih menikmati kegiatan mana?",
      dimension: "Social",
      optionA: "Mengorganisir acara kematemanan bersama banyak orang",
      optionB: "Menganalisis data di depan laptop sendirian",
      optionC: null,
      optionD: null,
      correct: null,
    },
    {
      id: "dm2",
      text: "Ketika tugas kelompok, kamu paling nyaman sebagai…",
      dimension: "Enterprising",
      optionA: "Pemimpin yang menentukan arah",
      optionB: "Eksekutor yang mengeksekusi detail",
      optionC: null,
      optionD: null,
      correct: null,
    },
    // 2 soal bakat (4 opsi, kunci = B)
    {
      id: "db1",
      text: "Pilih pola yang paling logis: 2, 4, 8, 16, …",
      dimension: "Numerik",
      optionA: "20",
      optionB: "32",
      optionC: "24",
      optionD: "64",
      correct: "B",
    },
    {
      id: "db2",
      text: "Jika hari ini Rabu, 10 hari lagi hari…?",
      dimension: "Logika",
      optionA: "Jumat",
      optionB: "Sabtu",
      optionC: "Rabu",
      optionD: "Senin",
      correct: "B",
    },
  ];

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [bothDone, setBothDone] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [_correctCount, setCorrectCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [combo, setCombo] = useState(0);
  const [xpFlash, setXpFlash] = useState(0);
  const [comboPop, setComboPop] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const startRef = useRef<number>(Date.now());
  const milestonesShown = useRef<Set<string>>(new Set());
  const _answeredRef = useRef(false);

  // Guide pertama kali (keyboard, auto-next, dsb)
  useEffect(() => {
    try {
      if (localStorage.getItem("mulai-test-guide-v1")) return;
      setShowGuide(true);
    } catch {
      /* noop */
    }
  }, []);

  // Timer — waktu dihabiskan (analitik + tampilan)
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [done]);

  // Duolingo streak — hitung & simpan tanggal terakhir main
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mulai-test-streak");
      const today = new Date().toDateString();
      const prev = raw ? JSON.parse(raw) : null;
      const prevDay = prev?.day;
      const prevN = Number(prev?.n ?? 0);
      let n = 1;
      if (prevDay === today) n = Math.max(1, prevN);
      else if (prevDay === new Date(Date.now() - 864e5).toDateString()) n = Math.max(1, prevN + 1);
      setStreak(n);
      localStorage.setItem("mulai-test-streak", JSON.stringify({ day: today, n }));
    } catch {
      /* noop */
    }
  }, []);

  const optsRef = useRef<any[] | null>(null);
  const engineLoad = (i: number) => {
    const q = engineQs[i];
    if (!q) { void engineFinish(); return; }
    lastDimRef.current = q.dimensionId;
    optsRef.current = q.opts ?? [];
    setQuestion({ id: q.id, text: q.questionText, dimension: engine?.dims?.find((d: any) => d.id === q.dimensionId)?.name ?? engine?.code ?? "Soal", optionA: q.opts?.[0]?.label, optionB: q.opts?.[1]?.label, optionC: q.opts?.[2]?.label, optionD: q.opts?.[3]?.label, _optImgs: (q.opts ?? []).map((x: any) => x.imageUrl ?? null), _optIcons: (q.opts ?? []).map((x: any) => x.icon ?? null) } as unknown as Question);
    setProgress(i + 1);
    setTotal(engineQs.length);
    setEq(i);
  };
  const engineFinish = async () => {
    try { const r = (await client.discover.finish({ sessionId: engine!.sessionId } as any)) as any; setXpEarned(r?.xpEarned ?? 0); } catch { /* ok */ }
    setDone(true);
    fireConfetti();
    /* completion dicatat di SERVER (resultsFor) — no localStorage */
  };
  const [secDone, setSecDone] = useState(0);
  const [secStreak, setSecStreak] = useState(0);
  const [secOverlay, setSecOverlay] = useState<{ nextEq: number; doneName: string; nextName: string } | null>(null);
  const [secStart, setSecStart] = useState<{ eqIndex: number; name: string } | null>(null);
  const lastDimRef = useRef<string | null>(null);
  const dimNameOf = (dimId: string) => engine?.dims?.find((d: any) => d.id === dimId)?.name ?? "Bagian berikutnya";
  // indeks dimensi (0-based) utk posisi soal eq: berapa dimensi berbeda sebelum eq
  const dimIdxOf = (eqI: number) => {
    const seen = new Set<string>();
    for (let k = 0; k < eqI; k++) { const d = engineQs[k]?.dimensionId; if (d) seen.add(d); }
    return seen.size;
  };
  const totalDims = new Set(engineQs.map((q: any) => q.dimensionId).filter(Boolean)).size || engine?.sections || 1;
  const engineBegin = (i: number) => {
    const q = engineQs[i];
    if (!q) { void engineFinish(); return; }
    // Tampilkan opening dimensi saat mulai (termasuk RESUME di dimensi mana pun) & di tiap perpindahan dimensi
    if (lastDimRef.current !== q.dimensionId && (secStart || secOverlay || !lastDimRef.current)) {
      setSecStart({ eqIndex: i, name: dimNameOf(q.dimensionId) });
      lastDimRef.current = q.dimensionId;
      return;
    }
    engineLoad(i);
  };

  const engineNext = (i: number) => {
    const cur = engineQs[i - 1];
    const nxt = engineQs[i];
    const dimName = (id: string) => engine?.dims?.find((d: any) => d.id === id)?.name ?? "Bagian berikutnya";
    if (nxt && cur && cur.dimensionId !== nxt.dimensionId) {
      setSecDone((c) => c + 1);
      setSecStreak((c) => c + 1);
      setXpFlash(10);
      try { confetti({ particleCount: 60, spread: 70, origin: { y: 0.4 } }); } catch { /* ignore */ }
      setSecOverlay({ nextEq: i, doneName: dimName(cur.dimensionId), nextName: dimName(nxt.dimensionId) });
      setSecStart(null);
    } else if (i >= engineQs.length) {
      void engineFinish();
    } else {
      engineLoad(i);
      setSelected(null);
      setRevealed(false);
    }
  };

  const engineSelect = (option: string) => {
    if (revealed || !question) return;
    setSelected(option);
    setRevealed(true);
    // huruf/teks → id opsi ASLI (q.opts[i].id) — submit butuh optionId valid
    const oList = optsRef.current ?? [];
    const idx = ["A", "B", "C", "D"].indexOf(option);
    const optId = idx >= 0 ? oList[idx]?.id : oList.find((o: any) => o.id === option)?.id;
    if (!optId) { console.warn("[engine] opsi tanpa id:", option, oList); return; }
    void client.discover.submit({ sessionId: engine!.sessionId, questionId: question.id, optionId: optId } as any)
      .then((r: any) => { if (r && r.ok === false) console.warn("[engine] submit ditolak", r); })
      .catch((e: any) => console.error("[engine] submit gagal:", e?.message ?? e));
    setTimeout(() => engineNext(eq + 1), 360);
  };

  const startMutation = useMutation({
    ...orpc.tmb.assessment.start.mutationOptions(),
    onSuccess: async (data) => {
      setAttemptId(data.attemptId);
      setTotal(data.total);
      trackEvent("assessment_start", { type: testCode });
      await loadQuestion(data.attemptId);
    },
  });

  const questionQuery = useQuery({
    ...orpc.tmb.assessment.question.queryOptions({ input: { attemptId: attemptId ?? "" } }),
    enabled: !isEngine && !!attemptId && !question,
  });

  const answerMutation = useMutation({
    ...orpc.tmb.assessment.answer.mutationOptions(),
    onSuccess: (data) => {
      // ability: tunjukkan feedback benar/salah sebentar, lalu lanjut otomatis
      if (!isInterest && data.isCorrect !== null && data.isCorrect !== undefined) {
        setLastCorrect(data.isCorrect);
        if (data.isCorrect) {
          setCorrectCount((c) => c + 1);
          setXpFlash(10);
          setTimeout(() => setXpFlash(0), 900);
          const c = combo + 1;
          setCombo(c);
          if (c >= 3) {
            setComboPop(c);
            setTimeout(() => setComboPop(0), 1500);
          }
        } else {
          setCombo(0);
        }
        setTimeout(() => {
          if (data.done) {
            finishMutation.mutate({ attemptId: attemptId! });
          } else {
            setProgress(data.progress);
            setSelected(null);
            setRevealed(false);
            setLastCorrect(null);
            loadQuestion(attemptId!);
          }
        }, 800);
        return;
      }

      if (data.done) {
        finishMutation.mutate({ attemptId: attemptId! });
      } else {
        setProgress(data.progress);
        setSelected(null);
        setRevealed(false);
        loadQuestion(attemptId!);
      }
    },
  });

  const finishMutation = useMutation({
    ...orpc.tmb.assessment.finish.mutationOptions(),
    onSuccess: (data) => {
      setDone(true);
      setBothDone(!!data.bothDone);
      setResultId(data.resultId ?? null);
      trackEvent("assessment_completed", { type: testCode, both_done: !!data.bothDone });
      setXpEarned(isInterest ? 50 : 100);
      fireConfetti();
      queryClient.invalidateQueries({ queryKey: orpc.tmb.assessment.list.key() });
    },
  });

  // Motivasi tengah jalan (Duolingo-style)
  const showMilestone = (pct: number) => {
    if (banner) return;
    const item = Math.round(pct / 10) * 10;
    if (milestonesShown.current.has(String(item))) return;
    milestonesShown.current.add(String(item));
    let msg: string | null = null;
    if (pct >= 90) msg = "Dikit lagi selesai — kamu hebat! 💪";
    else if (pct >= 60) msg = "Tinggal sedikit lagi! Lanjutkan 🚀";
    else if (pct >= 45) msg = "Setengah jalan — pertahankan! 🏁";
    else if (pct >= 20) msg = "Bagus! Teruskan momentummu ✨";
    if (msg) {
      setBanner(msg);
      setTimeout(() => setBanner(null), 2600);
    }
  };

  const loadQuestion = async (id: string) => {
    if (isEngine) return;
    try {
      const q = await queryClient.fetchQuery({
        ...orpc.tmb.assessment.question.queryOptions({ input: { attemptId: id } }),
      });
      if (q.done) {
        setDone(true);
        setBothDone(false);
        return;
      }
      setQuestion(q.question);
      setProgress(q.progress);
      setTotal(q.total);
      showMilestone((q.progress / (q.total || 1)) * 100);
    } catch {
      /* ignore */
    }
  };

  // auto-start
  useEffect(() => {
    if (isEngine) {
      if (intro !== false) return; // null (cek resume) / true (layar info) → tunggu
      if (!introStarted.current) { introStarted.current = true; engineBegin(resumeStartRef.current); }
      return;
    }
    if (isDemo) return; // mode simulasi tidak perlu backend
    if (!attemptId && !startMutation.isPending && !done) {
      startMutation.mutate({ testCode });
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps dibatasi sengaja
  }, [done, testCode, startMutation.mutate, startMutation.isPending, attemptId, isDemo, intro, isEngine]);

  // pakai data dari query jika state kosong
  useEffect(() => {
    if (questionQuery.data && !question) {
      if (questionQuery.data.done) {
        setDone(true);
      } else {
        setQuestion(questionQuery.data.question);
        setProgress(questionQuery.data.progress);
        setTotal(questionQuery.data.total);
      }
    }
  }, [questionQuery.data, question]);

  const handleSelect = (option: string) => {
    if (isDemo) {
      const dq = DEMO_QUESTIONS[demoIdx] as unknown as Question & { correct?: string | null };
      const demoMinat = demoIdx < 2; // 2 soal minat dulu, lalu 2 soal bakat
      if (revealed) return;
      setSelected(option);
      if (!demoMinat) {
        setLastCorrect(dq?.correct === option);
        setRevealed(true);
        setTimeout(() => {
          if (demoIdx + 1 >= DEMO_QUESTIONS.length) {
            setDone(true);
            setBothDone(true);
            setXpEarned(isInterest ? 50 : 100 + demoIdx * 10);
            fireConfetti();
          } else {
            setProgress(demoIdx + 1);
            setDemoIdx(demoIdx + 1);
            setSelected(null);
            setRevealed(false);
            setLastCorrect(null);
          }
        }, 700);
      }
      return;
    }
    if (isEngine) { engineSelect(option); return; }
    if (revealed || answerMutation.isPending || !question) return;
    setSelected(option);

    if (!isInterest && question.optionC) {
      setRevealed(true);
      answerMutation.mutate({ attemptId: attemptId!, questionId: question.id, selectedOption: option });
    }
  };

  // interest: jawab → highlight → tampilkan tombol lanjut

  const handleConfirmInterest = () => {
    if (isEngine) { if (selected) engineSelect(selected); return; }
    if (isDemo) {
      if (!selected) return;
      if (demoIdx + 1 >= DEMO_QUESTIONS.length) {
        setDone(true);
        setBothDone(false);
        setXpEarned(50);
        fireConfetti();
      } else {
        setProgress(demoIdx + 1);
        setDemoIdx(demoIdx + 1);
        setSelected(null);
        setRevealed(false);
      }
      return;
    }
    if (!question || !selected) return;
    answerMutation.mutate({ attemptId: attemptId!, questionId: question.id, selectedOption: selected });
  };
  // Keyboard: A-D / 1-4 pilih opsi, Enter konfirmasi (interest)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const liveQ = isDemo ? (DEMO_QUESTIONS[demoIdx] as unknown as Question) : question;
      if (done || !liveQ || (isDemo ? false : answerMutation.isPending)) return;
      const letter = e.key.toLowerCase();
      const keySeq = ["a", "b", "c", "d"];
      const idx = keySeq.indexOf(letter) !== -1 ? keySeq.indexOf(letter) : ["1", "2", "3", "4"].indexOf(e.key);
      if (idx === -1) return;
      const opts = isInterest
        ? [liveQ.optionA, liveQ.optionB]
        : [liveQ.optionA, liveQ.optionB, liveQ.optionC, liveQ.optionD];
      if (idx >= opts.filter(Boolean).length) return;
      const optKey = isInterest ? ["A", "B"][idx] : ["A", "B", "C", "D"][idx];
      if (!revealed) handleSelect(optKey);
    };
    const onEnter = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || done || !question || !isInterest) return;
      if (selected && !revealed && !answerMutation.isPending) handleConfirmInterest();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onEnter);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onEnter);
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps dibatasi sengaja
  }, [
    done,
    question,
    selected,
    revealed,
    isInterest,
    answerMutation.isPending,
    demoIdx,
    isDemo,
    handleSelect,
    handleConfirmInterest,
    DEMO_QUESTIONS,
  ]);

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center px-6 py-16 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
          className="h-28 w-28 overflow-hidden rounded-3xl bg-white shadow-xl"
        >
          <Image
            src={bothDone ? "/maskot/masko-found.webp" : "/maskot/masko-thumb-up.webp"}
            alt="Maskot senang"
            width={112}
            height={112}
            className="h-full w-full object-cover"
          />
        </motion.div>

        <h1 className="mt-5 font-bold font-bricolage text-2xl text-gray-900">
          {bothDone ? "Semua Test Selesai!" : "Test Selesai!"}
        </h1>
        <p className="mt-2 font-manrope text-gray-500 text-sm">
          {bothDone
            ? "Rekomendasi jurusan & kariermu sudah siap dihasilkan."
            : `Kamu dapat ${xpEarned} XP! ${streak >= 2 ? `Streak ${streak} hari 🔥` : "Ayo lanjutkan streak besok!"}`}
        </p>

        {!isEngine && isInterest && !bothDone && (
          <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 font-manrope text-sm text-violet-700">
            💡 Lanjut ke <b>Test Bakat</b> untuk dapat rekomendasi lengkap!
          </div>
        )}

        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          {isEngine ? (
            (() => {
              return otherDone ? (
                <Link href={"/dashboard/student/assessment/result" as any} className="flex items-center justify-center gap-2 rounded-2xl bg-mentor-teal px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]">
                  <Sparkles className="h-5 w-5" /> Lihat Rekomendasi
                </Link>
              ) : (
                <Link href={`/dashboard/student/assessment/take/${engine!.otherCode}`} className="flex items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]">
                  Lanjut ke {engine!.otherLabel} <ArrowRight className="h-5 w-5" />
                </Link>
              );
            })()
          ) : bothDone || (!isInterest && resultId) ? (
            <Link
              href="/dashboard/student/assessment/result"
              className="flex items-center justify-center gap-2 rounded-2xl bg-mentor-teal px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
            >
              <Sparkles className="h-5 w-5" /> Lihat Rekomendasi
            </Link>
          ) : (
            <Link
              href="/dashboard/student/assessment"
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Kembali ke Beranda <ArrowRight className="h-5 w-5" />
            </Link>
          )}
          <Link
            href="/dashboard/student/assessment"
            className="flex items-center justify-center gap-1.5 font-manrope font-semibold text-gray-400 text-sm hover:text-gray-600"
          >
            <Home className="h-4 w-4" /> Beranda
          </Link>
        </div>
      </motion.div>
    );
  }
  if (isEngine && intro === true) {
    const nSec = engine?.sections ?? Math.max(1, new Set(engineQs.map((q) => q.dimensionId)).size);
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-lg shadow-brand-navy/5">
        <span className="mx-auto flex h-16 w-16 overflow-hidden rounded-2xl bg-teal-50">
          <Image src="/maskot/masko-book.webp" alt="Maskot" width={64} height={64} className="h-full w-full object-cover" />
        </span>
        <h1 className="mt-4 font-bold font-bricolage text-2xl text-gray-900">{engine!.code === "DISCOVER" ? "Tes Minat" : "Tes Bakat"}</h1>
        <p className="mt-1 font-manrope text-sm text-gray-500">Sebelum mulai, ini info testnya:</p>
        <div className="mt-4 space-y-2 text-left">
          <InfoRow label="Jumlah soal" value={`${engineQs.length} soal`} />
          <InfoRow label="Bagian / part" value={`${nSec} bagian (per dimensi)`} />
          <InfoRow label="Percobaan" value={`ke-${attemptNo}${attemptNo > 1 ? ` · ${attemptNo} ini belum selesai` : ""}`} />
          <InfoRow label="Perkiraan XP" value={`+${nSec * 10 + engineQs.length} XP`} />
          <InfoRow label="Penyimpanan" value="Auto-simpan tiap jawaban" last />
        </div>
        <button onClick={() => { setIntro(false); }} className="mt-6 w-full rounded-2xl bg-brand-navy px-6 py-3.5 font-bold font-bricolage text-sm text-white shadow-md transition-all hover:brightness-110">
          Mulai Tes →
        </button>
      </div>
    );
  }

  if (isEngine && secStart) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
          <span className="mx-auto flex h-16 w-16 overflow-hidden rounded-2xl bg-teal-50">
            <Image src="/maskot/masko-book.webp" alt="Maskot" width={64} height={64} className="h-full w-full object-cover" />
          </span>
          <p className="mt-3 font-manrope text-xs font-bold tracking-wide text-teal-600 uppercase">Bagian berikutnya</p>
          <h2 className="mt-1 font-bold font-bricolage text-2xl text-gray-900">{secStart.name}</h2>
          <p className="mt-1 font-manrope text-sm text-gray-500">Kamu akan mengerjakan {5} soal pada bagian ini.</p>
          <button
            onClick={() => { setSecStart(null); setSelected(null); setRevealed(false); engineLoad(secStart.eqIndex); }}
            className="mt-5 w-full rounded-2xl bg-brand-navy px-4 py-3.5 font-bold font-manrope text-sm text-white shadow-md transition-all hover:brightness-110"
          >
            Mulai bagian →
          </button>
          {dimIdxOf(secStart.eqIndex) > 0 && dimIdxOf(secStart.eqIndex) < totalDims - 1 && (
            <button
              onClick={() => router.push("/dashboard/student/assessment")}
              className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2.5 font-manrope text-xs font-semibold text-gray-500 hover:bg-gray-50"
            >
              Berhenti dulu — lanjut kapan saja (progres tersimpan)
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  if (isEngine && secOverlay) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
          <span className="mx-auto flex h-16 w-16 overflow-hidden rounded-2xl bg-teal-50">
            <Image src="/maskot/masko-thumb-up.webp" alt="Maskot" width={64} height={64} className="h-full w-full object-cover" />
          </span>
          <p className="mt-3 font-manrope text-xs font-bold tracking-wide text-teal-600 uppercase">Bagian selesai</p>
          <h2 className="mt-1 font-bold font-bricolage text-2xl text-gray-900">{secOverlay.doneName} — selesai! 🎉</h2>
          <p className="mt-2 font-manrope text-sm text-gray-500">
            <span className="font-bold text-brand-orange">+10 XP</span> · streak 🔥 {secStreak} bagian beruntun
          </p>
          <div className="mt-5 space-y-2">
            <button
              onClick={() => { setSecOverlay(null); setSelected(null); setRevealed(false); engineBegin(secOverlay.nextEq); }}
              className="w-full rounded-2xl bg-brand-navy px-4 py-3.5 font-bold font-manrope text-sm text-white shadow-md transition-all hover:brightness-110"
            >
              Lanjut ke {secOverlay.nextName} →
            </button>
            {dimIdxOf(secOverlay.nextEq) < totalDims && (
              <button
                onClick={() => router.push("/dashboard/student/assessment")}
                className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 font-manrope text-xs font-semibold text-gray-500 hover:bg-gray-50"
              >
                ⏸ Berhenti di sini — lanjut nanti dari bagian ini
              </button>
            )}
          </div>
          <p className="mt-2 font-manrope text-[10px] text-gray-400">Jawabanmu tersimpan otomatis; kembali kapan saja untuk melanjutkan.</p>
        </div>
      </motion.div>
    );
  }


  // Mode simulasi: pertanyaan lokal (tanpa backend)
  const liveQuestion = isDemo ? (DEMO_QUESTIONS[demoIdx] as unknown as Question) : question;
  const liveProgress = isDemo ? demoIdx + 1 : progress;
  const liveTotal = isDemo ? DEMO_QUESTIONS.length : total;
  const _livePct = liveTotal > 0 ? (liveProgress / liveTotal) * 100 : 0;

  if (!liveQuestion) {
    if (isDemo) return null;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-24 w-24 overflow-hidden rounded-2xl bg-white shadow-sm">
          <Image src="/maskot/masko-hi.webp" alt="" width={96} height={96} className="h-full w-full object-cover" />
        </div>
        <div className="mt-4 h-2 w-32 animate-pulse rounded-full bg-gray-100" />
        <p className="mt-3 font-manrope text-gray-500 text-sm">Menyiapkan soal…</p>
      </div>
    );
  }

  const progressPct = liveTotal > 0 ? (liveProgress / liveTotal) * 100 : 0;

  return (
    <div className="flex flex-col">
      {showGuide && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center gap-3 border-gray-100 border-b px-5 py-4">
              <div className="h-12 w-12 overflow-hidden rounded-2xl bg-brand-orange/10">
                <Image
                  src="/maskot/masko-compass.webp"
                  alt=""
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h2 className="font-bold font-bricolage text-brand-navy text-lg">
                  {isDemo ? "Simulasi Test — 2+2 Soal" : "Cara Main Test"}
                </h2>
                <p className="font-manrope text-[11px] text-muted-foreground">
                  {isDemo ? "Coba dulu tanpa disimpan" : "Panduan singkat sebelum mulai"}
                </p>
              </div>
            </div>
            <div className="space-y-2.5 px-5 py-4">
              {[
                [
                  "⌨️",
                  "Pilih jawaban cepat",
                  isInterest ? "Tekan tombol A / B, atau 1 / 2." : "Tekan A / B / C / D (atau 1–4) sesuai opsi.",
                ],
                [
                  "⏭️",
                  isInterest ? "Konfirmasi dulu" : "Lanjut otomatis",
                  isInterest
                    ? "Pilih dulu, lalu tekan Enter / tombol Lanjut."
                    : "Setelah jawab, otomatis pindah — tak perlu tombol next.",
                ],
                [
                  "⏱️🔥",
                  "Pantau waktu & streak",
                  "Lihat timer & api streak di pojok — jawaban benar berturut-turut = combo!",
                ],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex gap-3 rounded-2xl bg-gray-50 p-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="font-bold font-manrope text-brand-navy text-xs">{title}</p>
                    <p className="mt-0.5 font-manrope text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-gray-100 border-t px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("mulai-test-guide-v1", "1");
                  setShowGuide(false);
                }}
                className="flex-1 rounded-2xl bg-brand-navy px-5 py-3 font-bold font-bricolage text-white transition-all hover:brightness-110 active:scale-[0.98]"
              >
                {isDemo ? "Mulai Simulasi" : "Paham, Mulai!"}
              </button>
              {!isDemo && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("mulai-test-guide-v1", "1");
                    setShowGuide(false);
                  }}
                  className="rounded-2xl px-5 py-3 font-manrope text-muted-foreground text-xs transition-colors hover:text-brand-navy"
                >
                  Skip
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Progress bar */}
      {/* Progress bar */}
      <div className="mb-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => router.push("/dashboard/student/assessment")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500"
          aria-label="Keluar test"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Maskot avatar */}
        <div
          className={cn(
            "relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white shadow-sm",
            lastCorrect === true && "animate-bounce",
            lastCorrect === false && "animate-shake-soft",
          )}
        >
          <Image
            src={
              lastCorrect === false
                ? "/maskot/masko-confuse.webp"
                : lastCorrect === true
                  ? "/maskot/masko-thumb-up.webp"
                  : "/maskot/masko-hi.webp"
            }
            alt="Maskot"
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
          {xpFlash > 0 && (
            <span className="absolute -top-1 -right-1 rounded-full bg-amber-400 px-1.5 py-0.5 font-bold font-manrope text-[9px] text-white shadow">
              +{xpFlash}
            </span>
          )}
        </div>

        <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-mentor-teal to-teal-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <span className="font-bold font-manrope text-gray-500 text-xs">
          {liveProgress}/{liveTotal}
        </span>

        {/* Timer */}
        <span
          className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-manrope font-semibold text-[10px] text-slate-500 tabular-nums"
          title="Waktu dihabiskan"
        >
          <Timer className="h-3 w-3" />
          {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
        </span>

        {/* Streak */}
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 font-bold font-manrope text-xs",
            streak >= 2 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-400",
          )}
          title="Streak harian"
        >
          <Flame className="h-3.5 w-3.5" />
          {streak}
        </span>
      </div>

      {/* Combo bubble */}
      {comboPop >= 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 shadow-lg"
        >
          <span className="text-lg">🔥</span>
          <span className="font-bold font-bricolage text-sm text-white">{comboPop} combo berturut-turut!</span>
        </motion.div>
      )}

      {/* Banner motivasi */}
      {banner && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2"
        >
          <Image src="/maskot/masko-thumb-up.webp" alt="" width={24} height={24} className="h-6 w-6 rounded-full" />
          <span className="font-manrope font-semibold text-violet-700 text-xs">{banner}</span>
        </motion.div>
      )}

      {/* Question */}
      <motion.div
        key={liveQuestion.id}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-3xl bg-white p-5 shadow-sm"
      >
        <p className="font-manrope font-semibold text-mentor-teal text-xs uppercase tracking-wide">
          {isInterest ? `Minat • ${liveQuestion.dimension}` : `Kemampuan • ${liveQuestion.dimension}`}
        </p>
        <h2 className="mt-2 font-bold font-bricolage text-gray-900 text-lg leading-snug">{liveQuestion.text}</h2>
      </motion.div>

      {/* Options */}
      <div className="mt-4 space-y-3">
        {isInterest ? (
          <>
            {[
              { key: "A", text: liveQuestion.optionA },
              { key: "B", text: liveQuestion.optionB },
            ].map((opt, i) => {
              const isSelected = selected === opt.key;
              const oi = (liveQuestion as any)._optImgs?.[i];
              const oic = (liveQuestion as any)._optIcons?.[i];
              return (
                <motion.button
                  key={opt.key}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * (i + 1) }}
                  onClick={() => handleSelect(opt.key)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition-all",
                    isSelected
                      ? "border-mentor-teal bg-mentor-teal/5 shadow-md"
                      : "border-gray-200 hover:border-gray-300 active:scale-[0.99]",
                  )}
                >
                  {oic ? (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">{oic}</span>
                  ) : (
                    <span
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl transition-colors",
                        isSelected ? "bg-mentor-teal" : "bg-gray-100",
                      )}
                    >
                      {isSelected ? <Check className="h-6 w-6 text-white" /> : i === 0 ? "👷" : "🎨"}
                    </span>
                  )}
                {oi && <img src={oi} alt="" className="h-10 w-14 shrink-0 rounded-lg border border-gray-100 object-cover" />}
                <span className="font-manrope font-medium text-[15px] text-gray-800">{opt.text}</span>
                </motion.button>
              );
            })}

            {/* Confirm button — muncul setelah pilih (interest) */}
            <motion.div initial={false} animate={{ opacity: selected ? 1 : 0, y: selected ? 0 : 8 }}>
              {selected && !revealed && (
                <button
                  type="button"
                  onClick={handleConfirmInterest}
                  disabled={answerMutation.isPending}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-mentor-teal px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
                >
                  {answerMutation.isPending ? "Menyimpan…" : "Lanjut"} <ArrowRight className="h-5 w-5" />
                </button>
              )}
            </motion.div>

            <p className="mt-2 text-center font-manrope text-[10px] text-muted-foreground">
              Shortcut: tekan <b>A/B</b> lalu <b>Enter</b>
            </p>
          </>
        ) : (
          [liveQuestion.optionA, liveQuestion.optionB, liveQuestion.optionC, liveQuestion.optionD]
            .filter(Boolean)
            .map((opt, i) => {
              const key = String.fromCharCode(65 + i);
              const isSelected = selected === key;
              const oi = (liveQuestion as any)._optImgs?.[i];
              const oic = (liveQuestion as any)._optIcons?.[i];
              const isAnswered = revealed && isSelected;
              const correct = isAnswered && lastCorrect === true;
              const wrong = isAnswered && lastCorrect === false;
              return (
                <motion.button
                  key={key}
                  type="button"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i }}
                  onClick={() => handleSelect(key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 text-left transition-all",
                    correct
                      ? "border-green-500 bg-green-50"
                      : wrong
                        ? "border-red-400 bg-red-50"
                        : isSelected
                          ? "border-mentor-teal bg-mentor-teal/5"
                          : "border-gray-200 hover:border-gray-300 active:scale-[0.99]",
                  )}
                >
                  {oic ? (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-2xl shadow-sm">{oic}</span>
                  ) : (
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold font-manrope text-sm",
                        correct
                          ? "bg-green-500 text-white"
                          : wrong
                            ? "bg-red-400 text-white"
                            : isSelected
                              ? "bg-mentor-teal text-white"
                              : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {key}
                    </span>
                  )}
                {oi && <img src={oi} alt="" className="h-10 w-14 shrink-0 rounded-lg border border-gray-100 object-cover" />}
                <span className="font-manrope font-medium text-[15px] text-gray-800">{opt}</span>
                </motion.button>
              );
            })
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${last ? "" : "border-b border-gray-50"}`}>
      <span className="font-manrope text-xs text-gray-500">{label}</span>
      <span className="font-manrope text-xs font-semibold text-gray-800">{value}</span>
    </div>
  );
}
