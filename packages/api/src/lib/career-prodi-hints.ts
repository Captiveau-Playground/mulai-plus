/**
 * Pemetaan KARIER → PRODI (jalur kuliah) yang variatif.
 *
 * Kenapa ada file ini: `tmb_career_mappings` hanya menyimpan karier → KATEGORI jurusan,
 * sehingga dua karier dalam satu kategori (mis. Environmental Analyst & ESG Analyst)
 * mendapat daftar prodi yang SAMA. Di sini setiap karier diberi preferensi kata kunci
 * prodi + aturan variasi supaya jalur kuliahnya berbeda dan masuk akal.
 *
 * Semua prodi tetap diambil dari katalog nyata (`study_programs`, ±15.000 prodi aktif),
 * jadi tidak ada data karangan: file ini hanya memberi SKOR & URUTAN.
 */

export interface ProdiLike {
  name: string;
  university?: string | null;
  level?: string | null;
}

type Hint = {
  /** Cocokkan nama karier (lowercase). */
  match: RegExp;
  /** Frasa/kata kunci yang membuat prodi LEBIH relevan untuk karier ini. */
  prefer: RegExp[];
  /** Prodi yang sebaiknya tidak dipakai untuk karier ini (mis. salah kategori). */
  avoid?: RegExp[];
};

/** Kata kunci umum yang sering muncul di nama karier tapi tidak membantu memilih prodi. */
const STOPWORDS = new Set([
  "analyst",
  "analysis",
  "officer",
  "specialist",
  "associate",
  "assistant",
  "manager",
  "consultant",
  "engineer",
  "senior",
  "junior",
  "staff",
  "lead",
  "head",
  "executive",
  "dan",
  "the",
  "of",
]);

