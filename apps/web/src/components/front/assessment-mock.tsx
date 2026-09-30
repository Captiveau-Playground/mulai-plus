"use client";

import { Check, Compass, FlaskConical, Lightbulb, Palette, Puzzle, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";

/** Mockup test beranimasi: soal bergilir, progress jalan, pilihan menyala-nyala, kode RIASEC pop. */
const SLIDES = [
  {
    section: "Tes Minat",
    question: "Kamu lebih suka bekerja dengan…",
    options: [
      { icon: FlaskConical, label: "Data dan eksperimen ilmiah", code: "I" },
      { icon: Palette, label: "Ide kreatif dan visual", code: "A" },
    ],
  },
  {
    section: "Tes Minat",
    question: "Saat kerja kelompok, kamu biasanya…",
    options: [
      { icon: Users, label: "Mengajak semua orang bicara & berdiskusi", code: "S" },
      { icon: Search, label: "Meriset dulu sebelum mengambil keputusan", code: "I" },
    ],
  },
  {
    section: "Tes Bakat",
    question: "Menghadapi masalah, langkah pertamamu…",
    options: [
      { icon: Lightbulb, label: "Mencari solusi cepat & praktis", code: "R" },
      { icon: Puzzle, label: "Membuat rencana langkah demi langkah", code: "C" },
    ],
  },
  {
    section: "Tes Bakat",
    question: "Kegiatan yang paling mengisi energimu…",
    options: [
      { icon: Compass, label: "Memimpin proyek dan memengaruhi orang", code: "E" },
      { icon: Puzzle, label: "Menyusun sistem dan mengatur data", code: "C" },
    ],
  },
];

const LETTERS = ["I", "A", "S"];

export function AssessmentMock() {
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % SLIDES.length);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSel((s) => (s + 1) % 2), 1400);
    return () => clearTimeout(t);
  }, []);

  const slide = SLIDES[idx];
  const pct = Math.round(((idx + 1) / SLIDES.length) * 100);

  return (
    <div className="animate-[mockfloat_5s_ease-in-out_infinite] overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-brand-navy/10">
      {/* title bar */}
      <div className="flex items-center gap-1.5 border-gray-100 border-b bg-gray-50/80 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-1 font-manrope text-[10px] text-gray-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" /> assessment
        </div>
      </div>

      <div className="p-6" key={idx} style={{ animation: "fadeInSlide 0.5s ease" }}>
        {/* progress */}
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-manrope font-semibold text-gray-400 text-xs tabular-nums">
            {idx + 1}/{SLIDES.length}
          </span>
        </div>

        {/* section + question */}
        <p className="mt-5 font-manrope font-semibold text-teal-600 text-xs uppercase tracking-wide">{slide.section}</p>
        <h3 className="mt-1 font-bold font-bricolage text-gray-900 text-lg">{slide.question}</h3>

        {/* options */}
        <div className="mt-4 space-y-2.5">
          {slide.options.map((opt, oi) => {
            const active = oi === sel;
            return (
              <div
                key={oi}
                className={
                  active
                    ? "flex items-center gap-3 rounded-xl border-2 border-teal-500 bg-teal-500/5 p-3.5 transition-colors"
                    : "flex items-center gap-3 rounded-xl border border-gray-200 p-3.5 transition-colors hover:border-teal-500/50"
                }
              >
                <span
                  className={
                    active
                      ? "flex h-8 w-8 shrink-0 animate-shake-soft items-center justify-center rounded-lg bg-teal-500 text-white"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500"
                  }
                >
                  <opt.icon className="h-4 w-4" />
                </span>
                <span
                  className={
                    active ? "font-manrope font-medium text-gray-800 text-sm" : "font-manrope text-gray-700 text-sm"
                  }
                >
                  {opt.label}
                </span>
                {active && <Check className="ml-auto h-4 w-4 shrink-0 text-teal-600" />}
              </div>
            );
          })}
        </div>

        {/* code RIASEC */}
        <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 p-3">
          <div className="flex items-center gap-2">
            {LETTERS.map((l, li) => (
              <span
                key={`${idx}-${l}-${li}`}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white font-bold text-[10px] text-gray-500"
                style={{
                  animation: li === idx % 3 ? "mockpop 0.35s ease" : undefined,
                  color: li === idx % 3 ? "#14b8a6" : undefined,
                }}
              >
                {l}
              </span>
            ))}
          </div>
          <span className="font-manrope text-[10px] text-gray-400">Kode minatmu</span>
        </div>
      </div>
    </div>
  );
}
