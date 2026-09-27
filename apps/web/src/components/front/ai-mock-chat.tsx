"use client";

import { useEffect, useState } from "react";

type Step =
  | { kind: "user"; text: string }
  | { kind: "tool"; text: string }
  | { kind: "tool-done"; text: string }
  | { kind: "ai"; text: string };

const SCRIPT: Step[] = [
  { kind: "user", text: "Rekomendasi jurusan sesuai minatku dong" },
  { kind: "tool", text: "Mencari program studi…" },
  { kind: "tool-done", text: "✓ selesai — mencari program studi" },
  {
    kind: "ai",
    text: "Berdasarkan minat **E (Enterprising)** & kemampuanmu, coba **Manajemen**, **Ilmu Komunikasi**, atau **Bisnis Digital** di PTN favoritmu.",
  },
];

const IDLE = 2600;

/** Mock chat Mul.ai — simulasi streaming jawaban (loop). */
export function AiMockChat({ compact = false }: { compact?: boolean }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [typed, setTyped] = useState(0);
  const [_tick, setTick] = useState(0);

  useEffect(() => {
    if (stepIdx >= SCRIPT.length) {
      const t = setTimeout(() => {
        setStepIdx(0);
        setTyped(0);
      }, IDLE);
      return () => clearTimeout(t);
    }
    const step = SCRIPT[stepIdx];
    if (step.kind === "ai") {
      if (typed < step.text.length) {
        const t = setTimeout(() => setTyped((v) => Math.min(step.text.length, v + 1)), 28);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setStepIdx((i) => i + 1), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIdx((i) => i + 1), step.kind === "user" ? 500 : step.kind === "tool" ? 950 : 350);
    return () => clearTimeout(t);
  }, [stepIdx, typed]);

  useEffect(() => {
    if (stepIdx >= SCRIPT.length) {
      const t = setTimeout(() => setTick((v) => v + 1), IDLE + 200);
      return () => clearTimeout(t);
    }
  }, [stepIdx]);

  const visible = SCRIPT.slice(0, Math.min(stepIdx + 1, SCRIPT.length));
  const typingAi = stepIdx < SCRIPT.length && SCRIPT[stepIdx].kind === "ai" && typed < SCRIPT[stepIdx].text.length;
  const done = stepIdx >= SCRIPT.length;

  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      {visible.map((s, idx) => {
        if (s.kind === "user") {
          return (
            <div
              key={idx}
              className="ml-auto w-fit max-w-[80%] rounded-xl rounded-tr-sm bg-brand-navy px-3 py-2 font-manrope text-white text-xs"
            >
              {s.text}
            </div>
          );
        }
        if (s.kind === "tool" || s.kind === "tool-done") {
          return (
            <div
              key={idx}
              className={`flex w-fit items-center gap-1.5 rounded-xl bg-muted px-2.5 py-1.5 font-manrope text-[10px] ${s.kind === "tool" ? "text-brand-navy" : "text-emerald-600"}`}
            >
              {s.kind === "tool" ? (
                <span className="size-2 animate-spin rounded-full border border-brand-orange border-t-transparent" />
              ) : (
                <span>✓</span>
              )}
              {s.text}
            </div>
          );
        }
        const shown = s.text.slice(0, typed);
        return (
          <div
            key={idx}
            className="w-fit max-w-[88%] rounded-xl border border-border bg-white px-3 py-2 font-manrope text-text-main text-xs leading-relaxed"
          >
            {shown}
            {typingAi && (
              <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-brand-orange align-middle" />
            )}
          </div>
        );
      })}
      {done && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
          <span className="flex-1 font-manrope text-[11px] text-muted-foreground">Tanya apa saja…</span>
          <span className="rounded-lg bg-brand-navy px-3 py-1.5 font-manrope text-[10px] text-white">Kirim ↑</span>
        </div>
      )}
    </div>
  );
}
