import { db, eq, schema } from "@mulai-plus/db";

/**
 * Rekomendasi jurusan & karier dari hasil skoring engine.
 * Menggunakan mapping hybrid legacy:
 *  - Holland: cocok primary/secondary dengan top-2 kode hasil (bobot 60%)
 *  - Ability : cocok bobot tiap dimensi (numerical/logical/spatial/verbal/clerical) dgn skor siswa (bobot 40%)
 * Bobot soal/AVG/WEIGHTED memengaruhi SKOR dimensi → profil → rekomendasi ini ikut berubah otomatis.
 */
export async function recommendForResult(input: {
  topCodes: string[];
  abilityScores: Record<string, number>; // kunci lowercase (numerical, …)
  limit?: number;
}) {
  const patterns = await db.query.tmbMajorPatterns.findMany({ where: eq(schema.tmbMajorPatterns.isActive, true) });
  const careers = await db.query.tmbCareerMappings.findMany();
  const byCat = new Map<string, string[]>();
  for (const c of careers) {
    const arr = byCat.get(c.majorCategory) ?? [];
    arr.push(c.careerName);
    byCat.set(c.majorCategory, arr);
  }

  const top = new Set(input.topCodes.map((c) => c.toUpperCase()));
  const limit = input.limit ?? 6;

  const scored = patterns
    .map((p) => {
      const hp = (p.hollandPrimary ?? "").toUpperCase();
      const hs = (p.hollandSecondary ?? "").toUpperCase();
      const hol = (top.has(hp) ? 1 : 0) + (top.has(hs) ? 1 : 0); // 0..2
      let ab = 0;
      let abMax = 0;
      for (const [k, w] of Object.entries((p.abilityWeights as Record<string, number>) ?? {})) {
        const s = input.abilityScores[k.toLowerCase()];
        if (s !== undefined && Number.isFinite(s)) { ab += (w ?? 0) * s; abMax += (w ?? 0) * 100; }
      }
      const abPct = abMax > 0 ? Math.min(100, Math.max(0, (ab / abMax) * 100)) : 0;
      const confidence = Math.round((hol / 2) * 60 + abPct * 0.4);
      return { categoryName: p.categoryName, categoryKey: p.categoryKey, confidence, hol, abPct: Math.round(abPct) };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);

  return scored.map((s) => ({ ...s, careers: byCat.get(s.categoryName) ?? [] }));
}
