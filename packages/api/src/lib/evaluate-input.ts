/**
 * Evaluasi jawaban TEXT_INPUT (Talent™ — Fase 2).
 * Modes: exact_match, numeric_tolerance, keyword_match, pattern_match.
 * Normalisasi: pecahan "3/4" → 0.75; "12,5%" → 12.5.
 */

export type TextEvalType = "exact_match" | "numeric_tolerance" | "keyword_match" | "pattern_match";

/** Ubah "3/4", "12,5%", "0,75" → angka; null bila bukan numerik. */
export function parseNumeric(raw: string): number | null {
  const t = raw.trim().replace(/%$/, "").replace(/,/g, ".");
  if (/^\d+\/\d+$/.test(t)) {
    const [a, b] = t.split("/").map(Number);
    if (b === 0 || a === undefined || b === undefined) return null;
    return a / b;
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return null;
}

/** Normalisasi teks: trim, hilangkan spasi ganda, huruf kecil. */
export function normalizeText(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Evaluasi satu jawaban isian.
 * - exact_match: sama persis setelah normalisasi & kembaran numerik.
 * - numeric_tolerance: |jawaban - kunci| ≤ tolerance (default 0.01).
 * - keyword_match: kunci (boleh dipisah |) semua harus ada (salah satu).
 * - pattern_match: regex pada teks answer_key.
 */
export function evaluateTextInput(
  evaluationType: TextEvalType,
  answerKey: string,
  studentRaw: string,
  tolerance = "0.01",
): { correct: boolean; normalized: string; numeric?: number | null } {
  if (!studentRaw || !studentRaw.trim()) return { correct: false, normalized: "" };
  const normalized = normalizeText(studentRaw);

  switch (evaluationType) {
    case "exact_match": {
      const nk = parseNumeric(answerKey);
      const ns = parseNumeric(normalized);
      if (nk !== null && ns !== null) return { correct: Math.abs(nk - ns) < 1e-9, normalized, numeric: ns };
      return { correct: normalizeText(answerKey) === normalized, normalized };
    }
    case "numeric_tolerance": {
      const nk = parseNumeric(answerKey);
      const ns = parseNumeric(normalized);
      const tol = Number(tolerance || "0.01");
      if (nk === null || ns === null) return { correct: false, normalized, numeric: ns };
      return { correct: Math.abs(ns - nk) <= tol, normalized, numeric: ns };
    }
    case "keyword_match": {
      const keys = answerKey.split("|").map(normalizeText).filter(Boolean);
      return { correct: keys.length > 0 && keys.some((k) => normalized.includes(k)), normalized };
    }
    case "pattern_match": {
      try {
        return { correct: new RegExp(answerKey, "i").test(normalized), normalized };
      } catch {
        return { correct: false, normalized };
      }
    }
    default:
      return { correct: false, normalized };
  }
}