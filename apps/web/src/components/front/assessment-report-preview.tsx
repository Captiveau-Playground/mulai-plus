"use client";

import { FileText, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** RIASEC bars sample — nilai laporan contoh */
const RIASEC: { code: string; label: string; value: number; color: string }[] = [
  { code: "I", label: "Investigatif", value: 82, color: "#0d9488" },
  { code: "A", label: "Artistik", value: 74, color: "#7c3aed" },
  { code: "S", label: "Sosial", value: 66, color: "#1a1f6d" },
  { code: "R", label: "Realistis", value: 58, color: "#e07b39" },
  { code: "E", label: "Enterprising", value: 47, color: "#2563eb" },
  { code: "C", label: "Konvensional", value: 39, color: "#64748b" },
];

const ABILITY = [
  { label: "Logika & Penalaran", value: 80, color: "#0d9488" },
  { label: "Numerik", value: 67, color: "#7c3aed" },
  { label: "Verbal", value: 72, color: "#1a1f6d" },
];

/** Preview singkat laporan TMB (mirip halaman report HTML) — animasi bar, CTA cobain. */
export function AssessmentReportPreview() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="animate-[mockfloat_6s_ease-in-out_infinite] overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-brand-navy/10">
      {/* header laporan */}
      <div className="flex items-center justify-between border-gray-100 border-b bg-gray-50/70 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy text-white">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="font-bold font-bricolage text-gray-900 text-xs">Laporan Tes Minat &amp; Bakat</p>
            <p className="font-manrope text-[10px] text-gray-400">Identitas · RIASEC · Rekomendasi · e-Sign</p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-1 font-manrope font-semibold text-[9px] text-teal-700">
          <ShieldCheck className="h-3 w-3" /> PDF aman
        </span>
      </div>

      <div className="p-5">
        {/* kode dominan */}
        <div className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50/50 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            {["I", "A", "S"].map((l) => (
              <span
                key={l}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white font-bold font-manrope text-[10px] text-teal-600 shadow-sm"
              >
                {l}
              </span>
            ))}
          </div>
          <p className="font-manrope text-[10px] text-teal-800">Kode Holland: Investigatif–Artistik–Sosial</p>
        </div>

        {/* bars RIASEC — tumbuh & loop highlight */}
        <p className="mt-4 font-manrope font-semibold text-[11px] text-gray-700 uppercase tracking-wide">Skor Minat</p>
        <div className="mt-2 space-y-1.5">
          {RIASEC.map((r, i) => {
            const highlight = i % 3 === tick % 3;
            return (
              <div key={r.code} className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 font-bold font-manrope text-[9px] text-gray-600">
                  {r.code}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${r.value}%`,
                      backgroundColor: r.color,
                      opacity: highlight ? 1 : 0.6,
                    }}
                  />
                </div>
                <span className="w-6 text-right font-manrope font-semibold text-[9px] text-gray-500 tabular-nums">
                  {r.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* ability */}
        <div className="mt-3.5 grid grid-cols-1 gap-1.5 rounded-xl bg-gray-50 p-3">
          {ABILITY.map((a) => (
            <div key={a.label} className="flex items-center gap-2">
              <span className="w-24 shrink-0 font-manrope text-[9.5px] text-gray-500">{a.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${a.value}%`, backgroundColor: a.color }}
                />
              </div>
              <span className="w-6 text-right font-manrope font-semibold text-[9px] text-gray-500 tabular-nums">
                {a.value}
              </span>
            </div>
          ))}
        </div>

        {/* rekomendasi + CTA */}
        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-brand-orange/20 bg-brand-orange/5 px-3 py-2.5">
          <TrendingUp className="h-4 w-4 shrink-0 text-brand-orange" />
          <p className="font-manrope text-[10.5px] text-gray-600">
            Rekomendasi: <b className="text-brand-navy">Psikologi</b>,{" "}
            <b className="text-brand-navy">Ilmu Komunikasi</b>, <b className="text-brand-navy">DKV</b>… (+12 jurusan
            lain)
          </p>
        </div>

        <Link
          href="/login?callbackUrl=%2Fdashboard%2Fstudent%2Fassessment"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand-orange py-3 font-bold font-bricolage text-sm text-white shadow-brand-orange/20 shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
        >
          Cobain &amp; Lihat Laporanmu <span aria-hidden>→</span>
        </Link>
        <p className="mt-2 text-center font-manrope text-[10px] text-gray-400">
          Gratis · hasil instan · PDF ber-ttd sistem
        </p>
      </div>
    </div>
  );
}