const HINTS: Hint[] = [
  // ── Lingkungan & keberlanjutan ──
  {
    match: /environmental analyst|analis lingkungan/i,
    prefer: [/lingkungan/i, /pengelolaan lingkungan/i, /kesehatan lingkungan/i, /teknik lingkungan/i],
    avoid: [/gigi/i, /seni/i, /hukum/i],
  },
  {
    match: /\besg\b|sustainability|keberlanjutan/i,
    prefer: [/lingkungan/i, /kehutanan/i, /ekonomi/i, /hukum/i, /manajemen/i, /agribisnis/i, /sosial/i],
    avoid: [/gigi/i, /seni/i],
  },
  {
    match: /carbon|karbon|emisi/i,
    prefer: [/akuntansi/i, /lingkungan/i, /kehutanan/i, /ekonomi/i, /manajemen/i, /statistika/i],
    avoid: [/gigi/i, /seni/i],
  },
  {
    match: /conservation|konservasi/i,
    prefer: [/konservasi sumberdaya hutan/i, /konservasi hutan/i, /konservasi laut/i, /kehutanan/i, /biologi/i],
    avoid: [/gigi/i, /seni/i],
  },
  // ── Data & teknologi ──
  {
    match: /data analyst|analis data/i,
    prefer: [/statistika/i, /sains data/i, /matematika/i, /ilmu aktuaria/i, /sistem informasi/i],
    avoid: [/gigi/i, /seni/i],
  },
  {
    match: /data scientist|ilmu data/i,
    prefer: [/sains data/i, /kecerdasan artifisial/i, /kecerdasan buatan/i, /ilmu komputer/i, /statistika/i],
  },
  {
    match: /data steward|tata kelola data|data governance/i,
    prefer: [/sistem informasi/i, /informasi geografis/i, /penginderaan jauh/i, /perpustakaan/i, /manajemen/i],
  },
  {
    match: /software|developer|programmer|engineer.*software/i,
    prefer: [
      /informatika/i,
      /rekayasa perangkat lunak/i,
      /teknologi informasi/i,
      /ilmu komputer/i,
      /sistem informasi/i,
    ],
  },
  {
    match: /cyber|security|keamanan informasi/i,
    prefer: [/keamanan siber/i, /keamanan informasi/i, /informatika/i, /teknologi informasi/i],
  },
  {
    match: /\bai\b|machine learning|kecerdasan artifisial/i,
    prefer: [/kecerdasan artifisial/i, /kecerdasan buatan/i, /sains data/i, /informatika/i, /statistika/i],
  },
  // ── Kesehatan ──
  { match: /dokter|physician/i, prefer: [/kedokteran/i], avoid: [/gigi/i, /keperawatan/i, /farmasi/i] },
  { match: / dokter gigi|dentist/i, prefer: [/kedokteran gigi/i] },
  { match: /apoteker|pharmac/i, prefer: [/farmasi/i], avoid: [/gigi/i] },
  { match: /perawat|nurse/i, prefer: [/keperawatan/i], avoid: [/gigi/i] },
  { match: /gizi|nutrisi|diet/i, prefer: [/gizi/i], avoid: [/gigi/i] },
  { match: /fisioterap|terapis fisik/i, prefer: [/fisioterapi/i, /terapi fisik/i] },
  { match: /bidan|midwif/i, prefer: [/kebidanan/i] },
  {
    match: /kesehatan masyarakat|public health/i,
    prefer: [/kesehatan masyarakat/i, /epidemiologi/i, /administrasi rumah sakit/i],
  },
  // ── Ekonomi, bisnis, keuangan ──
  { match: /akuntan|accounting/i, prefer: [/akuntansi/i, /akuntansi sektor publik/i] },
  { match: /pajak|tax/i, prefer: [/perpajakan/i, /akuntansi/i, /administrasi bisnis/i] },
  { match: /auditor|audit/i, prefer: [/akuntansi/i, /audit/i] },
  { match: /bank|perbankan/i, prefer: [/perbankan/i, /keuangan/i, /akuntansi/i] },
  {
    match: /investasi|analis keuangan|financial/i,
    prefer: [/keuangan/i, /manajemen keuangan/i, /ekonomi/i, /aktuaria/i],
  },
  { match: /marketing|pemasaran/i, prefer: [/pemasaran/i, /manajemen/i, /komunikasi/i, /bisnis digital/i] },
  { match: /hrd|human resource|sdm/i, prefer: [/manajemen/i, /psikologi/i, /administrasi bisnis/i] },
  {
    match: /logistik|supply chain|rantai pasok/i,
    prefer: [/logistik/i, /manajemen transportasi/i, /teknik industri/i, /administrasi bisnis/i],
  },
  { match: /wirausaha|entrepreneur|bisnis/i, prefer: [/kewirausahaan/i, /bisnis/i, /manajemen/i] },
  // ── Hukum, sosial, pemerintahan ──
  { match: /pengacara|advokat|lawyer|hukum/i, prefer: [/hukum/i] },
  { match: /diplomat|hubungan internasional/i, prefer: [/hubungan internasional/i, /ilmu politik/i] },
  {
    match: /pns|asn|pemerintahan|policy|kebijakan/i,
    prefer: [/ilmu pemerintahan/i, /administrasi publik/i, /kebijakan publik/i, /ilmu politik/i],
  },
  { match: /psikolog|psycholog/i, prefer: [/psikologi/i] },
  { match: /sosiolog|social/i, prefer: [/sosiologi/i, /kesejahteraan sosial/i, /ilmu sosial/i] },
  { match: /guru|pendidik|teacher/i, prefer: [/pendidikan/i, /keguruan/i] },
  // ── Teknik & industri ──
  { match: /sipil|civil/i, prefer: [/teknik sipil/i, /teknik konstruksi/i] },
  { match: /mesin|mechanical/i, prefer: [/teknik mesin/i, /teknik otomotif/i] },
  { match: /elektro|electrical/i, prefer: [/teknik elektro/i, /teknik listrik/i] },
  { match: /arsitek|architect/i, prefer: [/arsitektur/i, /desain interior/i] },
  { match: /industri|industrial/i, prefer: [/teknik industri/i, /teknik logistik/i] },
  { match: /pertambangan|mining|geologi/i, prefer: [/teknik pertambangan/i, /geologi/i, /teknik geofisika/i] },
  {
    match: /pertanian|agronom|agroteknologi/i,
    prefer: [/agroteknologi/i, /agronomi/i, /ilmu tanah/i, /proteksi tanaman/i],
  },
  { match: /peternakan|ternak/i, prefer: [/peternakan/i, /nutrisi dan teknologi pakan/i] },
  { match: /perikanan|kelautan|marine/i, prefer: [/ilmu kelautan/i, /perikanan/i, /teknologi hasil perikanan/i] },
  // ── Kreatif & media ──
  { match: /desainer|design/i, prefer: [/desain/i, /desain komunikasi visual/i, /desain produk/i] },
  { match: /jurnalis|media|public relation|humas/i, prefer: [/komunikasi/i, /jurnalistik/i, /penyiaran/i] },
  { match: /film|animasi|multimedia/i, prefer: [/animasi/i, /multimedia/i, /televisi/i, /film/i] },
  // ── Bahasa & budaya ──
  { match: /penerjemah|translator|bahasa/i, prefer: [/sastra/i, /bahasa/i, /linguistik/i] },
  { match: /pariwisata|travel|hospitality/i, prefer: [/pariwisata/i, /perhotelan/i, /usaha perjalanan wisata/i] },
];

