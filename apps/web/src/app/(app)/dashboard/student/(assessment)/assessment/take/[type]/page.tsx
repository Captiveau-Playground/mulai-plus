"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { ArrowRight, Check, Flame, Home, Sparkles, Timer, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

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
  const params = useParams();
  const router = useRouter();
  const testCode = (params.type as string) === "ability" ? "ability" : "interest";
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
    enabled: !!attemptId && !question,
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
    if (isDemo) return; // mode simulasi tidak perlu backend
    if (!attemptId && !startMutation.isPending && !done) {
      startMutation.mutate({ testCode });
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps dibatasi sengaja
  }, [done, testCode, startMutation.mutate, startMutation.isPending, attemptId, isDemo]);

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
    if (revealed || answerMutation.isPending || !question) return;
    setSelected(option);

    if (!isInterest && question.optionC) {
      setRevealed(true);
      answerMutation.mutate({ attemptId: attemptId!, questionId: question.id, selectedOption: option });
    }
  };

  // interest: jawab → highlight → tampilkan tombol lanjut

  const handleConfirmInterest = () => {
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

        {isInterest && !bothDone && (
          <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 font-manrope text-sm text-violet-700">
            💡 Lanjut ke <b>Test Bakat</b> untuk dapat rekomendasi lengkap!
          </div>
        )}

        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          {bothDone || (!isInterest && resultId) ? (
            <Link
              href="/dashboard/student/assessment/result"
              className="flex items-center justify-center gap-2 rounded-2xl bg-mentor-teal px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
            >
              <Sparkles className="h-5 w-5" /> Lihat Rekomendasi
            </Link>
          ) : (
            <Link
              href={isInterest ? "/dashboard/student/assessment/take/ability" : "/dashboard/student/assessment"}
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
            >
              {isInterest ? "Lanjut ke Test Bakat" : "Kembali ke Beranda"}
              <ArrowRight className="h-5 w-5" />
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
                  <span
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl transition-colors",
                      isSelected ? "bg-mentor-teal" : "bg-gray-100",
                    )}
                  >
                    {isSelected ? <Check className="h-6 w-6 text-white" /> : i === 0 ? "👷" : "🎨"}
                  </span>
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
                  <span className="font-manrope font-medium text-[15px] text-gray-800">{opt}</span>
                </motion.button>
              );
            })
        )}
      </div>
    </div>
  );
}
