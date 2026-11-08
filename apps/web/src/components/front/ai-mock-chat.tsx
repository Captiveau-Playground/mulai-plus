"use client";

import { useEffect, useMemo, useState } from "react";

type Step = { kind: "user"; text: string } | { kind: "tool"; text: string } | { kind: "ai"; text: string };

const SCRIPT: Step[] = [
  { kind: "user", text: "Rekomendasi jurusan sesuai minatku dong" },
  { kind: "tool", text: "Mencari program studi…" },
  {
    kind: "ai",
    text: "Berdasarkan minat **E (Enterprising)** & kemampuanmu, coba **Manajemen**, **Ilmu Komunikasi**, atau **Bisnis Digital** di PTN favoritmu.",
  },
];

const IDLE = 2600;

/** Render **tebal** sederhana tanpa markdown parser (aman, hanya <strong>). */
function RichText({ text }: { text: string }) {
  // Saat mengetik, penanda `**` bisa belum tertutup → jangan tampilkan asterisk mentah.
  const clean = text.replace(/\*\*/g, (m, off: number) => {
    const rest = text.slice(off + 2);
    return rest.includes("**") ? m : "";
  });
  const parts = useMemo(() => clean.split(/(\*\*[^*]+\*\*)/g).filter(Boolean), [clean]);
  return (
    <>
      {parts.map((p, i) => {
        const bold = p.startsWith("**") && p.endsWith("**");
        const body = bold ? p.slice(2, -2) : p;
        return bold ? (
          <strong key={i} className="font-semibold text-brand-navy">
            {body}
          </strong>
        ) : (
          <span key={i}>{body}</span>
        );
      })}
    </>
  );
}

/**
 * Mock chat Mul.ai — simulasi streaming (loop).
 *
 * Catatan desain:
 * • Status tool memakai SATU baris: spinner "Mencari…" lalu berubah jadi "✓ selesai".
 *   Dulu "loading" & "selesai" adalah dua baris berbeda sehingga muncul bersamaan.
 * • Tinggi area pesan DIPATOK (fixed) dengan isi rata bawah. Dulu setiap baris baru
 *   menambah tinggi → konten di bawahnya terdorong (glitch saat looping).
 */
export function AiMockChat({ compact = false }: { compact?: boolean }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (stepIdx >= SCRIPT.length) {
      const t = setTimeout(() => {
        setStepIdx(0);
        setTyped(0);
      }, IDLE);
      return () => clearTimeout(t);
    }
    const step = SCRIPT[stepIdx];
    if (!step) return;
    if (step.kind === "ai") {
      if (typed < step.text.length) {
        const t = setTimeout(() => setTyped((v) => Math.min(step.text.length, v + 1)), 24);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setStepIdx((i) => i + 1), 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIdx((i) => i + 1), step.kind === "user" ? 550 : 1100);
    return () => clearTimeout(t);
  }, [stepIdx, typed]);

  const visible = SCRIPT.slice(0, Math.min(stepIdx + 1, SCRIPT.length));
  const current = SCRIPT[Math.min(stepIdx, SCRIPT.length - 1)];
  const done = stepIdx >= SCRIPT.length;
  const toolFinished = done || (current?.kind === "ai" && visible.some((s) => s.kind === "ai"));
  const typingAi = current?.kind === "ai" && typed < current.text.length;

  return (
    <div
      className={compact ? "flex flex-col gap-2" : "flex flex-col gap-2.5"}
      style={{ height: compact ? 168 : 196, justifyContent: "flex-end", overflow: "hidden" }}
      aria-live="polite"
    >
      {visible.map((s, idx) => {
        if (s.kind === "user") {
          return (
            <div
              key={`${idx}-user`}
              className="ml-auto w-fit max-w-[80%] rounded-xl rounded-tr-sm bg-brand-navy px-3 py-2 font-manrope text-white text-xs"
            >
              {s.text}
            </div>
          );
        }
        if (s.kind === "tool") {
          const finished = toolFinished;
          return (
            <div
              key="tool"
              className={`flex w-fit items-center gap-1.5 rounded-xl bg-muted px-2.5 py-1.5 font-manrope text-[10px] transition-colors ${
                finished ? "text-emerald-600" : "text-brand-navy"
              }`}
            >
              {finished ? (
                <span aria-hidden>✓</span>
              ) : (
                <span className="size-2 animate-spin rounded-full border border-brand-orange border-t-transparent" />
              )}
              <span>
                {finished ? `selesai — ${s.text.replace("…", "").replace(/^\w/, (c) => c.toLowerCase())}` : s.text}
              </span>
            </div>
          );
        }
        const shown = s.text.slice(0, typed);
        return (
          <div
            key={`${idx}-ai`}
            className="w-fit max-w-[88%] rounded-xl border border-border bg-white px-3 py-2 font-manrope text-text-main text-xs leading-relaxed"
          >
            <RichText text={shown} />
            {typingAi && idx === visible.length - 1 && (
              <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-brand-orange align-middle" />
            )}
          </div>
        );
      })}

      {/* Baris input selalu ada supaya tinggi tidak melompat saat chat selesai */}
      <div className="mt-0.5 flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
        <span className="flex-1 font-manrope text-[11px] text-muted-foreground">Tanya apa saja…</span>
        <span className="rounded-lg bg-brand-navy px-3 py-1.5 font-manrope text-[10px] text-white">Kirim ↑</span>
      </div>
    </div>
  );
}