/** Prodi nyasar akibat pencocokan kata kunci seeder (mis. "Konservasi Gigi" di kategori lingkungan). */
const NOISE: { test: RegExp; unlessCareer: RegExp }[] = [
  { test: /\bgigi\b/i, unlessCareer: /gigi|dental/i },
  { test: /konservasi seni/i, unlessCareer: /seni|art/i },
  { test: /konservasi gigi/i, unlessCareer: /gigi|dental/i },
];

/** Nama kampus keagamaan (UIN/IAIN/STAIN) & PTN besar — untuk variasi kampus pada jalur kuliah. */
const KEAGAMAAN_RE =
  /\buin\b|\biain\b|\bstain\b|islam negeri|institut agama islam|universitas islam|sekolah tinggi agama/i;
const NEGERI_RE =
  /universitas negeri|institut teknologi|politeknik negeri|islam negeri|gadjah mada|indonesia\b|pajajaran|diponegoro|airlangga|brawijaya|hasanuddin|andalas|sebelas maret|padjadjaran|pendidikan indonesia|sumatera utara|syiah kuala|udayana|negeri jakarta|lampung|jember|negeri malang|riau|sriwijaya|tanjungpura|sam ratulangi|mulawarman|sebelas|bogor|sepuluh nopember|negeri semarang|negeri surabaya|negeri yogyakarta|negeri gorontalo|negeri manado|negeri padang|negeri medan|negeri makassar/i;

export function campusFlavor(university?: string | null): "negeri" | "swasta" | "keagamaan" | "lain" {
  const u = (university ?? "").toLowerCase();
  if (!u) return "lain";
  if (KEAGAMAAN_RE.test(u)) return "keagamaan";
  if (NEGERI_RE.test(u)) return "negeri";
  if (/universitas|institut|politeknik|sekolah tinggi/.test(u)) return "swasta";
  return "lain";
}

/** Skor relevansi prodi untuk sebuah karier (0 = netral). */
export function scoreProdiForCareer(prodiName: string, careerName: string): number {
  const p = prodiName.toLowerCase();
  const c = careerName.toLowerCase();
  let score = 0;

  for (const h of HINTS) {
    if (!h.match.test(c)) continue;
    if (h.avoid?.some((re) => re.test(p))) score -= 4;
    if (h.prefer.some((re) => re.test(p))) score += 6;
  }

  // Fallback: token nama karier yang muncul di nama prodi (mis. "keuangan", "industri").
  for (const tok of c.split(/[^a-z]+/).filter((x) => x.length >= 4 && !STOPWORDS.has(x))) {
    if (p.includes(tok)) score += 1;
  }

  for (const n of NOISE) {
    if (n.test.test(p) && !n.unlessCareer.test(c)) score -= 5;
  }
  return score;
}

