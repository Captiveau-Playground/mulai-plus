"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

type Question = {
  id: string;
  text: string;
  dimension: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
};

export default function TmbInvitePage() {
  const params = useParams();
  const token = params.token as string;
  const [phase, setPhase] = useState<"landing" | "test" | "done">("landing");
  const [testCode, setTestCode] = useState<"interest" | "ability">("interest");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [bothDone, setBothDone] = useState(false);
  const [error, setError] = useState("");
  const [_name, _setName] = useState("");
  const busyRef = useRef(false);

  const isInterest = testCode === "interest";

  const loadQuestion = async (id: string) => {
    const q: any = await client.tmbGuest.question({ attemptId: id });
    if (q.done) {
      setPhase("done");
      return;
    }
    setQuestion(q.question);
    setProgress(q.progress);
    setTotal(q.total);
  };

  const start = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const r: any = await client.tmbGuest.start({ token, testCode });
      setAttemptId(r.attemptId);
      setPhase("test");
      await loadQuestion(r.attemptId);
    } catch (e: any) {
      setError(e.message || "Link undangan tidak valid");
    } finally {
      busyRef.current = false;
    }
  };

  const answer = async (option: string) => {
    if (!question || !attemptId || busyRef.current) return;
    busyRef.current = true;
    try {
      if (!isInterest) setRevealed(true);
      const r: any = await client.tmbGuest.answer({ attemptId, questionId: question.id, selectedOption: option });
      if (!isInterest && r.isCorrect !== null && r.isCorrect !== undefined) {
        setLastCorrect(r.isCorrect);
        await new Promise((res) => setTimeout(res, 750));
        setSelected(null);
        setRevealed(false);
        setLastCorrect(null);
      } else {
        setSelected(null);
        setRevealed(false);
      }
      if (r.done) {
        const fin: any = await client.tmbGuest.finish({ token, attemptId });
        if (fin.bothDone) {
          setBothDone(true);
          setPhase("done");
          return;
        }
        // lanjut test berikutnya
        const nextCode = testCode === "interest" ? "ability" : "interest";
        setTestCode(nextCode);
        const r2: any = await client.tmbGuest.start({ token, testCode: nextCode });
        setAttemptId(r2.attemptId);
        setProgress(0);
        setSelected(null);
        await loadQuestion(r2.attemptId);
        return;
      }
      setProgress(r.progress);
      await loadQuestion(attemptId);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    } finally {
      busyRef.current = false;
    }
  };

  // landing phase — muat info
  useEffect(() => {
    // validasi token ringan
    client.tmbGuest.start({ token, testCode: "interest" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafc] px-6 text-center">
        <span className="text-5xl">🔗</span>
        <h1 className="mt-4 font-bold font-bricolage text-gray-900 text-xl">Link Tidak Valid</h1>
        <p className="mt-2 max-w-xs font-manrope text-gray-500 text-sm">{error}</p>
        <Link
          href="/test-minat-bakat"
          className="mt-6 rounded-2xl bg-brand-navy px-6 py-3.5 font-bold font-bricolage text-white shadow-lg"
        >
          Halaman Test Minat Bakat
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-violet-50 to-white px-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-brand-orange text-5xl shadow-xl"
        >
          🎉
        </motion.div>
        <h1 className="mt-6 font-bold font-bricolage text-2xl text-gray-900">
          {bothDone ? "Test Selesai!" : "Sampai di sini dulu!"}
        </h1>
        <p className="mt-2 max-w-xs font-manrope text-gray-500 text-sm">
          {bothDone ? "Rekomendasi jurusan & kariermu sudah siap!" : "Lanjutkan test berikutnya untuk hasil lengkap."}
        </p>
        {bothDone && (
          <Link
            href={`/tmb-invite/${token}/result`}
            className="mt-8 flex items-center gap-2 rounded-2xl bg-mentor-teal px-8 py-4 font-bold font-bricolage text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <Sparkles className="h-5 w-5" /> Lihat Hasil
          </Link>
        )}
      </motion.div>
    );
  }

  if (phase === "test") {
    if (!question) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-mentor-teal border-t-transparent" />
        </div>
      );
    }
    const progressPct = total > 0 ? (progress / total) * 100 : 0;
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#fafafc] px-4 py-5">
        {/* Progress */}
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-base shadow-sm">
            {isInterest ? "🧠" : "💡"}
          </span>
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

        <div className="mt-4 space-y-3">
          {isInterest
            ? [question.optionA, question.optionB].map((opt, i) => {
                const key = i === 0 ? "A" : "B";
                const isSelected = selected === key;
                return (
                  <motion.button
                    key={key}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * (i + 1) }}
                    onClick={() => {
                      setSelected(key);
                      answer(key);
                    }}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition-all",
                      isSelected ? "border-mentor-teal bg-mentor-teal/5" : "border-gray-200 hover:border-gray-300",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl",
                        isSelected ? "bg-mentor-teal" : "bg-gray-100",
                      )}
                    >
                      {isSelected ? <Check className="h-6 w-6 text-white" /> : i === 0 ? "👷" : "🎨"}
                    </span>
                    <span className="font-manrope font-medium text-[15px] text-gray-800">{opt}</span>
                  </motion.button>
                );
              })
            : [question.optionA, question.optionB, question.optionC, question.optionD].filter(Boolean).map((opt, i) => {
                const key = String.fromCharCode(65 + i);
                const isSelected = selected === key;
                const answered = revealed && isSelected;
                const correct = answered && lastCorrect === true;
                const wrong = answered && lastCorrect === false;
                return (
                  <motion.button
                    key={key}
                    type="button"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i }}
                    onClick={() => {
                      setSelected(key);
                      answer(key);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 text-left transition-all",
                      correct
                        ? "border-green-500 bg-green-50"
                        : wrong
                          ? "border-red-400 bg-red-50"
                          : isSelected
                            ? "border-mentor-teal bg-mentor-teal/5"
                            : "border-gray-200 hover:border-gray-300",
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
              })}
        </div>
      </div>
    );
  }

  // ── Landing ──
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#eef2ff] to-white px-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-navy to-brand-navy-light text-4xl shadow-xl">
        🧭
      </span>
      <h1 className="mt-5 font-bold font-bricolage text-2xl text-brand-navy">Kamu Diundang!</h1>
      <p className="mt-2 max-w-xs font-manrope text-gray-500 text-sm">
        Sekolahmu mengundang kamu mengikuti <b>Test Minat Bakat by MULAI+</b>. 20 soal cepat, ±10 menit, tanpa tekanan.
      </p>
      <div className="mt-6 w-full max-w-xs space-y-2 text-left">
        {["🧠 Tes Minat (10 soal)", "💡 Tes Bakat (10 soal)", "🎯 Rekomendasi jurusan & karier"].map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <span className="font-manrope font-medium text-gray-700 text-sm">{s}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={start}
        className="mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-orange px-6 py-4 font-bold font-bricolage text-base text-white shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
      >
        Mulai Test <ArrowRight className="h-5 w-5" />
      </button>
      <p className="mt-4 font-manrope text-[11px] text-gray-400">
        Hasil akan dikirim ke sekolahmu sebagai bahan bimbingan.
      </p>
    </div>
  );
}
