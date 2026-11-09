"use client";

import { useEffect, useMemo, useState } from "react";

const QUESTION = "Rekomendasi jurusan sesuai minatku dong";
const TOOL = "Mencari program studi…";
const ANSWER =
  "Berdasarkan minat **E (Enterprising)** & kemampuanmu, coba **Manajemen**, **Ilmu Komunikasi**, atau **Bisnis Digital** di PTN favoritmu.";

/** Render **tebal** tanpa markdown parser; aman untuk teks yang belum selesai diketik. */
function RichText({ text }: { text: string }) {
  // Hanya hapus penanda `**` TERAKHIR bila jumlahnya ganjil (belum tertutup).
  const clean = useMemo(() => {
    const count = (text.match(/\*\*/g) ?? []).length;
    if (count % 2 === 0) return text;
    const last = text.lastIndexOf("**");
    return last < 0 ? text : text.slice(0, last) + text.slice(last + 2);
  }, [text]);

  const parts = useMemo(() => clean.split(/(\*\*[^*]+\*\*)/g).filter(Boolean), [clean]);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
          return (
            <strong key={i} className="font-semibold text-brand-navy">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

type Phase = "type-q" | "send" | "tool" | "ai" | "hold";

/**
 * Mock chat Mul.ai — simulasi (loop) dengan alur yang menyerupai interaksi asli:
 *   1. pertanyaan DIKETIK ke kolom input,
 *   2. tekan Enter (tombol Kirim menyala) → pertanyaan terkirim sebagai bubble,
 *   3. tool "Mencari program studi…" (spinner) → berubah "✓ selesai",
 *   4. jawaban diketik, lalu tahan sebentar, lalu ulang.
 *
 * Tinggi area dipatok supaya baris baru tidak mendorong konten lain (anti layout-shift).
 */
export function AiMockChat({ compact = false }: { compact?: boolean }) {
  const [phase, setPhase] = useState<Phase>("type-q");
  const [typedQ, setTypedQ] = useState(0);
  const [typedA, setTypedA] = useState(0);

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      return () => clearTimeout(t);
    };
    if (phase === "type-q") {
      if (typedQ < QUESTION.length) return schedule(() => setTypedQ((v) => v + 1), 38);
      return schedule(() => setPhase("send"), 520); // jeda sebelum "Enter"
    }
    if (phase === "send") {
      return schedule(() => {
        setTypedQ(0);
        setPhase("tool");
      }, 320);
    }
    if (phase === "tool") return schedule(() => setPhase("ai"), 1100);
    if (phase === "ai") {
      if (typedA < ANSWER.length) return schedule(() => setTypedA((v) => v + 2), 22);
      return schedule(() => setPhase("hold"), 600);
    }
    return schedule(() => {
      setTypedA(0);
      setPhase("type-q");
    }, 2800);
  }, [phase, typedQ, typedA]);

  const showUser = phase === "tool" || phase === "ai" || phase === "hold";
  const showTool = showUser;
  const toolDone = phase === "ai" || phase === "hold";
  const showAi = toolDone;
  const typingInput = phase === "type-q";
  const sending = phase === "send";

  return (
    <div
      className={compact ? "flex flex-col gap-2" : "flex flex-col gap-2.5"}
      style={{ height: compact ? 200 : 228, overflow: "hidden" }}
      aria-live="polite"
    >
      {/* Area pesan — rata bawah supaya pesan lama "terdorong ke atas" tanpa menggeser layout */}
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2">
        {showUser && (
          <div className="ml-auto w-fit max-w-[80%] rounded-xl rounded-tr-sm bg-brand-navy px-3 py-2 font-manrope text-white text-xs">
            {QUESTION}
          </div>
        )}

        {showTool && (
          <div
            className={`flex w-fit items-center gap-1.5 rounded-xl bg-muted px-2.5 py-1.5 font-manrope text-[10px] transition-colors ${
              toolDone ? "text-emerald-600" : "text-brand-navy"
            }`}
          >
            {toolDone ? (
              <span aria-hidden>✓</span>
            ) : (
              <span className="size-2 animate-spin rounded-full border border-brand-orange border-t-transparent" />
            )}
            <span>{toolDone ? "selesai — mencari program studi" : TOOL}</span>
          </div>
        )}

        {showAi && (
          <div className="w-fit max-w-[88%] rounded-xl border border-border bg-white px-3 py-2 font-manrope text-text-main text-xs leading-relaxed">
            <RichText text={ANSWER.slice(0, typedA)} />
            {phase === "ai" && (
              <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-brand-orange align-middle" />
            )}
          </div>
        )}
      </div>

      {/* Kolom input — selalu ada; di phase mengetik, pertanyaan muncul di sini dulu */}
      <div
        className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2 transition-colors ${
          typingInput || sending ? "border-brand-orange/50 ring-2 ring-brand-orange/10" : "border-border"
        }`}
      >
        <span className="min-w-0 flex-1 truncate font-manrope text-[11px]">
          {typingInput ? (
            <>
              <span className="text-text-main">{QUESTION.slice(0, typedQ)}</span>
              <span className="ml-[1px] inline-block h-3 w-[2px] animate-pulse bg-brand-orange align-middle" />
            </>
          ) : (
            <span className="text-muted-foreground">Tanya apa saja…</span>
          )}
        </span>
        <span
          className={`rounded-lg px-3 py-1.5 font-manrope text-[10px] transition-all ${
            sending
              ? "scale-95 bg-brand-orange text-white shadow-sm"
              : typingInput && typedQ >= QUESTION.length
                ? "bg-brand-navy text-white"
                : "bg-brand-navy text-white"
          }`}
        >
          Kirim ↑
        </span>
      </div>
    </div>
  );
}
