"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { ArrowRight, Check, Home, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const testCode = params.code as "interest" | "ability";
  const isInterest = testCode === "interest";
  const queryClient = useQueryClient();

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
  const _answeredRef = useRef(false);

  const startMutation = useMutation({
    ...orpc.tmb.assessment.start.mutationOptions(),
    onSuccess: async (data) => {
      setAttemptId(data.attemptId);
      setTotal(data.total);
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
      setXpEarned(isInterest ? 50 : 100);
      fireConfetti();
      queryClient.invalidateQueries({ queryKey: orpc.tmb.assessment.list.key() });
    },
  });

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
    } catch {
      /* ignore */
    }
  };

  // auto-start
  useEffect(() => {
    if (!attemptId && !startMutation.isPending && !done) {
      startMutation.mutate({ testCode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, testCode, startMutation.mutate, startMutation.isPending, attemptId]);

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
    if (revealed || answerMutation.isPending || !question) return;
    setSelected(option);

    if (!isInterest && question.optionC) {
      setRevealed(true);
      answerMutation.mutate({ attemptId: attemptId!, questionId: question.id, selectedOption: option });
    }
  };

  // interest: jawab → highlight → tampilkan tombol lanjut
  const handleConfirmInterest = () => {
    if (!question || !selected) return;
    answerMutation.mutate({ attemptId: attemptId!, questionId: question.id, selectedOption: selected });
  };

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
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-brand-orange text-5xl shadow-xl"
        >
          {bothDone ? "🎉" : "✨"}
        </motion.div>

        <h1 className="mt-6 font-bold font-bricolage text-2xl text-gray-900">
          {bothDone ? "Semua Test Selesai!" : "Test Selesai!"}
        </h1>
        <p className="mt-2 font-manrope text-gray-500 text-sm">
          {bothDone ? "Rekomendasi jurusan & kariermu sudah siap dihasilkan." : `Kamu dapat ${xpEarned} XP!`}
        </p>

        {isInterest && !bothDone && (
          <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 font-manrope text-sm text-violet-700">
            💡 Lanjut ke <b>Test Bakat</b> untuk dapat rekomendasi lengkap!
          </div>
        )}

        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          {bothDone || (!isInterest && resultId) ? (
            <Link
              href="/tmb/result"
              className="flex items-center justify-center gap-2 rounded-2xl bg-mentor-teal px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
            >
              <Sparkles className="h-5 w-5" /> Lihat Rekomendasi
            </Link>
          ) : (
            <Link
              href={isInterest ? "/tmb/test/ability" : "/tmb"}
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
            >
              {isInterest ? "Lanjut ke Test Bakat" : "Kembali ke Beranda"}
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
          <Link
            href="/tmb"
            className="flex items-center justify-center gap-1.5 font-manrope font-semibold text-gray-400 text-sm hover:text-gray-600"
          >
            <Home className="h-4 w-4" /> Beranda
          </Link>
        </div>
      </motion.div>
    );
  }

  if (!question) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-mentor-teal border-t-transparent" />
        <p className="mt-4 font-manrope text-gray-500 text-sm">Menyiapkan soal…</p>
      </div>
    );
  }

  const progressPct = total > 0 ? (progress / total) * 100 : 0;

  return (
    <div className="flex flex-col">
      {/* Progress bar */}
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/tmb")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500"
          aria-label="Keluar test"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-mentor-teal to-teal-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="font-bold font-manrope text-gray-500 text-xs">
          {progress}/{total}
        </span>
      </div>

      {/* Question */}
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-3xl bg-white p-5 shadow-sm"
      >
        <p className="font-manrope font-semibold text-mentor-teal text-xs uppercase tracking-wide">
          {isInterest ? `Minat • ${question.dimension}` : `Kemampuan • ${question.dimension}`}
        </p>
        <h2 className="mt-2 font-bold font-bricolage text-gray-900 text-lg leading-snug">{question.text}</h2>
      </motion.div>

      {/* Options */}
      <div className="mt-4 space-y-3">
        {isInterest ? (
          <>
            {[
              { key: "A", text: question.optionA },
              { key: "B", text: question.optionB },
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
          </>
        ) : (
          [question.optionA, question.optionB, question.optionC, question.optionD].filter(Boolean).map((opt, i) => {
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
