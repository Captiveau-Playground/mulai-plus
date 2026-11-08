/**
 * Prioritas kampus & pemilih contoh prodi untuk hasil rekomendasi.
 * Dipakai engine (`computeRecommendations`) dan katalog/seeder.
 */

/** Kampus favorit — urutan = prioritas (makin atas makin diutamakan di daftar contoh prodi). */
export const CAMPUS_PRIORITY: string[] = [
  "universitas indonesia",
  "institut teknologi bandung",
  "universitas gadjah mada",
  "institut pertanian bogor",
  "institut teknologi sepuluh nopember",
  "universitas diponegoro",
  "universitas padjadjaran",
  "universitas airlangga",
  "universitas brawijaya",
  "universitas hasanuddin",
  "universitas andalas",
  "universitas sebelas maret",
  "universitas negeri yogyakarta",
  "universitas pendidikan indonesia",
  "universitas negeri semarang",
  "universitas negeri surabaya",
  "universitas sumatera utara",
  "universitas syiah kuala",
  "universitas udayana",
  "universitas negeri jakarta",
  "universitas lampung",
  "universitas jember",
  "universitas negeri malang",
  "universitas riau",
  "universitas sriwijaya",
  "universitas tanjungpura",
  "universitas sam ratulangi",
  "universitas mulawarman",
  "universitas bina nusantara",
  "universitas telkom",
  "universitas islam indonesia",
  "universitas muhammadiyah yogyakarta",
];

const tierCache = new Map<string, number>();

/** Peringkat kampus: 0 = paling favorit; 999 = tidak terdaftar. (memoized) */
export function campusTier(university: string): number {
  const u = (university ?? "").toLowerCase();
  const hit = tierCache.get(u);
  if (hit !== undefined) return hit;
  const i = CAMPUS_PRIORITY.findIndex((c) => u.includes(c));
  const tier = i === -1 ? 999 : i;
  if (tierCache.size < 5000) tierCache.set(u, tier);
  return tier;
}

/** Jenjang yang relevan untuk calon mahasiswa (S1 dulu, bukan S2/S3). */
export function levelTier(level?: string | null): number {
  const l = (level ?? "").toUpperCase();
  if (l.includes("S1") || l === "SARJANA") return 0;
  if (l.includes("D4")) return 1;
  if (l.includes("D3")) return 2;
  if (l.includes("PROFESI") || l.includes("SP-1") || l.includes("SP-2")) return 3;
  if (l.includes("S2") || l.includes("MAGISTER")) return 5;
  if (l.includes("S3") || l.includes("DOKTOR")) return 6;
  if (l.includes("D2") || l.includes("D1")) return 7;
  return 4;
}

/**
 * Pilih contoh prodi untuk ditampilkan di hasil:
 * 1) jenjang relevan (S1 → D4 → D3, bukan S2/S3), 2) kampus favorit,
 * 3) satu kampus satu prodi (variasi), 4) sisanya melengkapi.
 */
export function pickProdiRefs<T extends { name: string; university: string; level?: string | null }>(
  prodis: T[],
  limit = 5,
): T[] {
  // Jenjang untuk calon mahasiswa: utamakan S1/D4/D3. S2/S3 hanya dipakai bila kategori
  // benar-benar tidak punya jenjang sarjana (dulu "Magister …" bisa muncul di hasil tes).
  const undergraduate = prodis.filter((p) => levelTier(p.level) <= 2);
  const pool = undergraduate.length > 0 ? undergraduate : prodis;
  const sorted = [...pool].sort(
    (a, b) =>
      levelTier(a.level) - levelTier(b.level) ||
      campusTier(a.university) - campusTier(b.university) ||
      a.university.localeCompare(b.university) ||
      a.name.localeCompare(b.name),
  );
  const out: T[] = [];
  const usedUni = new Set<string>();
  for (const p of sorted) {
    if (out.length >= limit) break;
    if (usedUni.has(p.university)) continue;
    usedUni.add(p.university);
    out.push(p);
  }
  for (const p of sorted) {
    if (out.length >= limit) break;
    if (!out.includes(p)) out.push(p);
  }
  return out.slice(0, limit);
}
