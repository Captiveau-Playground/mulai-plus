/**
 * Normalisasi skor Holland (RIASEC) ke PERSEN 0–100.
 *
 * Data `hollandScores` di database menyimpan skor MENTAH (mis. { I: 90, A: 82, S: 84 }),
 * bukan 0..1. Dulu UI/PDF mengalikannya dengan 100 sehingga muncul "6900%" / "6000%".
 * Sekarang: persentase = skor / total × 100 (enam huruf berjumlah ±100%).
 *
 * Data lama (pipeline lama) kadang sudah berupa 0..1 → dideteksi dari total ≤ 1.5.
 */
export function hollandPercents(scores: Record<string, number> | null | undefined): Record<string, number> {
  const src = scores ?? {};
  const letters = ["R", "I", "A", "S", "E", "C"];
  const raw = letters.map((l) => {
    const v = Number(src[l] ?? 0);
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  });
  const total = raw.reduce((a, b) => a + b, 0);
  if (total <= 0) return Object.fromEntries(letters.map((l) => [l, 0]));
  // Sudah pecahan (0..1)?
  const asFraction = total <= 1.5;
  return Object.fromEntries(
    letters.map((l, i) => {
      const v = raw[i] ?? 0;
      const pct = asFraction ? v * 100 : (v / total) * 100;
      return [l, Math.round(pct)];
    }),
  );
}
