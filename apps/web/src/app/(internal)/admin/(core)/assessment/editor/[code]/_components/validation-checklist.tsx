"use client";

// Checklist kelayakan rilis — dihitung dari isi versi yang sedang dibuka, jadi admin tahu
// apa yang kurang TANPA harus klik "Verifikasi & Rilis" dulu.
// Hasil otoritatif tetap dari discoverAdmin.versions.validate saat publish.
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ValidationCheck {
  label: string;
  ok: boolean;
}

export function buildChecks(input: {
  name?: string;
  code?: string;
  dimensions: { id: string; isActive?: boolean | null }[];
  questions: {
    id: string;
    dimensionId: string;
    questionType: string;
    scaleId?: string | null;
    displayOrder?: number | null;
  }[];
  options: { questionId: string; label?: string | null; imageUrl?: string | null; icon?: string | null }[];
  totalDim: number;
  resultDimCount: number;
  minQPerDim: number;
  randomizeA?: boolean;
}): ValidationCheck[] {
  const { dimensions, questions, options, totalDim, resultDimCount, minQPerDim } = input;
  const activeDims = dimensions.filter((d) => d.isActive !== false);
  const optsOf = (qid: string) => options.filter((o) => o.questionId === qid);
  const countByDim = (dimId: string) => questions.filter((q) => q.dimensionId === dimId).length;
  const seen = new Set<string>();
  let uniqueOrder = true;
  for (const q of questions) {
    const key = `${q.dimensionId}:${q.displayOrder ?? 0}`;
    if (seen.has(key)) uniqueOrder = false;
    seen.add(key);
  }
  return [
    { label: "Tes punya nama & kode", ok: !!input.name && !!input.code },
    {
      label: `Dimensi aktif sesuai total_dim (${activeDims.length}/${totalDim})`,
      ok: totalDim > 0 && activeDims.length === totalDim,
    },
    {
      label: "Setiap soal punya dimensi & skala jawaban",
      ok:
        questions.length > 0 &&
        questions.every((q) => !!q.dimensionId && (q.questionType !== "multiple_choice" || !!q.scaleId)),
    },
    {
      label: "Pilihan ganda punya ≥2 opsi berlabel",
      ok: questions
        .filter((q) => q.questionType === "multiple_choice")
        .every((q) => optsOf(q.id).filter((o) => o.label || o.imageUrl || o.icon).length >= 2),
    },
    {
      label: minQPerDim > 0 ? `Tiap dimensi ≥ ${minQPerDim} soal` : "Min. soal per dimensi (bebas)",
      ok: minQPerDim <= 0 || activeDims.every((d) => countByDim(d.id) >= minQPerDim),
    },
    { label: "Urutan soal unik per dimensi", ok: uniqueOrder },
    { label: `Top-N (${resultDimCount}) ≤ total dimensi`, ok: resultDimCount > 0 && resultDimCount <= totalDim },
    {
      label: "Acak opsi aman (tidak bentrok dengan soal skala)",
      ok: !(input.randomizeA === true && questions.some((q) => q.questionType === "likert")),
    },
  ];
}

export function ValidationChecklist({
  checks,
  serverErrors,
  warnings,
  className,
}: {
  checks: ValidationCheck[];
  serverErrors?: string[];
  warnings?: string[];
  className?: string;
}) {
  const failing = checks.filter((c) => !c.ok);
  const extra = (serverErrors ?? []).filter((e) => !checks.some((c) => e.startsWith(c.label)));
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        failing.length === 0 ? "border-teal-200 bg-teal-50/50" : "border-red-200 bg-red-50/50",
        className,
      )}
      data-testid="validation-checklist"
    >
      <p
        className={cn(
          "flex items-center gap-1.5 font-manrope font-semibold text-xs",
          failing.length === 0 ? "text-teal-700" : "text-red-700",
        )}
      >
        {failing.length === 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        {failing.length === 0 ? "Siap terbit — semua syarat terpenuhi" : `${failing.length} hal perlu diperbaiki`}
      </p>
      <ul className="mt-2 space-y-1">
        {checks.map((c) => (
          <li
            key={c.label}
            className="flex items-start gap-1.5 font-manrope text-[10px] leading-4"
            data-testid={`check-${c.ok ? "ok" : "fail"}`}
          >
            {c.ok ? (
              <CheckCircle2 className="mt-px h-3 w-3 shrink-0 text-teal-600" />
            ) : (
              <XCircle className="mt-px h-3 w-3 shrink-0 text-red-500" />
            )}
            <span className={c.ok ? "text-teal-800/70" : "font-semibold text-red-700"}>{c.label}</span>
          </li>
        ))}
        {extra.map((e) => (
          <li key={e} className="flex items-start gap-1.5 font-manrope text-[10px] text-red-700 leading-4">
            <XCircle className="mt-px h-3 w-3 shrink-0 text-red-500" />
            <span>{e}</span>
          </li>
        ))}
      </ul>
      {(warnings ?? []).length > 0 && (
        <ul className="mt-2 space-y-1 border-amber-200 border-t pt-2">
          {(warnings ?? []).map((w) => (
            <li key={w} className="flex items-start gap-1.5 font-manrope text-[10px] text-amber-700 leading-4">
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