/** Hash stabil dari nama karier → offset rotasi (supaya karier serumpun tidak identik). */
function careerSeed(careerName: string): number {
  let h = 0;
  for (let i = 0; i < careerName.length; i++) h = (h * 31 + careerName.charCodeAt(i)) % 100003;
  return h;
}

/**
 * Pilih contoh prodi untuk satu karier:
 * 1) skor relevansi kata kunci (nama karier ↔ nama prodi),
 * 2) kampus favorit & jenjang sarjana dulu,
 * 3) SATU prodi per kampus + campur negeri/swasta/keagamaan bila tersedia,
 * 4) rotasi berbasis nama karier → dua karier sekategori mendapat daftar BERBEDA.
 */
export function pickCareerProdi<T extends ProdiLike & { name: string }>(
  pool: T[],
  careerName: string,
  opts: {
    limit?: number;
    levelTier?: (level?: string | null) => number;
    campusTier?: (university: string) => number;
  } = {},
): T[] {
  const limit = opts.limit ?? 3;
  const levelTier = opts.levelTier ?? (() => 0);
  const campusTier = opts.campusTier ?? (() => 999);

  // Calon mahasiswa: pakai jenjang S1/D4/D3 bila ada (S2/S3 hanya bila tidak ada sama sekali).
  const undergrad = pool.filter((p) => levelTier(p.level) <= 2);
  const src = undergrad.length > 0 ? undergrad : pool;

  const scored = src
    .map((p) => ({ p, score: scoreProdiForCareer(p.name, careerName) }))
    .filter(({ score }) => score > -4) // buang prodi yang jelas tidak relevan
    .sort(
      (a, b) =>
        b.score - a.score ||
        levelTier(a.p.level) - levelTier(b.p.level) ||
        campusTier(a.p.university ?? "") - campusTier(b.p.university ?? "") ||
        a.p.name.localeCompare(b.p.name),
    );

  // Rotasi: geser kandidat ber-skot SETARA agar karier serumpun tidak menampilkan daftar sama.
  const top = scored.slice(0, Math.max(limit * 4, 12));
  const raw = careerSeed(careerName) % Math.max(1, Math.min(top.length, limit * 2));
  const rotated = [...top.slice(raw), ...top.slice(0, raw)];

  const out: T[] = [];
  const usedUni = new Set<string>();
  const usedName = new Set<string>();
  const flavors = new Set<string>();

  const take = (list: { p: T }[], needFlavor: boolean) => {
    for (const { p } of list) {
      if (out.length >= limit) return;
      const uni = (p.university ?? "").toLowerCase();
      const name = p.name.trim().toLowerCase();
      if (usedName.has(name)) continue;
      if (uni && usedUni.has(uni)) continue;
      const flavor = campusFlavor(p.university);
      if (needFlavor && flavor !== "lain" && flavors.has(flavor) && out.length < limit - 1) continue;
      usedName.add(name);
      if (uni) usedUni.add(uni);
      if (flavor !== "lain") flavors.add(flavor);
      out.push(p);
    }
  };

  take(
    rotated.map(({ p }) => ({ p })),
    true,
  ); // prioritas: variasi kampus
  take(
    rotated.map(({ p }) => ({ p })),
    false,
  ); // pelengkap bila variasi belum cukup

  // Kalau masih kurang (pool kecil), ambil dari seluruh pool tanpa aturan variasi.
  if (out.length < limit) {
    for (const p of src) {
      if (out.length >= limit) break;
      if (out.some((x) => x.name === p.name && x.university === p.university)) continue;
      out.push(p);
    }
  }
  return out;
}
