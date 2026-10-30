"use client";

// Checklist kelayakan rilis — dihitung dari isi versi yang sedang dibuka, jadi admin tahu
// apa yang kurang TANPA harus klik "Verifikasi & Rilis" dulu.
// Hasil otoritatif tetap dari discoverAdmin.versions.validate saat publish.
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ValidationCheck {
  label: string;
  ok: boolean;
  /** Soal-soal yang menyebabkan gagal — dipakai tombol "Perbaiki" untuk lompat ke soal itu. */
  fix?: { questionIds: string[]; hint?: string };
}

export function buildChecks(input: {
  name?: string;
  code?: string;
  dimensions: { id: string; isActive?: boolean | null }[];
  questions: {
    id: string;
    dimensionId: string;
    questionType: string;
    /** mode tampilan opsi (emoji_option / standard_option_card / visual_comparison) */
    presentationMode?: string | null;
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
    (() => {
      // Skala likert TIDAK wajib emoji — boleh angka 1..5 atau teks.
      // Yang diwajibkan: (a) mode "Emoji / ikon" harus punya ikon di tiap opsi,
      // (b) opsi skala apa pun harus punya isi yang bisa dibaca (ikon/teks/gambar).
      const bad = questions.filter((q) => {
        const os = optsOf(q.id);
        if (os.length === 0) return false;
        const isScale = q.presentationMode === "emoji_option" || q.questionType === "likert";
        if (!isScale) return false;
        // Skala angka (label 1..5) tidak butuh ikon walau mode tampilan "Emoji"
        const numeric = os.every((o) => /^\d+$/.test(String(o.label ?? "").trim()));
        if (numeric) return false;
        if (q.presentationMode === "emoji_option") {
          return os.some((o) => !(o.icon && String(o.icon).trim()));
        }
        // mode teks/angka: cukup ada label / ikon / gambar
        return os.some(
          (o) => !(o.label && String(o.label).trim()) && !(o.icon && String(o.icon).trim()) && !o.imageUrl,
        );
      });
      return {
        label: "Opsi skala punya isi (emoji wajib di mode Emoji)",
        ok: bad.length === 0,
        fix: bad.length ? { questionIds: bad.map((q) => q.id), hint: "lengkapi ikon/label opsi skala" } : undefined,
      };
    })(),
    (() => {
      // (audit soal) item minat (likert) tidak boleh berada di tes bakat
      const bad = input.code?.toUpperCase() === "TALENT" ? questions.filter((q) => q.questionType === "likert") : [];
      return {
        label: "Tes bakat tidak memuat soal skala/minat",
        ok: bad.length === 0,
        fix: bad.length ? { questionIds: bad.map((q) => q.id), hint: "hapus/nonaktifkan soal skala" } : undefined,
      };
    })(),
  ];
}

export function ValidationChecklist({
  checks,
  serverErrors,
  warnings,
  className,
  onOpenQuestion,
}: {
  checks: ValidationCheck[];
  serverErrors?: string[];
  warnings?: string[];
  className?: string;
  /** Buka editor untuk satu soal (mis. dari tombol "Perbaiki" pada checklist). */
  onOpenQuestion?: (id: string) => void;
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
        {checks.map((c) => {
          const fixId = !c.ok && c.fix && c.fix.questionIds.length > 0 ? c.fix.questionIds[0] : undefined;
          const fixCount = c.fix?.questionIds.length ?? 0;
          return (
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
              {/* Arahkan langsung ke soal yang bermasalah (buka editor soal itu) */}
              {fixId && (
                <button
                  type="button"
                  data-testid="check-fix"
                  title={c.fix?.hint ? `Perbaiki: ${c.fix.hint}` : "Buka soal yang bermasalah"}
                  onClick={() => onOpenQuestion?.(fixId)}
                  disabled={!onOpenQuestion}
                  className="ml-auto shrink-0 rounded border border-red-200 px-1.5 py-0.5 font-semibold text-[10px] text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Perbaiki{fixCount > 1 ? ` (${fixCount})` : ""}
                </button>
              )}
            </li>
          );
        })}
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
