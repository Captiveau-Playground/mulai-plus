import { randomUUID } from "node:crypto";
import { and, asc, count, db, desc, eq, gte, inArray, isNotNull, lte, max, ne, sql } from "@mulai-plus/db/db";
import {
  assessmentAnswers,
  assessmentDimensions,
  assessmentOrgs,
  assessmentResults,
  assessmentSessions,
  assessments,
  assessmentVersions,
  questionOptions,
  questions,
} from "@mulai-plus/db/schema/assessment";
import { studentDetail, user as userSchema } from "@mulai-plus/db/schema/auth";
import { studyPrograms, universities } from "@mulai-plus/db/schema/pddikti";
import {
  tmbAiSummaries,
  tmbAssessmentResults,
  tmbBatches,
  tmbBatchStudents,
  tmbCareerMappings,
  tmbMajorPatterns,
  tmbProfiles,
  tmbQuestionBank,
  tmbRecommendations,
  tmbSchools,
  tmbTestAnswers,
  tmbTestAttempts,
  tmbTestCatalog,
  tmbUserStats,
} from "@mulai-plus/db/schema/tmb";
import { notifyDiscord } from "@mulai-plus/notify/discord";
import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure } from "../index";
import {
  avgOf,
  computeCohortStats,
  computeFunnel,
  computeItemStats,
  computeTimeseries,
  computeVersionStats,
} from "../lib/assessment-analytics";
import { campusTier, pickProdiRefs } from "../lib/campus-priority";
import { notFound, preconditionFailed } from "../lib/errors";
import { awardProgress } from "../lib/gamification";
import { mail } from "../lib/mail";
import { levelFromSchoolName } from "../lib/school-level";
import { webBaseUrl } from "../lib/web-url";

// ─── Konstanta ───────────────────────────────────────────

const HOLLAND_DIMS = ["R", "I", "A", "S", "E", "C"];
const ABILITY_DIMS = ["numerical", "verbal", "logical", "spatial", "clerical"];
const ABILITY_LEVEL_MAP: Record<string, number> = { high: 1, medium: 0.6, low: 0.3 };

// ─── Karir Impian: alias/kata kunci untuk mencocokkan teks bebas → 57 karier ──
const CAREER_KEYWORDS: Record<string, string[]> = {
  Dokter: ["dokter", "kedokteran", "medical", "medicine", "dokter umum", "dokter gigi", "dokter bedah"],
  "Dokter Spesialis": ["dokter spesialis", "spesialis", "bedah", "cardiologist", "anastesi"],
  Perawat: ["perawat", "nurse", "keperawatan"],
  Bidan: ["bidan", "midwife", "kebidanan"],
  Apoteker: ["apoteker", "pharmacist", "farmasi", "obat"],
  Psikolog: ["psikolog", "psychology", "psikologi", "konselor", "terapis"],
  "HR Specialist": ["hr", "human resource", "sdm", "rekrutmen", "hrd"],
  Pengacara: ["pengacara", "lawyer", "advokat", "hukum"],
  "Legal Officer": ["legal", "compliance", "legal officer"],
  "Software Engineer": [
    "software",
    "engineer",
    "programmer",
    "coding",
    "developer",
    "game developer",
    "game programmer",
    "aplikasi",
    "backend",
    "frontend",
    "fullstack",
    "web developer",
    "mobile developer",
    "it developer",
    "pembuat game",
    "pembuat aplikasi",
    "programming",
    "ngoding",
    "pemrograman",
    "codingan",
    "aplikasi mobile",
    "buat game",
    "membuat aplikasi",
    "membuat game",
    "mobile",
    "web",
    "it",
    "teknologi informasi",
  ],
  "Data Scientist": ["data scientist", "machine learning", "ai", "kecerdasan buatan", "ml", "artificial intelligence"],
  "DevOps Engineer": ["devops", "cloud", "infrastructure", "sysadmin"],
  "Electrical Engineer": ["elektro", "electrical", "listrik", "elektronika", "robotika"],
  "Mechanical Engineer": ["mesin", "mechanical", "teknik mesin", "mekanik"],
  "Civil Engineer": ["sipil", "civil", "konstruksi", "bangunan", "insinyur sipil"],
  Arsitek: ["arsitek", "arsitektur", "architect", "desain bangunan", "interior"],
  Akuntan: ["akuntan", "akuntansi", "accountant", "keuangan", "finance"],
  Auditor: ["auditor", "audit", "internal audit"],
  Banker: ["bank", "banker", "perbankan", "teller", "investasi"],
  "Konsultan Pajak": ["pajak", "tax", "perpajakan", "konsultan pajak"],
  "Business Analyst": ["business analyst", "analis bisnis", "konsultan bisnis", "ba"],
  Manajer: [
    "manajer",
    "manager",
    "manajemen",
    "pemimpin",
    "ceo",
    "wirausaha",
    "pengusaha",
    "entrepreneur",
    "bisnis",
    "usaha sendiri",
    "startup",
  ],
  Ekonom: ["ekonom", "economics", "ekonomi", "analis ekonomi"],
  "Marketing Specialist": [
    "marketing",
    "pemasaran",
    "digital marketing",
    "seo",
    "content marketing",
    "sales",
    "jualan",
    "online shop",
    "toko online",
    "e-commerce",
    "affiliate",
    "dropship",
  ],
  "Public Relations": [
    "public relations",
    "pr",
    "humas",
    "media relations",
    "media sosial",
    "sosmed",
    "youtuber",
    "content creator",
    "konten kreator",
    "influencer",
    "selebgram",
    "vlogger",
    "entertainer",
    "creator",
  ],
  Jurnalis: ["jurnalis", "journalist", "wartawan", "reporter", "penulis berita", "broadcast"],
  "Graphic Designer": [
    "graphic designer",
    "desainer",
    "desain grafis",
    "designer",
    "illustrator",
    "video editor",
    "editor video",
    "game artist",
    "animasi",
    "multimedia",
    "desain visual",
    "gambar",
    "menggambar",
    "desain baju",
    "fashion",
    "desain pakaian",
  ],
  "UI/UX Designer": ["ui", "ux", "ui ux", "uiux", "product designer", "game designer", "desain digital", "prototype"],
  Penulis: ["penulis", "writer", "novel", "sastra", "content writer", "menulis", "cerita", "blogger"],
  Penerjemah: ["penerjemah", "translator", "interpreter", "bahasa asing"],
  Guru: ["guru", "teacher", "mengajar", "pendidikan", "pengajar", "les"],
  Dosen: ["dosen", "lecturer", "akademisi", "dosen peneliti"],
  Aktuaris: ["aktuaris", "actuary", "aktuaria", "asuransi"],
  "Analis Kuantitatif": ["kuantitatif", "quant", "analis kuantitatif"],
  "Data Analyst": ["data analyst", "analis data", "data", "analytics"],
  Statistikawan: ["statistikawan", "statistician", "statistika", "statistik"],
  Peneliti: ["peneliti", "researcher", "riset", "sains", "fisika", "ilmuwan", "research"],
  "R&D Scientist": ["r&d", "research and development", "scientist", "kimia", "lab"],
  Biologist: ["biologist", "biologi", "biologiwan"],
  Bioinformatician: ["bioinformatician", "bioinformatika", "bioteknologi"],
  Diplomat: [
    "diplomat",
    "diplomasi",
    "hubungan internasional",
    "kedutaan",
    "duta besar",
    "pbb",
    "kementerian luar negeri",
  ],
  "Kebijakan Publik": ["kebijakan", "policy", "politik", "pemerintah", "birokrasi", "pejabat", "aparatur"],
  "Peneliti Sosial": ["sosiologi", "sosial", "social researcher", "peneliti sosial", "antropologi"],
  "Administrasi Perkantoran": ["administrasi", "admin", "perkantoran", "sekretaris", "kantor"],
  "Hotel Manager": [
    "hotel",
    "hospitality",
    "pariwisata",
    "tourism",
    "tour guide",
    "perhotelan",
    "resort",
    "pramugari",
    "flight attendant",
  ],
  Chef: ["chef", "koki", "kuliner", "memasak", "culinary", "masak", "baker", "pastry"],
  Agronom: ["agronom", "pertanian", "agriculture", "tanaman", "agribisnis", "petani"],
  "Forestry Officer": ["kehutanan", "forestry", "hutan", "ranger"],
  "Marine Biologist": ["perikanan", "marine", "biologi laut", "kelautan", "ikan", "laut"],
  "Supply Chain Analyst": ["logistik", "supply chain", "rantai pasok", "ekspedisi", "pengiriman", "gudang"],
  Geologist: ["geologi", "geology", "tambang", "mineral", "migas", "pertambangan"],
  "Aerospace Engineer": ["dirgantara", "aerospace", "penerbangan", "roket", "pesawat", "astronot", "pilot"],
  "Automotive Engineer": ["otomotif", "automotive", "mobil", "kendaraan", "bengkel"],
  "Ahli Gizi": ["gizi", "nutrition", "diet", "nutrisi", "ahli gizi"],
  Fisioterapis: ["fisioterapi", "physiotherapy", "terapi fisik", "fisioterapis"],
  "Dokter Hewan": ["dokter hewan", "veterinary", "hewan", "kedokteran hewan", "vet"],
  "Sports Coach": ["olahraga", "sports", "pelatih", "atlet", "coach", "fitness", "gym"],
};

function matchCareers(
  text: string,
  careers: { majorCategory: string; careerName: string }[],
): { careerName: string; categoryKey: string; score: number }[] {
  const norm = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const tokens = norm.split(" ").filter((t) => t.length > 1);
  const results: { careerName: string; categoryKey: string; score: number }[] = [];

  for (const c of careers) {
    let score = 0;
    const nameNorm = c.careerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const nameTokens = new Set(nameNorm.split(" "));
    for (const t of tokens) {
      if (nameTokens.has(t)) score += 2;
      // prefix match: "psikologis" → "psikolog"
      for (const nt of nameTokens) if (nt.length > 4 && t.startsWith(nt)) score += 1.5;
    }
    for (const k of CAREER_KEYWORDS[c.careerName] ?? []) {
      const kn = k
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      if (kn && kn.length >= 3 && norm.includes(kn)) score += Math.min(2, kn.split(" ").length);
    }
    if (score > 0) results.push({ careerName: c.careerName, categoryKey: c.majorCategory, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 8);
}

// Cache prodi (data statis) — refresh 24 jam
export type ProdiRow = {
  name: string;
  level: string | null;
  university: string;
  idSms: string;
  idSp: string;
  /** kategori jurusan hasil precompute (null bila kolom belum ada / prodi baru) */
  majorCategoryKey?: string | null;
};
let prodiCache: ProdiRow[] | null = null;
let prodiCacheTs = 0;
/** false setelah terdeteksi kolom `major_category_key` belum ada (migrasi belum jalan). */
let prodiHasCategoryColumn = true;

export async function getProdiList(): Promise<ProdiRow[]> {
  const now = Date.now();
  if (prodiCache && now - prodiCacheTs <= 86400_000) return prodiCache;

  const base = {
    name: studyPrograms.name,
    level: studyPrograms.level,
    university: universities.name,
    idSms: studyPrograms.idSms,
    idSp: studyPrograms.idSp,
  };

  // AMAN UNTUK DEPLOY BERTAHAP: kalau migrasi kolom belum jalan, jangan sampai
  // `finish` ikut 500 — fallback ke query tanpa kolom (jalur regex tetap dipakai).
  if (prodiHasCategoryColumn) {
    try {
      const rows = await db
        .select({ ...base, majorCategoryKey: studyPrograms.majorCategoryKey })
        .from(studyPrograms)
        .innerJoin(universities, eq(studyPrograms.idSp, universities.idSp))
        .where(eq(studyPrograms.status, "Aktif"));
      prodiCache = rows;
      prodiCacheTs = now;
      return prodiCache;
    } catch (e: any) {
      prodiHasCategoryColumn = false;
      console.error(
        "[prodi] kolom major_category_key belum tersedia — pakai jalur regex (jalankan migrasi 0045):",
        String(e?.message ?? e).slice(0, 160),
      );
    }
  }

  const rows = await db
    .select(base)
    .from(studyPrograms)
    .innerJoin(universities, eq(studyPrograms.idSp, universities.idSp))
    .where(eq(studyPrograms.status, "Aktif"));
  prodiCache = rows.map((r) => ({ ...r, majorCategoryKey: null }));
  prodiCacheTs = now;
  return prodiCache;
}

// ─── Scoring engine ──────────────────────────────────────

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function computeHolland(
  answers: { question: { dimension: string; pairDimension: string | null }; selectedOption: string }[],
) {
  // hitung frekuensi & kemunculan per dimensi
  const freq: Record<string, number> = {};
  const appear: Record<string, number> = {};
  for (const a of answers) {
    const dim = a.question.dimension;
    const pair = a.question.pairDimension;
    appear[dim] = (appear[dim] ?? 0) + 1;
    if (pair) appear[pair] = (appear[pair] ?? 0) + 1;
    // option A → dimension, option B → pairDimension
    const chosen = a.selectedOption === "A" ? dim : pair;
    if (chosen) freq[chosen] = (freq[chosen] ?? 0) + 1;
  }
  // normalisasi
  const scores: Record<string, number> = {};
  for (const d of HOLLAND_DIMS) {
    scores[d] = appear[d] ? (freq[d] ?? 0) / appear[d] : 0;
  }
  const sorted = [...HOLLAND_DIMS].sort((x, y) => (scores[y] ?? 0) - (scores[x] ?? 0));
  const code = sorted.slice(0, 3).join("");

  // degree of differentiation
  const values = HOLLAND_DIMS.map((d) => scores[d] ?? 0);
  const spread = Math.max(...values) - Math.min(...values);
  const differentiation = spread >= 0.5 ? "strong" : spread >= 0.25 ? "moderate" : "weak";

  return { code, scores, differentiation };
}

function computeAbility(answers: { question: { dimension: string; answer: string | null }; selectedOption: string }[]) {
  const scores: Record<string, { correct: number; total: number }> = {};
  for (const d of ABILITY_DIMS) scores[d] = { correct: 0, total: 0 };
  for (const a of answers) {
    const dim = a.question.dimension;
    if (!scores[dim]) scores[dim] = { correct: 0, total: 0 };
    scores[dim].total += 1;
    if (a.question.answer && a.selectedOption === a.question.answer) scores[dim].correct += 1;
  }
  const levels: Record<string, string> = {};
  for (const d of ABILITY_DIMS) {
    const s = scores[d] ?? { correct: 0, total: 0 };
    const ratio = s.total ? s.correct / s.total : 0;
    levels[d] = ratio >= 0.75 ? "high" : ratio >= 0.5 ? "medium" : "low";
  }
  return { scores, levels };
}

/** Regex pola jurusan dikompilasi sekali (bukan per prodi). */
function compilePatterns(patterns: { pattern: string; categoryKey: string }[]) {
  const out: { key: string; re: RegExp }[] = [];
  for (const p of patterns) {
    try {
      out.push({ key: p.categoryKey, re: new RegExp(p.pattern, "i") });
    } catch {
      // pola rusak di admin tidak boleh menjatuhkan hasil siswa
    }
  }
  return out;
}

const prodiGroupCache = new Map<string, Map<string, any[]>>();

/**
 * Petakan prodi→kategori (memoized). Cache di-key oleh "sidik jari" pola + jumlah prodi,
 * jadi perubahan Pola Jurusan otomatis membuang cache. ~15k prodi × 63 regex hanya
 * dijalankan sekali per isolate.
 */
function groupProdiByCategory(
  prodiList: { name: string; level: string | null; university: string; idSms: string; idSp: string }[],
  compiled: { key: string; re: RegExp }[],
): { byCategory: Map<string, typeof prodiList> } {
  // Sidik jari HARUS membedakan isi pola (panjang saja bisa tabrakan antar-set pola).
  const fingerprint = `${prodiList.length}|${compiled.map((c) => `${c.key}=${c.re.source}`).join("¦")}`;
  const cached = prodiGroupCache.get(fingerprint);
  if (cached) return { byCategory: cached as Map<string, typeof prodiList> };

  const byCategory = new Map<string, typeof prodiList>();
  for (const p of prodiList) {
    for (const c of compiled) {
      if (c.re.test(p.name)) {
        const arr = byCategory.get(c.key) ?? [];
        arr.push(p);
        byCategory.set(c.key, arr);
        break;
      }
    }
  }
  prodiGroupCache.clear();
  prodiGroupCache.set(fingerprint, byCategory as Map<string, any[]>);
  return { byCategory };
}

/**
 * Kelompokkan prodi per kategori jurusan.
 * Jalur utama: kolom `study_programs.major_category_key` (diisi seeder) → O(n) tanpa regex.
 * Fallback regex hanya untuk prodi yang belum berkategori (data PDDikti baru / pola baru);
 * regex dikompilasi sekali & hasilnya di-cache per isolate.
 */
export function prodiByCategory<T extends { name: string; majorCategoryKey?: string | null }>(
  prodiList: T[],
  patterns: { categoryKey: string; pattern: string }[],
): Map<string, T[]> {
  const byCategory = new Map<string, T[]>();
  const hasPrecomputed = prodiList.some((p) => p.majorCategoryKey);
  if (!hasPrecomputed) {
    return groupProdiByCategory(prodiList as any, compilePatterns(patterns)).byCategory as unknown as Map<string, T[]>;
  }
  const pending: T[] = [];
  for (const p of prodiList) {
    const key = p.majorCategoryKey ?? null;
    if (!key) {
      pending.push(p);
      continue;
    }
    const arr = byCategory.get(key) ?? [];
    arr.push(p);
    byCategory.set(key, arr);
  }
  if (pending.length) {
    const fallback = groupProdiByCategory(pending as any, compilePatterns(patterns)).byCategory;
    for (const [k, v] of fallback) {
      const arr = byCategory.get(k) ?? [];
      arr.push(...(v as unknown as T[]));
      byCategory.set(k, arr);
    }
  }
  return byCategory;
}

export function computeRecommendations(
  holland: { code: string; scores: Record<string, number> },
  ability: { levels: Record<string, string> },
  prodiList: { name: string; level: string | null; university: string; idSms: string; idSp: string }[],
  patterns: {
    categoryKey: string;
    categoryName: string;
    pattern: string;
    hollandPrimary: string;
    hollandSecondary: string;
    abilityWeights: Record<string, number>;
  }[],
  careers: { majorCategory: string; careerName: string }[],
) {
  const byCategory = prodiByCategory(prodiList as any, patterns as any) as Map<string, typeof prodiList>;

  const studentHolland = holland.scores;
  // Normalisasi skor minat ke 0..1 (engine bisa kirim raw count) — cegah persen kecocokan nggak-realistis (mis. 333%)
  const rawVals = Object.values(studentHolland ?? {})
    .map(Number)
    .filter((v) => Number.isFinite(v));
  const sumV = rawVals.length ? rawVals.reduce((a, b) => a + b, 0) : 1;
  const nH = (key: string) => (sumV > 0 ? (Number(studentHolland?.[key]) || 0) / sumV : 0);
  const results: {
    category: (typeof patterns)[number];
    confidence: number;
    interest: number;
    ability: number;
    count: number;
    allProdis: typeof prodiList;
    examples: typeof prodiList;
  }[] = [];

  for (const pat of patterns) {
    const prodis = byCategory.get(pat.categoryKey);
    if (!prodis?.length) continue;

    const primary = pat.hollandPrimary;
    const secondary = pat.hollandSecondary;
    const interestMatch = (nH(primary) + nH(secondary)) / 2;

    const weights = pat.abilityWeights ?? {};
    const weightSum = Object.values(weights).reduce((a: number, b: number) => a + b, 0);
    let abilityMatch = 0;
    if (weightSum > 0) {
      for (const [dim, w] of Object.entries(weights)) {
        abilityMatch += (w ?? 0) * (ABILITY_LEVEL_MAP[ability.levels[dim] ?? "medium"] ?? 0.6);
      }
      abilityMatch /= weightSum;
    } else {
      abilityMatch = 0.6;
    }

    const confidence = 0.6 * interestMatch + 0.4 * abilityMatch;
    results.push({
      category: pat,
      confidence,
      interest: interestMatch,
      ability: abilityMatch,
      count: prodis.length,
      // contoh prodi dihitung setelah top-5 dipilih (sorting 63 kategori itu mahal)
      allProdis: prodis,
      examples: [] as typeof prodiList,
    });
  }

  results.sort((a, b) => b.confidence - a.confidence);
  const top = results.slice(0, 5);
  // pilih contoh prodi hanya untuk 5 jurusan teratas (kampus favorit dulu)
  for (const r of top) r.examples = pickProdiRefs(r.allProdis, 5);

  // karier untuk top kategori — disebar (maks 2 per kategori) supaya variatif, bukan menumpuk di satu jurusan
  const topKeys = top.map((r) => r.category.categoryKey);
  const matchedCareers: { majorCategory: string; careerName: string }[] = [];
  for (let round = 0; round < 2; round++) {
    for (const key of topKeys) {
      const opts = careers.filter((c) => c.majorCategory === key);
      const pick = opts[round];
      if (pick && !matchedCareers.some((m) => m.careerName === pick.careerName)) matchedCareers.push(pick);
    }
  }
  matchedCareers.length = Math.min(matchedCareers.length, 6);

  const majors = top.map((r, i) => ({
    rank: i + 1,
    itemName: r.category.categoryName,
    categoryKey: r.category.categoryKey,
    confidence: (r.confidence * 100).toFixed(1),
    interest: (r.interest * 100).toFixed(0),
    ability: (r.ability * 100).toFixed(0),
    count: r.count,
    prodiRefs: r.examples.map((p) => ({
      prodi: p.name,
      level: p.level,
      university: p.university,
      favorite: campusTier(p.university) < 999,
      link: `/explore/universities/${slugify(p.university)}-${p.idSp.substring(0, 6)}/prodi/${encodeURIComponent(p.idSms)}`,
    })),
  }));

  const careerRecos = matchedCareers.map((c, i) => ({
    rank: i + 1,
    itemName: c.careerName,
    categoryKey: c.majorCategory,
  }));

  return { majors, careers: careerRecos, byCategory: Object.fromEntries(byCategory) };
}

// ─── Helpers konten admin ────────────────────────────────

function validatePatternRegex(pattern: string) {
  try {
    new RegExp(pattern, "i");
  } catch {
    preconditionFailed(`Regex tidak valid: ${pattern}`);
  }
}

async function syncCatalogTotal(testCode: "interest" | "ability") {
  const rows = await db.query.tmbQuestionBank.findMany({
    where: eq(tmbQuestionBank.testCode, testCode),
    columns: { id: true },
  });
  await db.update(tmbTestCatalog).set({ totalQuestions: rows.length }).where(eq(tmbTestCatalog.code, testCode));
}

// ─── Router ──────────────────────────────────────────────

let lbCache: any = null;
let lbCacheTs = 0;

/** (B2C) Isi otomatis profil siswa dari sekolah undangan — hanya bila masih kosong. */
async function prefillStudentProfileFromBatch(userId: string, batchId: string) {
  try {
    const batch = await db.query.tmbBatches.findFirst({ where: eq(tmbBatches.id, batchId) });
    if (!batch) return;
    const school = await db.query.tmbSchools.findFirst({ where: eq(tmbSchools.id, batch.schoolId) });
    if (!school?.name) return;

    const existing = await db.query.studentDetail.findFirst({ where: eq(studentDetail.userId, userId) });
    const schoolFilled = !!existing?.school?.trim();
    const levelFilled = !!existing?.educationLevel?.trim();
    if (schoolFilled && levelFilled) return;

    const patch = {
      ...(schoolFilled ? {} : { school: school.name }),
      ...(levelFilled ? {} : { educationLevel: levelFromSchoolName(school.name) }),
    };
    if (existing) {
      await db.update(studentDetail).set(patch).where(eq(studentDetail.id, existing.id));
    } else {
      await db.insert(studentDetail).values({ id: randomUUID(), userId, ...patch });
    }
  } catch (e: any) {
    console.error("[prefill profil] gagal:", e?.message ?? e);
  }
}

export const tmbRouter = {
  profile: {
    get: protectedProcedure.handler(async ({ context }) => {
      const userId = context.session.user.id;
      const [profile, stats] = await Promise.all([
        db.query.tmbProfiles.findFirst({ where: eq(tmbProfiles.userId, userId) }),
        db.query.tmbUserStats.findFirst({ where: eq(tmbUserStats.userId, userId) }),
      ]);
      return { profile: profile ?? null, stats: stats ?? null };
    }),

    save: protectedProcedure
      .input(
        z.object({
          gender: z.string().optional(),
          birthDate: z.string().optional(),
          educationLevel: z.string().optional(),
          schoolName: z.string().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const userId = context.session.user.id;
        await db
          .insert(tmbProfiles)
          .values({ userId, ...input })
          .onConflictDoUpdate({ target: tmbProfiles.userId, set: { ...input, updatedAt: new Date() } });
        return { success: true };
      }),
  },

  leaderboard: {
    /**
     * Papan peringkat Test Bakat — publik; nama disensor (inisial + ***), email tidak pernah dikirim.
     *
     * Sumber data = ENGINE aktif (`assessment_*`), bukan `tmb_test_*` legacy: engine menulis
     * jawaban & durasi ke `assessment_answers` / `assessment_sessions`, sedangkan tabel lama
     * sudah tidak diisi (dulu leaderboard selalu kosong/skor 0).
     *
     * Peringkat: akurasi (benar/dijawab) → jumlah benar → waktu tercepat.
     * Minimal 10 soal dijawab supaya percobaan 1–2 soal tidak mendominasi 100%.
     */
    ability: publicProcedure.handler(async ({ context }) => {
      const nowMs = Date.now();
      if (lbCacheTs > nowMs) return lbCache;
      const viewerId = (context as any)?.session?.user?.id ?? null;
      const rows = (await db.execute(sql`
        WITH per_attempt AS (
          SELECT s.student_id AS user_id, s.id,
            count(an.id)::int AS answered,
            count(an.id) FILTER (WHERE an.score_earned > 0)::int AS correct,
            GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(s.completed_at, s.started_at) - s.started_at))::int) AS dur
          FROM assessment_sessions s
          JOIN assessment_versions v ON v.id = s.version_id
          JOIN assessments a ON a.id = v.assessment_id AND a.code = 'TALENT'
          LEFT JOIN assessment_answers an ON an.session_id = s.id
          WHERE s.status IN ('completed','timeout')
          GROUP BY s.student_id, s.id, s.started_at, s.completed_at
        ), scored AS (
          SELECT *, (100.0 * correct / GREATEST(answered, 1))::int AS acc
          FROM per_attempt WHERE answered >= 10
        ), best AS (
          SELECT DISTINCT ON (user_id) user_id, correct, answered, acc, dur, id
          FROM scored ORDER BY user_id, acc DESC, correct DESC, dur ASC
        )
        SELECT b.user_id, b.correct, b.answered, b.acc, b.dur, u.name AS name
        FROM best b
        JOIN "user" u ON u.id = b.user_id
        WHERE u.name IS NOT NULL AND btrim(u.name) <> ''
          AND COALESCE(u.email, '') NOT LIKE '%@test.local'
          AND COALESCE(u.email, '') NOT LIKE '%@example.com'
        ORDER BY b.acc DESC, b.correct DESC, b.dur ASC
        LIMIT 50`)) as unknown as {
        rows?: { user_id: string; correct: number; answered: number; acc: number; dur: number; name: string }[];
      };

      const list = (rows.rows ?? []).map((r, i) => {
        const name = (r.name ?? "Pengguna").trim();
        const masked =
          name.length > 1 ? `${name[0]}${"*".repeat(Math.min(3, Math.max(2, name.length - 1)))}` : `${name}**`;
        return {
          rank: i + 1,
          masked,
          score: Number(r.correct ?? 0),
          total: Number(r.answered ?? 0),
          accuracy: Number(r.acc ?? 0),
          durationSec: Number(r.dur ?? 0),
          isSelf: !!viewerId && r.user_id === viewerId,
        };
      });
      lbCache = { updatedAt: new Date().toISOString(), entries: list };
      lbCacheTs = Date.now() + 60_000;
      return lbCache;
    }),
  },

  assessment: {
    list: protectedProcedure.handler(async ({ context }) => {
      const userId = context.session.user.id;
      const [tests, attempts, stats, results] = await Promise.all([
        db.query.tmbTestCatalog.findMany({ where: eq(tmbTestCatalog.isActive, true) }),
        db.query.tmbTestAttempts.findMany({
          where: eq(tmbTestAttempts.userId, userId),
          orderBy: desc(tmbTestAttempts.startedAt),
        }),
        db.query.tmbUserStats.findFirst({ where: eq(tmbUserStats.userId, userId) }),
        db.query.tmbAssessmentResults.findMany({
          where: eq(tmbAssessmentResults.userId, userId),
          orderBy: desc(tmbAssessmentResults.createdAt),
          limit: 5,
        }),
      ]);

      const status: Record<string, { completed: boolean; inProgress: boolean }> = {};
      for (const t of tests) {
        const attemptsOfTest = attempts.filter((a) => a.testCode === t.code);
        status[t.code] = {
          completed: attemptsOfTest.some((a) => a.status === "completed"),
          inProgress: attemptsOfTest.some((a) => a.status === "in_progress"),
        };
      }

      return {
        tests,
        status,
        stats: stats ?? { xp: 0, level: 1, streak: 0, testsCompleted: 0 },
        latestResult: results[0] ?? null,
        hasCompletedBoth: results.length > 0,
        // progres per percobaan (ascending by tanggal) — untuk grafik naik/turun
        progress: [...results].reverse().map((r) => {
          const ability = (r.abilityScores ?? { scores: {} }) as {
            scores?: Record<string, { correct: number; total: number }>;
          };
          const abilityPct: Record<string, number> = {};
          for (const [dim, s] of Object.entries(ability.scores ?? {})) {
            abilityPct[dim] = s.total ? Math.round((s.correct / s.total) * 100) : 0;
          }
          return {
            createdAt: r.createdAt,
            confidenceScore: Number(r.confidenceScore ?? 0),
            hollandCode: r.hollandCode,
            hollandScores: (r.hollandScores ?? {}) as Record<string, number>,
            abilityPct,
          };
        }),
      };
    }),

    start: protectedProcedure
      .input(z.object({ testCode: z.enum(["interest", "ability"]) }))
      .handler(async ({ input, context }) => {
        const userId = context.session.user.id;
        const catalog = await db.query.tmbTestCatalog.findFirst({
          where: and(eq(tmbTestCatalog.code, input.testCode), eq(tmbTestCatalog.isActive, true)),
        });
        if (!catalog) notFound("Test tidak ditemukan");

        // resume kalau ada attempt in_progress
        const existing = await db.query.tmbTestAttempts.findFirst({
          where: and(
            eq(tmbTestAttempts.userId, userId),
            eq(tmbTestAttempts.testCode, input.testCode),
            eq(tmbTestAttempts.status, "in_progress"),
          ),
        });
        if (existing) {
          return {
            attemptId: existing.id,
            total: catalog.totalQuestions,
            current: existing.currentQuestion,
            resumed: true,
          };
        }

        const id = randomUUID();
        await db.insert(tmbTestAttempts).values({ id, userId, testCode: input.testCode });

        // jika user ter-link ke batch_student (undangan) → status in_progress
        await db
          .update(tmbBatchStudents)
          .set({ status: "in_progress" })
          .where(and(eq(tmbBatchStudents.userId, userId), eq(tmbBatchStudents.status, "invited")));

        return { attemptId: id, total: catalog.totalQuestions, current: 0, resumed: false };
      }),

    question: protectedProcedure.input(z.object({ attemptId: z.string() })).handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const attempt = await db.query.tmbTestAttempts.findFirst({
        where: and(eq(tmbTestAttempts.id, input.attemptId), eq(tmbTestAttempts.userId, userId)),
      });
      if (!attempt) notFound("Attempt tidak ditemukan");

      const questions = await db.query.tmbQuestionBank.findMany({
        where: and(eq(tmbQuestionBank.testCode, attempt.testCode), eq(tmbQuestionBank.isActive, true)),
        orderBy: asc(tmbQuestionBank.order),
      });

      const index = Math.min(attempt.currentQuestion, questions.length - 1);
      const q = questions[index];
      if (!q) return { done: true, question: null, total: questions.length, progress: questions.length };

      const answered = await db.query.tmbTestAnswers.findFirst({
        where: and(eq(tmbTestAnswers.attemptId, attempt.id), eq(tmbTestAnswers.questionId, q.id)),
      });

      return {
        done: false,
        total: questions.length,
        progress: index + 1,
        question: {
          id: q.id,
          text: q.text,
          dimension: q.dimension,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          answered: answered?.selectedOption ?? null,
        },
      };
    }),

    answer: protectedProcedure
      .input(z.object({ attemptId: z.string(), questionId: z.string(), selectedOption: z.string() }))
      .handler(async ({ input, context }) => {
        const userId = context.session.user.id;
        const attempt = await db.query.tmbTestAttempts.findFirst({
          where: and(eq(tmbTestAttempts.id, input.attemptId), eq(tmbTestAttempts.userId, userId)),
        });
        if (!attempt) notFound("Attempt tidak ditemukan");
        if (attempt.status === "completed") preconditionFailed("Test sudah selesai");

        const question = await db.query.tmbQuestionBank.findFirst({ where: eq(tmbQuestionBank.id, input.questionId) });
        if (!question) notFound("Soal tidak ditemukan");

        const isCorrect = question.answer ? question.answer === input.selectedOption : null;

        await db
          .insert(tmbTestAnswers)
          .values({
            id: randomUUID(),
            attemptId: attempt.id,
            questionId: input.questionId,
            selectedOption: input.selectedOption,
            isCorrect,
          })
          .onConflictDoUpdate({
            target: [tmbTestAnswers.attemptId, tmbTestAnswers.questionId],
            set: { selectedOption: input.selectedOption, isCorrect, answeredAt: new Date() },
          });

        const total = await db.query.tmbQuestionBank.findMany({
          where: and(eq(tmbQuestionBank.testCode, attempt.testCode), eq(tmbQuestionBank.isActive, true)),
          columns: { id: true },
        });
        const answeredCount = await db
          .select({ n: count() })
          .from(tmbTestAnswers)
          .where(eq(tmbTestAnswers.attemptId, attempt.id));

        const next = Math.min(attempt.currentQuestion + 1, total.length);
        await db.update(tmbTestAttempts).set({ currentQuestion: next }).where(eq(tmbTestAttempts.id, attempt.id));

        const isLast = (answeredCount[0]?.n ?? 0) >= total.length || next >= total.length;
        return { progress: next, total: total.length, done: isLast, isCorrect };
      }),

    finish: protectedProcedure.input(z.object({ attemptId: z.string() })).handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const attempt = await db.query.tmbTestAttempts.findFirst({
        where: and(eq(tmbTestAttempts.id, input.attemptId), eq(tmbTestAttempts.userId, userId)),
      });
      if (!attempt) notFound("Attempt tidak ditemukan");
      if (attempt.status === "completed") {
        const existingResult = await db.query.tmbAssessmentResults.findFirst({
          where: eq(tmbAssessmentResults.userId, userId),
          orderBy: desc(tmbAssessmentResults.createdAt),
        });
        return { resultId: existingResult?.id ?? null, alreadyCompleted: true, bothDone: existingResult != null };
      }

      // ambil semua jawaban + soal
      const answers = await db.query.tmbTestAnswers.findMany({
        where: eq(tmbTestAnswers.attemptId, attempt.id),
        with: { question: true },
      });
      if (answers.length === 0) preconditionFailed("Belum ada jawaban");

      // update attempt
      await db
        .update(tmbTestAttempts)
        .set({ status: "completed", finishedAt: new Date() })
        .where(eq(tmbTestAttempts.id, attempt.id));

      // cek attempt test satunya
      const otherCode = attempt.testCode === "interest" ? "ability" : "interest";
      const otherAttempt = await db.query.tmbTestAttempts.findFirst({
        where: and(
          eq(tmbTestAttempts.userId, userId),
          eq(tmbTestAttempts.testCode, otherCode),
          eq(tmbTestAttempts.status, "completed"),
        ),
      });

      // XP + streak (setiap test selesai)
      const catalog = await db.query.tmbTestCatalog.findFirst({ where: eq(tmbTestCatalog.code, attempt.testCode) });
      await awardXp(userId, catalog?.xpReward ?? 50);

      // Jika KEDUA test selesai → hitung hasil + rekomendasi
      if (!otherAttempt) {
        return { resultId: null, alreadyCompleted: false, bothDone: false };
      }

      const interestAttempt = attempt.testCode === "interest" ? attempt : otherAttempt;
      const abilityAttempt = attempt.testCode === "ability" ? attempt : otherAttempt;
      const resultId = await computeResult(userId, interestAttempt.id, abilityAttempt.id);

      // sync ke batch_student (jika ter-link undangan)
      await db
        .update(tmbBatchStudents)
        .set({ resultId, status: "completed" })
        .where(eq(tmbBatchStudents.userId, userId));

      // Discord notif: kedua test selesai → hasil siap
      const webhookUrl = (context.env as { DISCORD_WEBHOOK_URL?: string } | undefined)?.DISCORD_WEBHOOK_URL;
      const u = context.session.user;
      notifyDiscord({
        webhookUrl,
        event: "assessment.result_ready",
        title: "📊 Hasil Tes Minat & Bakat siap",
        description: `${u.name ?? "User"} menyelesaikan Tes Minat & Bakat dan hasil rekomendasinya sudah tersedia.`,
        fields: [
          { name: "Nama", value: u.name ?? "-", inline: true },
          { name: "Email", value: u.email ?? "-", inline: true },
          { name: "User ID", value: userId, inline: false },
        ],
        throttleMs: 0,
        waitUntil: context.executionCtx?.waitUntil,
      });

      return { resultId, alreadyCompleted: false, bothDone: true };
    }),
  },

  result: {
    get: protectedProcedure.input(z.object({ resultId: z.string().optional() })).handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const result = input.resultId
        ? await db.query.tmbAssessmentResults.findFirst({
            where: and(eq(tmbAssessmentResults.id, input.resultId), eq(tmbAssessmentResults.userId, userId)),
          })
        : await db.query.tmbAssessmentResults.findFirst({
            where: eq(tmbAssessmentResults.userId, userId),
            orderBy: desc(tmbAssessmentResults.createdAt),
          });
      if (!result) notFound("Hasil tidak ditemukan");

      const [recommendations, summary, stats, profile] = await Promise.all([
        db.query.tmbRecommendations.findMany({
          where: eq(tmbRecommendations.resultId, result.id),
          orderBy: asc(tmbRecommendations.rank),
        }),
        db.query.tmbAiSummaries.findFirst({
          where: eq(tmbAiSummaries.resultId, result.id),
          orderBy: desc(tmbAiSummaries.createdAt),
        }),
        db.query.tmbUserStats.findFirst({ where: eq(tmbUserStats.userId, userId) }),
        db.query.tmbProfiles.findFirst({ where: eq(tmbProfiles.userId, userId) }),
      ]);

      // ── Karier → prodi ────────────────────────────────────────────────────────
      // Setiap karier WAJIB punya jalur kuliah (minimal 1 prodi) supaya cabang mindmap
      // tidak berhenti di nama profesi. Satu karier bisa dicapai dari beberapa prodi.
      const careerRows = recommendations.filter((r) => r.type === "career");
      let careerProdi: Record<string, any[]> = {};
      if (careerRows.length) {
        try {
          const [patterns, prodiList] = await Promise.all([
            db.query.tmbMajorPatterns.findMany({ where: eq(tmbMajorPatterns.isActive, true) }),
            getProdiList(),
          ]);
          const byCat = prodiByCategory(prodiList as any, patterns as any);
          for (const c of careerRows) {
            const key = (c.categoryKey ?? "").toString();
            if (!key || careerProdi[key]) continue;
            const pool = (byCat.get(key) ?? []) as any[];
            careerProdi[key] = pickProdiRefs(pool, 3).map((p: any) => ({
              prodi: p.name,
              level: p.level,
              university: p.university,
              favorite: campusTier(p.university) < 999,
              link: `/explore/universities/${slugify(p.university)}-${p.idSp.substring(0, 6)}/prodi/${encodeURIComponent(p.idSms)}`,
            }));
          }
        } catch (e: any) {
          console.error("[result] gagal memetakan karier → prodi:", e?.message ?? e);
          careerProdi = {};
        }
      }
      // Normalisasi prodiRefs tersimpan: jenjang untuk calon mahasiswa (S1/D4/D3 dulu) +
      // urutan kampus favorit. Hasil lama (dihitung sebelum aturan ini) ikut dirapikan tanpa
      // perlu migrasi data.
      const normalizeRefs = (refs: any[] | null | undefined, limit: number) => {
        const arr = Array.isArray(refs) ? refs : [];
        if (!arr.length) return [];
        const picked = pickProdiRefs(
          arr.map((x) => ({ ...x, name: x.prodi ?? x.name ?? "" })),
          limit,
        );
        return picked.map((x: any) => ({
          prodi: x.prodi ?? x.name,
          level: x.level ?? null,
          university: x.university,
          favorite: campusTier(x.university) < 999,
          link: x.link,
        }));
      };
      const recommendationsWithPaths = recommendations.map((r) => {
        if (r.type === "career") return { ...r, prodiRefs: careerProdi[(r.categoryKey ?? "").toString()] ?? [] };
        if (r.type === "major") return { ...r, prodiRefs: normalizeRefs(r.prodiRefs as any[], 5) };
        return r;
      });

      return {
        result,
        recommendations: recommendationsWithPaths,
        summary: summary?.content ?? null,
        stats,
        profile,
      };
    }),

    history: protectedProcedure.handler(async ({ context }) => {
      const userId = context.session.user.id;
      const results = await db.query.tmbAssessmentResults.findMany({
        where: eq(tmbAssessmentResults.userId, userId),
        orderBy: desc(tmbAssessmentResults.createdAt),
        limit: 10,
      });
      const recos = await db.query.tmbRecommendations.findMany({
        where: and(
          eq(tmbRecommendations.type, "major"),
          inArray(
            tmbRecommendations.resultId,
            results.map((r) => r.id),
          ),
        ),
      });
      const topMajorMap = new Map<string, string>();
      for (const rec of recos) {
        if (!topMajorMap.has(rec.resultId)) topMajorMap.set(rec.resultId, rec.itemName);
      }
      return Promise.all(
        results.map(async (r) => ({
          id: r.id,
          hollandCode: r.hollandCode,
          confidenceScore: r.confidenceScore,
          createdAt: r.createdAt,
          topMajor: topMajorMap.get(r.id) ?? null,
          source: await resolveResultSource(r.id),
        })),
      );
    }),
  },

  invite: {
    /**
     * Klaim undangan. Mengembalikan objek terstruktur (bukan throw) supaya UI bisa
     * menampilkan tindakan yang tepat: `{ ok:false, error, message }` dengan kode:
     * kode_tidak_valid | kode_sudah_dipakai | email_kosong | email_tidak_terdaftar |
     * sudah_diklaim | sekolah_nonaktif | window_ended.
     */
    claim: protectedProcedure
      .input(z.object({ code: z.string().min(4).trim() }))
      .handler(async ({ input, context }) => {
        const userId = context.session.user.id;
        const code = input.code.toUpperCase();
        const fail = (error: string, message: string) => ({ ok: false as const, error, message });

        // 1) kode akses personal (peserta tanpa email ATAU email tidak dipakai)
        const personal = await db.query.tmbBatchStudents.findFirst({
          where: eq(tmbBatchStudents.claimCode, code),
        });
        if (personal) {
          if (personal.userId && personal.userId !== userId) {
            return fail("kode_sudah_dipakai", "Kode akses ini sudah dipakai akun lain — minta kode baru ke sekolahmu.");
          }
          if (!personal.userId) {
            await db
              .update(tmbBatchStudents)
              .set({ userId, claimCodeUsedAt: new Date() })
              .where(eq(tmbBatchStudents.id, personal.id));
          }
          const pBatch = await db.query.tmbBatches.findFirst({ where: eq(tmbBatches.id, personal.batchId) });
          const pSchool = pBatch
            ? await db.query.tmbSchools.findFirst({ where: eq(tmbSchools.id, pBatch.schoolId) })
            : null;
          await prefillStudentProfileFromBatch(userId, personal.batchId);
          return {
            ok: true as const,
            via: "personal" as const,
            studentName: personal.name,
            schoolName: pSchool?.name ?? pBatch?.name ?? null,
            batchId: personal.batchId,
          };
        }

        // 2) kode undangan kelas + pencocokan email akun
        const batch = await db.query.tmbBatches.findFirst({ where: eq(tmbBatches.inviteCode, code) });
        if (!batch) {
          return fail(
            "kode_tidak_valid",
            "Kode undangan tidak valid — periksa kembali atau minta kode baru ke sekolahmu.",
          );
        }

        // guard: sekolah harus aktif
        const org = batch.schoolId
          ? await db.query.assessmentOrgs.findFirst({ where: eq(assessmentOrgs.schoolId, batch.schoolId) })
          : null;
        if (org && org.status !== "aktif") {
          return fail("sekolah_nonaktif", "Akun sekolahmu belum aktif — hubungi admin MULAI+.");
        }

        const [currentUser] = await db
          .select({ email: userSchema.email })
          .from(userSchema)
          .where(eq(userSchema.id, userId));
        const userEmail = (currentUser?.email ?? "").trim().toLowerCase();
        if (!userEmail) return fail("email_kosong", "Akunmu tidak punya email — hubungi admin MULAI+.");

        // case-insensitive: data lama bisa berisi huruf besar (lihat migrasi 0041)
        const student = await db.query.tmbBatchStudents.findFirst({
          where: and(
            eq(tmbBatchStudents.batchId, batch.id),
            sql`lower(btrim(${tmbBatchStudents.email})) = ${userEmail}`,
          ),
        });
        if (!student) {
          return fail(
            "email_tidak_terdaftar",
            `Email akunmu (${currentUser?.email ?? ""}) belum terdaftar di kelas "${batch.name}". ` +
              "Minta kode akses ke sekolahmu, lalu masukkan kodenya di halaman undangan.",
          );
        }
        if (student.userId && student.userId !== userId) {
          return fail("sudah_diklaim", "Peserta ini sudah diklaim akun lain — hubungi sekolahmu.");
        }

        // guard: jadwal kelas sudah berakhir → tetap boleh klaim (untuk melihat hasil),
        // tapi beri tahu; penolakan mengerjakan tes tetap di `discover.start`.
        const end = batch.windowEnd ? new Date(batch.windowEnd).getTime() : null;
        if (end !== null && Date.now() > end) {
          return fail(
            "window_ended",
            `Jadwal pengerjaan kelas "${batch.name}" sudah berakhir. Hubungi sekolahmu untuk memperpanjang jadwal.`,
          );
        }

        if (!student.userId) {
          await db
            .update(tmbBatchStudents)
            .set({ userId, email: student.email ? student.email.trim().toLowerCase() : null })
            .where(eq(tmbBatchStudents.id, student.id));
        }
        const school = await db.query.tmbSchools.findFirst({ where: eq(tmbSchools.id, batch.schoolId) });
        return {
          ok: true as const,
          via: "batch" as const,
          studentName: student.name,
          schoolName: school?.name ?? batch.name ?? null,
          batchId: batch.id,
        };
      }),
  },

  // ─── Karir Impian: teks bebas → jalur kuliah (prodi & univ) ───
  futureCareer: {
    match: protectedProcedure
      .input(z.object({ careerText: z.string().trim().min(2).max(140) }))
      .handler(async ({ input, context }) => {
        const userId = context.session.user.id;
        const text = input.careerText;

        const [careers, patterns, prodiList] = await Promise.all([
          db.query.tmbCareerMappings.findMany(),
          db.query.tmbMajorPatterns.findMany({ where: eq(tmbMajorPatterns.isActive, true) }),
          getProdiList(),
        ]);

        // 1) cocokkan teks bebas → karier
        const matched = matchCareers(text, careers);
        const top = matched.slice(0, 3);
        const matchedExact = matched[0] != null && matched[0].score >= 2;

        // 2) kelompokkan prodi per kategori — SAMA seperti hasil tes: kolom
        //    `major_category_key` dulu, regex pola hanya untuk prodi yang belum berkategori.
        const byCategory = prodiByCategory(prodiList as any, patterns as any) as Map<string, typeof prodiList>;

        // 3) susun jalur: kategori unik + prodi contoh + karier lain di kategori sama
        const paths: {
          categoryKey: string;
          categoryName: string;
          careerName: string;
          matchScore: number;
          prodis: { prodi: string; level: string | null; university: string; link: string }[];
          otherCareers: string[];
        }[] = [];
        const seen = new Set<string>();
        // Setiap jalur WAJIB punya prodi (tidak ada node/cabang tanpa jurusan).
        const withProdi = top.filter((m) => (byCategory.get(m.categoryKey)?.length ?? 0) > 0);
        const ranked = withProdi.length ? withProdi : top;
        const humanize = (key: string) =>
          key
            .split(/[-_]/g)
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
        for (const m of ranked) {
          if (seen.has(m.categoryKey)) continue;
          seen.add(m.categoryKey);
          const pat = patterns.find((p) => p.categoryKey === m.categoryKey);
          // Prioritaskan kampus favorit + jenjang relevan (S1 → D4 → D3), sama seperti hasil tes.
          const prodis = pickProdiRefs(byCategory.get(m.categoryKey) ?? [], 6);
          paths.push({
            categoryKey: m.categoryKey,
            categoryName: pat?.categoryName ?? humanize(m.categoryKey),
            careerName: m.careerName,
            matchScore: m.score,
            prodis: prodis.map((p) => ({
              prodi: p.name,
              level: p.level,
              university: p.university,
              link: `/explore/universities/${slugify(p.university)}-${p.idSp.substring(0, 6)}/prodi/${encodeURIComponent(p.idSms)}`,
            })),
            otherCareers: careers.filter((c) => c.majorCategory === m.categoryKey).map((c) => c.careerName),
          });
        }

        // 4) fit note: bandingkan jalur dengan profil hasil test (jika sudah ada)
        const result = await db.query.tmbAssessmentResults.findFirst({
          where: eq(tmbAssessmentResults.userId, userId),
          orderBy: desc(tmbAssessmentResults.createdAt),
        });

        let fit: {
          hasResult: boolean;
          score: number | null;
          level: "cocok" | "cukup" | "kurang" | null;
          suggestedMajors: string[];
        } | null = null;
        if (result) {
          const hollandScores = (result.hollandScores ?? {}) as Record<string, number>;
          const ability = (result.abilityScores ?? { levels: {} }) as { levels: Record<string, string> };
          // Skor minat HARUS dinormalisasi ke 0..1. Dulu dipakai angka mentah (mis. 90) sehingga
          // "kecocokan" bisa tampil 5244%. Normalisasi sama seperti di computeRecommendations.
          const rawVals = Object.values(hollandScores)
            .map(Number)
            .filter((v) => Number.isFinite(v));
          const sumV = rawVals.length ? rawVals.reduce((a, b) => a + b, 0) : 0;
          const nH = (k: string) => (sumV > 0 ? (Number(hollandScores[k]) || 0) / sumV : 0);
          let best = 0;
          for (const path of paths) {
            const pat = patterns.find((p) => p.categoryKey === path.categoryKey);
            if (!pat) continue;
            const interest = (nH(pat.hollandPrimary) + nH(pat.hollandSecondary)) / 2;
            const weights = (pat.abilityWeights ?? {}) as Record<string, number>;
            const weightSum = Object.values(weights).reduce((a: number, b: number) => a + b, 0);
            let abilityMatch = 0.6;
            if (weightSum > 0) {
              let acc = 0;
              for (const [dim, w] of Object.entries(weights)) {
                acc += (w ?? 0) * (ABILITY_LEVEL_MAP[ability.levels[dim] ?? "medium"] ?? 0.6);
              }
              abilityMatch = acc / weightSum;
            }
            best = Math.max(best, 0.6 * interest + 0.4 * abilityMatch);
          }
          const score = Math.round(best * 100);
          const recs = await db.query.tmbRecommendations.findMany({
            where: eq(tmbRecommendations.resultId, result.id),
            orderBy: asc(tmbRecommendations.rank),
            limit: 6,
          });
          fit = {
            hasResult: true,
            score,
            level: best >= 0.75 ? "cocok" : best >= 0.55 ? "cukup" : "kurang",
            suggestedMajors: recs
              .filter((r) => r.type === "major")
              .slice(0, 3)
              .map((r) => r.itemName),
          };
        }

        return {
          query: text,
          matched: matchedExact,
          paths,
          fit,
          suggestions: matched.slice(0, 5).map((m) => m.careerName),
        };
      }),
  },

  aiSummary: {
    generate: protectedProcedure.handler(async ({ context }) => {
      const userId = context.session.user.id;
      const result = await db.query.tmbAssessmentResults.findFirst({
        where: eq(tmbAssessmentResults.userId, userId),
        orderBy: desc(tmbAssessmentResults.createdAt),
      });
      if (!result) notFound("Belum ada hasil");

      // cache: kalau sudah pernah generate
      const existing = await db.query.tmbAiSummaries.findFirst({
        where: eq(tmbAiSummaries.resultId, result?.id),
      });
      if (existing) return { summary: existing.content };

      const recommendations = await db.query.tmbRecommendations.findMany({
        where: eq(tmbRecommendations.resultId, result?.id),
        orderBy: asc(tmbRecommendations.rank),
      });

      const profilePayload = {
        holland_code: result?.hollandCode,
        holland_scores: result?.hollandScores,
        ability: result?.abilityScores,
        differentiation: result?.differentiation,
        confidence: result?.confidenceScore,
        top_majors: recommendations.filter((r) => r.type === "major").map((r) => r.itemName),
        top_careers: recommendations.filter((r) => r.type === "career").map((r) => r.itemName),
      };

      const aiUrl = (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");
      const aiKey = process.env.AI_API_KEY || "";

      let summary = "";
      try {
        const res = await fetch(`${aiUrl}/api/tmb/summary`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(aiKey ? { Authorization: `Bearer ${aiKey}` } : {}),
          },
          body: JSON.stringify({ profile: profilePayload }),
        });
        const json = (await res.json()) as { summary?: string };
        summary = json.summary ?? "";
      } catch {
        summary = "";
      }

      if (!summary) {
        // Fallback TANPA AI — grounded di data (bukan cheerleader generik)
        const code = result?.hollandCode ?? "—";
        const RIASEC: Record<string, string> = {
          R: "Realistic (praktis)",
          I: "Investigative (analitis)",
          A: "Artistic (kreatif)",
          S: "Social (sosial)",
          E: "Enterprising (meyakinkan)",
          C: "Conventional (terstruktur)",
        };
        const letters = code.split("").filter((x) => RIASEC[x]);
        const dimsText = letters.length
          ? [...new Set(letters)].map((x) => `${x} (${RIASEC[x] ?? ""})`).join(", ")
          : "—";
        const majors3 = recommendations
          .filter((r) => r.type === "major")
          .slice(0, 3)
          .map((r) => r.itemName)
          .join(", ");
        const diff =
          result?.differentiation === "strong"
            ? "selisih antar-minatmu cukup jelas"
            : result?.differentiation === "moderate"
              ? "selisih antar-minatmu sedang"
              : "selisih antar-minatmu masih kecil (profil belum terlalu menonjol)";
        summary =
          `Kode minat utamamu **${code}** (${dimsText}). ${diff}. ` +
          (majors3 ? `Berdasarkan pilihan minatmu, jurusan yang paling cocok saat ini: ${majors3}. ` : "") +
          "Selesaikan Tes Bakat untuk memperkuat rekomendasi berbasis kemampuan — hasil ini masih gambaran awal dan bukan pengganti pendampingan mentor.";
      }

      await db
        .insert(tmbAiSummaries)
        .values({ id: randomUUID(), resultId: result?.id, content: summary, model: "minimax-m3" });
      return { summary };
    }),
  },
};

// ─── Helpers ─────────────────────────────────────────────

async function awardXp(userId: string, xp: number) {
  // Aturan XP/level/streak dipusatkan di lib/gamification (dipakai juga oleh engine discover).
  await awardProgress(userId, xp);
}

async function computeResult(userId: string, interestAttemptId: string, abilityAttemptId: string) {
  // ambil jawaban interest
  const interestAnswers = await db.query.tmbTestAnswers.findMany({
    where: eq(tmbTestAnswers.attemptId, interestAttemptId),
    with: { question: true },
  });
  const holland = computeHolland(interestAnswers);

  const abilityAnswers = await db.query.tmbTestAnswers.findMany({
    where: eq(tmbTestAnswers.attemptId, abilityAttemptId),
    with: { question: true },
  });
  const ability = computeAbility(abilityAnswers);

  const [prodiList, patterns, careers] = await Promise.all([
    getProdiList(),
    db.query.tmbMajorPatterns.findMany({ where: eq(tmbMajorPatterns.isActive, true) }),
    db.query.tmbCareerMappings.findMany(),
  ]);

  const reco = computeRecommendations(
    holland,
    ability,
    prodiList,
    patterns as {
      categoryKey: string;
      categoryName: string;
      pattern: string;
      hollandPrimary: string;
      hollandSecondary: string;
      abilityWeights: Record<string, number>;
    }[],
    careers,
  );

  const resultId = randomUUID();
  const confidence = reco.majors[0]?.confidence ?? "0";

  await db.transaction(async (tx) => {
    await tx.insert(tmbAssessmentResults).values({
      id: resultId,
      userId,
      attemptInterestId: interestAttemptId,
      attemptAbilityId: abilityAttemptId,
      hollandCode: holland.code,
      hollandScores: holland.scores as any,
      abilityScores: ability as any,
      differentiation: holland.differentiation,
      confidenceScore: confidence,
    });
    for (const m of reco.majors) {
      await tx.insert(tmbRecommendations).values({
        id: randomUUID(),
        resultId,
        type: "major",
        rank: m.rank,
        itemName: m.itemName,
        categoryKey: m.categoryKey,
        confidence: m.confidence,
        prodiRefs: m.prodiRefs as any,
      });
    }
    for (const c of reco.careers) {
      await tx.insert(tmbRecommendations).values({
        id: randomUUID(),
        resultId,
        type: "career",
        rank: c.rank,
        itemName: c.itemName,
        categoryKey: c.categoryKey,
      });
    }
  });

  return resultId;
}

// ─── B2B (School Admin) ─────────────────────────────────

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuote = false;
      } else cur += ch;
    } else if (ch === '"') inQuote = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cur = "";
    } else if (ch !== "\r") cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

/**
 * Baris rekap satu kelas (dipakai admin MULAI+ **dan** portal sekolah).
 * Dipisah supaya kolom rekap konsisten & tidak ada duplikasi logika.
 */
export async function buildBatchRekap(batchId: string) {
  const batch = await db.query.tmbBatches.findFirst({ where: eq(tmbBatches.id, batchId) });
  const students = await db.query.tmbBatchStudents.findMany({
    where: eq(tmbBatchStudents.batchId, batchId),
    orderBy: asc(tmbBatchStudents.name),
  });
  // Ambil hasil & rekomendasi sekali jalan (hindari N+1 saat satu kelas berisi puluhan siswa)
  const resultIds = [...new Set(students.map((s) => s.resultId).filter(Boolean))] as string[];
  const [results, recos] = await Promise.all([
    resultIds.length
      ? db.query.tmbAssessmentResults.findMany({ where: inArray(tmbAssessmentResults.id, resultIds) })
      : [],
    resultIds.length
      ? db.query.tmbRecommendations.findMany({
          where: inArray(tmbRecommendations.resultId, resultIds),
          orderBy: asc(tmbRecommendations.rank),
        })
      : [],
  ]);
  const rById = new Map(results.map((r) => [r.id, r]));
  const recosBy = new Map<string, typeof recos>();
  for (const rc of recos) {
    const arr = recosBy.get(rc.resultId) ?? [];
    arr.push(rc);
    recosBy.set(rc.resultId, arr);
  }

  const rows = students.map((s) => {
    const r = s.resultId ? rById.get(s.resultId) : undefined;
    const ab: any = (r as any)?.abilityScores ?? null;
    // kontrak baru: { levels, scores } · warisan: { verbal: {correct,total} }
    const scores: Record<string, { correct?: number; total?: number }> = ab?.scores ?? ab ?? {};
    const holland: Record<string, number> = ((r as any)?.hollandScores ?? {}) as any;
    const dimStats: any[] = (((r as any)?.dimStats ?? []) as any[]) ?? [];
    const dim = (k: string) => {
      const v = scores[k];
      return v && typeof v.total === "number" ? `${v.correct ?? 0}/${v.total}` : "";
    };
    const topMajors = (recosBy.get(r?.id ?? "") ?? [])
      .filter((x) => x.type === "major")
      .slice(0, 3)
      .map((x) => x.itemName);
    return {
      nama: s.name,
      email: s.email ?? "",
      nis: s.nis ?? "",
      kelas: batch?.className ?? "",
      jurusan: batch?.major ?? "",
      status: s.status,
      hollandCode: r?.hollandCode ?? "",
      R: holland.R ?? "",
      I: holland.I ?? "",
      A: holland.A ?? "",
      S: holland.S ?? "",
      E: holland.E ?? "",
      C: holland.C ?? "",
      verbal: dim("verbal"),
      numerical: dim("numerical"),
      logical: dim("logical"),
      spatial: dim("spatial"),
      clerical: dim("clerical"),
      confidence: r?.confidenceScore ?? "",
      differentiation: r?.differentiation ?? "",
      topMajors: topMajors.join(", "),
      selesai: r?.createdAt ? new Date(r.createdAt).toISOString().slice(0, 16).replace("T", " ") : "",
      durasiDetik: dimStats.reduce((a, d) => a + (Number(d?.seconds) || 0), 0) || "",
      jumlahTimeout: dimStats.filter((d) => d?.timedOut).length,
    };
  });
  return {
    rows,
    batch: batch ? { name: batch.name, className: batch.className, major: batch.major } : null,
  };
}

/**
 * Cakupan data untuk analitik: tes (opsional) → versi → sesi.
 * Semua endpoint analitik memakai helper ini supaya filternya konsisten.
 */
async function analyticsScope(input: {
  code?: string;
  from?: string;
  to?: string;
  batchId?: string;
  schoolId?: string;
}) {
  const assets = input.code
    ? await db.query.assessments.findMany({ where: eq(assessments.code, input.code.toUpperCase()) })
    : await db.query.assessments.findMany({});

  // Kohort (B2B): batasi ke siswa yang terdaftar di batch/sekolah itu.
  let cohortStudentIds: string[] | null = null;
  if (input.batchId || input.schoolId) {
    let batchIds: string[] = [];
    if (input.batchId) batchIds = [input.batchId];
    else if (input.schoolId) {
      const bs = await db.query.tmbBatches.findMany({
        where: eq(tmbBatches.schoolId, input.schoolId),
        columns: { id: true },
      });
      batchIds = bs.map((b) => b.id);
    }
    const roster = batchIds.length
      ? await db.query.tmbBatchStudents.findMany({ where: inArray(tmbBatchStudents.batchId, batchIds) })
      : [];
    cohortStudentIds = roster.map((r) => r.userId ?? `guest-${r.id}`);
  }

  const versions = assets.length
    ? await db.query.assessmentVersions.findMany({
        where: inArray(
          assessmentVersions.assessmentId,
          assets.map((a) => a.id),
        ),
      })
    : [];
  const versionIds = versions.map((v) => v.id);
  const fromD = input.from ? new Date(input.from) : null;
  const toD = input.to ? new Date(input.to) : null;
  const range =
    fromD || toD
      ? and(
          fromD ? gte(assessmentSessions.startedAt, fromD) : undefined,
          toD ? lte(assessmentSessions.startedAt, toD) : undefined,
        )
      : undefined;

  const sessions =
    versionIds.length && (!cohortStudentIds || cohortStudentIds.length)
      ? await db.query.assessmentSessions.findMany({
          where: and(
            inArray(assessmentSessions.versionId, versionIds),
            cohortStudentIds ? inArray(assessmentSessions.studentId, cohortStudentIds) : undefined,
            range,
          ),
          orderBy: [desc(assessmentSessions.startedAt)],
          limit: 20000,
        })
      : [];

  return { assets, versions, versionIds, sessions, cohortStudentIds };
}

export const tmbAdminRouter = {
  schools: {
    list: adminProcedure.handler(async () => {
      // GROUP BY di DB (bukan muat semua batch+siswa ke JS)
      const schools = await db.query.tmbSchools.findMany({ orderBy: desc(tmbSchools.createdAt) });
      const [batchCounts, studentCounts] = await Promise.all([
        db
          .select({ schoolId: tmbBatches.schoolId, n: count() })
          .from(tmbBatches)
          .where(isNotNull(tmbBatches.schoolId))
          .groupBy(tmbBatches.schoolId),
        db
          .select({ schoolId: tmbBatches.schoolId, n: count() })
          .from(tmbBatchStudents)
          .innerJoin(tmbBatches, eq(tmbBatchStudents.batchId, tmbBatches.id))
          .where(isNotNull(tmbBatches.schoolId))
          .groupBy(tmbBatches.schoolId),
      ]);
      const batchMap = new Map(batchCounts.map((r) => [r.schoolId, r.n]));
      const studentMap = new Map(studentCounts.map((r) => [r.schoolId, r.n]));
      return schools.map((s) => ({
        ...s,
        batchCount: batchMap.get(s.id) ?? 0,
        studentCount: studentMap.get(s.id) ?? 0,
      }));
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          address: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          city: z.string().optional(),
          status: z.enum(["prospek", "aktif", "selesai"]).default("prospek"),
          notes: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();
        await db.insert(tmbSchools).values({ id, ...input });
        return { id };
      }),

    get: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const school = await db.query.tmbSchools.findFirst({ where: eq(tmbSchools.id, input.id) });
      if (!school) notFound("Sekolah tidak ditemukan");
      const batches = await db.query.tmbBatches.findMany({
        where: eq(tmbBatches.schoolId, input.id),
        orderBy: desc(tmbBatches.createdAt),
      });
      const students = await db.query.tmbBatchStudents.findMany({
        where: inArray(
          tmbBatchStudents.batchId,
          batches.map((b) => b.id),
        ),
      });
      return {
        school,
        batches,
        stats: { total: students.length, completed: students.filter((s) => s.status === "completed").length },
      };
    }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          city: z.string().optional(),
          status: z.enum(["prospek", "aktif", "selesai"]).optional(),
          notes: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...rest } = input;
        await db.update(tmbSchools).set(rest).where(eq(tmbSchools.id, id));
        return { success: true };
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(tmbSchools).where(eq(tmbSchools.id, input.id));
      return { success: true };
    }),
  },

  overview: adminProcedure.handler(async () => {
    const [schools, batches, students, results, qInterest, qAbility, patterns, careers, stats] = await Promise.all([
      db.query.tmbSchools.findMany({ columns: { id: true, status: true } }),
      db.query.tmbBatches.findMany({ columns: { id: true } }),
      db.query.tmbBatchStudents.findMany({ columns: { id: true, status: true } }),
      db.query.tmbAssessmentResults.findMany({ columns: { id: true } }),
      db.query.tmbQuestionBank.findMany({
        where: and(eq(tmbQuestionBank.testCode, "interest"), eq(tmbQuestionBank.isActive, true)),
        columns: { id: true },
      }),
      db.query.tmbQuestionBank.findMany({
        where: and(eq(tmbQuestionBank.testCode, "ability"), eq(tmbQuestionBank.isActive, true)),
        columns: { id: true },
      }),
      db.query.tmbMajorPatterns.findMany({ columns: { id: true, isActive: true } }),
      db.query.tmbCareerMappings.findMany({ columns: { id: true } }),
      db.query.tmbUserStats.findMany({ columns: { testsCompleted: true } }),
    ]);

    return {
      b2b: {
        schools: schools.length,
        activeSchools: schools.filter((s) => s.status === "aktif").length,
        batches: batches.length,
        students: students.length,
        completedStudents: students.filter((s) => s.status === "completed").length,
      },
      b2c: {
        results: results.length,
        testsCompleted: stats.reduce((a: number, s) => a + (s.testsCompleted ?? 0), 0),
      },
      content: {
        interestQuestions: qInterest.length,
        abilityQuestions: qAbility.length,
        patterns: patterns.filter((p) => p.isActive).length,
        careers: careers.length,
      },
    };
  }),

  batches: {
    list: adminProcedure.handler(async () => {
      const batches = await db.query.tmbBatches.findMany({ orderBy: desc(tmbBatches.createdAt) });
      const schools = await db.query.tmbSchools.findMany();
      const students = await db.query.tmbBatchStudents.findMany();
      const schoolMap = new Map(schools.map((s) => [s.id, s]));
      return batches.map((b) => ({
        ...b,
        school: schoolMap.get(b.schoolId) ?? null,
        studentCount: students.filter((s) => s.batchId === b.id).length,
      }));
    }),

    create: adminProcedure
      .input(
        z.object({
          schoolId: z.string().min(1),
          name: z.string().min(1),
          className: z.string().optional(),
          major: z.string().optional(),
          graduationYear: z.number().int().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const school = await db.query.tmbSchools.findFirst({ where: eq(tmbSchools.id, input.schoolId) });
        if (!school) notFound("Sekolah tidak ditemukan");
        const id = randomUUID();
        await db.insert(tmbBatches).values({
          id,
          schoolId: input.schoolId,
          name: input.name,
          className: input.className,
          major: input.major,
          graduationYear: input.graduationYear,
          inviteCode: generateClaimCode(),
        });
        return { id };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          className: z.string().optional(),
          major: z.string().optional(),
          graduationYear: z.number().int().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...rest } = input;
        await db.update(tmbBatches).set(rest).where(eq(tmbBatches.id, id));
        return { success: true };
      }),

    regenerateCode: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.update(tmbBatches).set({ inviteCode: generateClaimCode() }).where(eq(tmbBatches.id, input.id));
      return { success: true };
    }),

    get: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const batch = await db.query.tmbBatches.findFirst({ where: eq(tmbBatches.id, input.id) });
      if (!batch) notFound("Batch tidak ditemukan");
      const school = await db.query.tmbSchools.findFirst({ where: eq(tmbSchools.id, batch.schoolId) });
      const students = await db.query.tmbBatchStudents.findMany({
        where: eq(tmbBatchStudents.batchId, input.id),
        orderBy: asc(tmbBatchStudents.createdAt),
      });
      return { batch, school, students };
    }),

    delete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(tmbBatches).where(eq(tmbBatches.id, input.id));
      return { success: true };
    }),
  },

  students: {
    add: adminProcedure
      .input(
        z.object({
          batchId: z.string(),
          name: z.string().min(1),
          email: z.string().email().optional().or(z.literal("")),
          nis: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const id = randomUUID();
        await db.insert(tmbBatchStudents).values({
          id,
          batchId: input.batchId,
          name: input.name.trim(),
          email: input.email ? input.email.trim().toLowerCase() : null,
          nis: input.nis?.trim() || null,
        });
        return { id };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          email: z.string().email().optional().or(z.literal("")),
          nis: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...rest } = input;
        const patch: Record<string, unknown> = { ...rest };
        if ("email" in patch) patch.email = (patch.email as string) || null;
        await db.update(tmbBatchStudents).set(patch).where(eq(tmbBatchStudents.id, id));
        return { success: true };
      }),

    remove: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(tmbBatchStudents).where(eq(tmbBatchStudents.id, input.id));
      return { success: true };
    }),

    detail: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const student = await db.query.tmbBatchStudents.findFirst({ where: eq(tmbBatchStudents.id, input.id) });
      if (!student) notFound("Siswa tidak ditemukan");
      let result = null;
      if (student.resultId) {
        const resultId = student.resultId;
        const [r, recommendations, summary] = await Promise.all([
          db.query.tmbAssessmentResults.findFirst({ where: eq(tmbAssessmentResults.id, resultId) }),
          db.query.tmbRecommendations.findMany({
            where: eq(tmbRecommendations.resultId, resultId),
            orderBy: asc(tmbRecommendations.rank),
          }),
          db.query.tmbAiSummaries.findFirst({ where: eq(tmbAiSummaries.resultId, resultId) }),
        ]);
        result = { result: r, recommendations, summary: summary?.content ?? null };
      }
      return { student, result };
    }),

    import: adminProcedure
      .input(
        z.object({
          batchId: z.string(),
          csv: z.string(),
        }),
      )
      .handler(async ({ input }) => {
        const rows = parseCsv(input.csv);
        if (rows.length < 2) preconditionFailed("CSV kosong atau tidak valid — butuh header + minimal 1 baris");

        // header: nama | email | nis
        const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
        const idxName = header.findIndex((h) => h.includes("nama") || h === "name");
        const idxEmail = header.findIndex((h) => h.includes("email"));
        const idxNis = header.findIndex((h) => h === "nis" || h.includes("nis"));
        if (idxName < 0) preconditionFailed("CSV harus punya kolom 'nama'");

        const values = rows.slice(1).map((r) => ({
          id: randomUUID(),
          batchId: input.batchId,
          name: (r[idxName] ?? "").trim(),
          email: idxEmail >= 0 ? (r[idxEmail] ?? "").trim().toLowerCase() || null : null,
          nis: idxNis >= 0 ? (r[idxNis] ?? "").trim() || null : null,
        }));
        const valid = values.filter((v) => v.name);
        if (valid.length === 0) preconditionFailed("Tidak ada data valid");

        await db.insert(tmbBatchStudents).values(valid);
        return { imported: valid.length, totalRows: rows.length - 1 };
      }),

    sendInviteEmails: adminProcedure.input(z.object({ batchId: z.string() })).handler(async ({ input }) => {
      const batch = await db.query.tmbBatches.findFirst({ where: eq(tmbBatches.id, input.batchId) });
      if (!batch) notFound("Batch tidak ditemukan");
      if (!batch.inviteCode) preconditionFailed("Batch belum punya kode undangan");

      const base = webBaseUrl();
      const link = `${base}/assessment/invite/${batch.inviteCode}`;
      const school = await db.query.tmbSchools.findFirst({ where: eq(tmbSchools.id, batch.schoolId) });
      const schoolName = school?.name ?? batch.name;

      const students = await db.query.tmbBatchStudents.findMany({
        where: and(eq(tmbBatchStudents.batchId, input.batchId), isNotNull(tmbBatchStudents.email)),
      });

      let sent = 0;
      const failed: string[] = [];
      for (const s of students) {
        if (!s.email) {
          failed.push(s.name);
          continue;
        }
        try {
          await mail.send({
            to: s.email,
            subject: `Undangan Test Minat Bakat by MULAI+ — ${schoolName} 🧭`,
            html: inviteEmailHtml(s.name, link, schoolName),
          });
          sent++;
        } catch {
          failed.push(s.name);
        }
      }
      return { sent, failed, code: batch.inviteCode, link };
    }),

    exportRekap: adminProcedure
      .input(z.object({ batchId: z.string() }))
      .handler(async ({ input }) => buildBatchRekap(input.batchId)),

    /**
     * Perbaiki tautan hasil → roster (data lama) & status yang tidak konsisten.
     *
     * Dipakai untuk siswa yang sudah mengerjakan tes SEBELUM mengklaim undangan (sehingga
     * tautan di `finish` tidak pernah terjadi), atau roster warisan berstatus "completed"
     * padahal hasilnya belum tertaut. Hasil yang dipakai = hasil TERBARU siswa.
     */
    backfillRosterLinks: adminProcedure
      .input(z.object({ batchId: z.string().optional() }).optional())
      .handler(async ({ input }) => {
        const rows = await db.query.tmbBatchStudents.findMany({
          where: input?.batchId ? eq(tmbBatchStudents.batchId, input.batchId) : undefined,
          orderBy: asc(tmbBatchStudents.createdAt),
        });
        const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as string[];
        const results = userIds.length
          ? await db.query.tmbAssessmentResults.findMany({
              where: inArray(tmbAssessmentResults.userId, userIds),
              orderBy: desc(tmbAssessmentResults.createdAt),
            })
          : [];
        const latest = new Map<string, string>();
        for (const r of results) if (!latest.has(r.userId)) latest.set(r.userId, r.id);

        let ditautkan = 0;
        let direset = 0;
        let sudahBenar = 0;
        let tanpaAkun = 0;
        for (const row of rows) {
          if (!row.userId) {
            tanpaAkun++;
            continue;
          }
          const rid = latest.get(row.userId) ?? null;
          if (rid) {
            if (row.resultId === rid && row.status === "completed") {
              sudahBenar++;
              continue;
            }
            await db
              .update(tmbBatchStudents)
              .set({ resultId: rid, status: "completed" })
              .where(eq(tmbBatchStudents.id, row.id));
            ditautkan++;
          } else if (row.status === "completed") {
            // "completed" tanpa hasil sama sekali = data tidak konsisten → kembalikan ke undangan
            await db.update(tmbBatchStudents).set({ status: "invited" }).where(eq(tmbBatchStudents.id, row.id));
            direset++;
          } else {
            sudahBenar++;
          }
        }
        return {
          diperiksa: rows.length,
          ditautkan,
          direset,
          sudahBenar,
          tanpaAkun,
          siswaDenganHasil: latest.size,
        };
      }),
  },

  // ─── Konten Test: soal, pola jurusan, mapping karier, catalog ───
  questions: {
    list: adminProcedure
      .input(z.object({ testCode: z.enum(["interest", "ability"]).optional() }))
      .handler(async ({ input }) => {
        const where = input.testCode ? eq(tmbQuestionBank.testCode, input.testCode) : undefined;
        const rows = await db.query.tmbQuestionBank.findMany({
          where,
          orderBy: asc(tmbQuestionBank.order),
        });
        return { items: rows, total: rows.length };
      }),

    create: adminProcedure
      .input(
        z.object({
          testCode: z.enum(["interest", "ability"]),
          dimension: z.string().min(1),
          pairDimension: z.string().optional().nullable(),
          text: z.string().min(3),
          optionA: z.string().min(1),
          optionB: z.string().min(1),
          optionC: z.string().optional().nullable(),
          optionD: z.string().optional().nullable(),
          answer: z.string().optional().nullable(),
        }),
      )
      .handler(async ({ input }) => {
        // validasi ability: jawaban wajib & harus salah satu opsi
        if (input.testCode === "ability") {
          const opts = [input.optionA, input.optionB, input.optionC, input.optionD].filter(Boolean);
          if (!input.answer) preconditionFailed("Soal kemampuan harus punya kunci jawaban");
          if (!opts.includes(input.answer)) preconditionFailed("Kunci jawaban harus salah satu opsi");
        }
        const maxOrder = await db
          .select({ m: max(tmbQuestionBank.order) })
          .from(tmbQuestionBank)
          .where(eq(tmbQuestionBank.testCode, input.testCode));
        const id = randomUUID();
        await db.insert(tmbQuestionBank).values({
          id,
          testCode: input.testCode,
          dimension: input.dimension,
          pairDimension: input.pairDimension ?? null,
          text: input.text,
          optionA: input.optionA,
          optionB: input.optionB,
          optionC: input.optionC ?? null,
          optionD: input.optionD ?? null,
          answer: input.answer ?? null,
          order: (maxOrder[0]?.m ?? 0) + 1,
          isActive: true,
        });
        await syncCatalogTotal(input.testCode);
        return { id };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          dimension: z.string().min(1).optional(),
          pairDimension: z.string().optional().nullable(),
          text: z.string().min(3).optional(),
          optionA: z.string().min(1).optional(),
          optionB: z.string().min(1).optional(),
          optionC: z.string().optional().nullable(),
          optionD: z.string().optional().nullable(),
          answer: z.string().optional().nullable(),
          isActive: z.boolean().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const question = await db.query.tmbQuestionBank.findFirst({ where: eq(tmbQuestionBank.id, input.id) });
        if (!question) notFound("Soal tidak ditemukan");
        const { id, ...rest } = input;
        if (question.testCode === "ability" && "answer" in rest && !rest.answer) {
          preconditionFailed("Soal kemampuan harus punya kunci jawaban");
        }
        await db.update(tmbQuestionBank).set(rest).where(eq(tmbQuestionBank.id, id));
        return { success: true };
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const question = await db.query.tmbQuestionBank.findFirst({ where: eq(tmbQuestionBank.id, input.id) });
      if (!question) notFound("Soal tidak ditemukan");
      await db.delete(tmbQuestionBank).where(eq(tmbQuestionBank.id, input.id));
      await syncCatalogTotal(question.testCode);
      return { success: true };
    }),

    toggle: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const question = await db.query.tmbQuestionBank.findFirst({ where: eq(tmbQuestionBank.id, input.id) });
      if (!question) notFound("Soal tidak ditemukan");
      await db.update(tmbQuestionBank).set({ isActive: !question.isActive }).where(eq(tmbQuestionBank.id, input.id));
      return { success: true, isActive: !question.isActive };
    }),

    reorder: adminProcedure
      .input(z.object({ testCode: z.enum(["interest", "ability"]), ids: z.array(z.string()).min(1) }))
      .handler(async ({ input }) => {
        for (const [i, id] of input.ids.entries()) {
          await db
            .update(tmbQuestionBank)
            .set({ order: i + 1 })
            .where(and(eq(tmbQuestionBank.id, id), eq(tmbQuestionBank.testCode, input.testCode)));
        }
        return { success: true };
      }),
  },

  patterns: {
    list: adminProcedure.handler(async () => {
      const rows = await db.query.tmbMajorPatterns.findMany({
        orderBy: asc(tmbMajorPatterns.categoryName),
      });
      const prodiList = await getProdiList();
      return {
        items: rows.map((p) => {
          let count = 0;
          try {
            const re = new RegExp(p.pattern, "i");
            count = prodiList.filter((x) => re.test(x.name)).length;
          } catch {
            count = -1;
          }
          return { ...p, prodiCount: count };
        }),
      };
    }),

    create: adminProcedure
      .input(
        z.object({
          categoryKey: z.string().min(2),
          categoryName: z.string().min(2),
          pattern: z.string().min(2),
          hollandPrimary: z.string().length(1),
          hollandSecondary: z.string().length(1),
          abilityWeights: z.record(z.string(), z.number().min(0).max(1)),
        }),
      )
      .handler(async ({ input }) => {
        const exists = await db.query.tmbMajorPatterns.findFirst({
          where: eq(tmbMajorPatterns.categoryKey, input.categoryKey),
        });
        if (exists) preconditionFailed(`Kategori "${input.categoryKey}" sudah ada`);
        validatePatternRegex(input.pattern);
        await db.insert(tmbMajorPatterns).values({ id: randomUUID(), isActive: true, ...input });
        return { success: true };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          categoryKey: z.string().min(2).optional(),
          categoryName: z.string().min(2).optional(),
          pattern: z.string().min(2).optional(),
          hollandPrimary: z.string().length(1).optional(),
          hollandSecondary: z.string().length(1).optional(),
          abilityWeights: z.record(z.string(), z.number().min(0).max(1)).optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...rest } = input;
        if (rest.pattern) validatePatternRegex(rest.pattern);
        if (rest.categoryKey) {
          const exists = await db.query.tmbMajorPatterns.findFirst({
            where: and(eq(tmbMajorPatterns.categoryKey, rest.categoryKey), ne(tmbMajorPatterns.id, id)),
          });
          if (exists) preconditionFailed(`Kategori "${rest.categoryKey}" sudah ada`);
        }
        await db.update(tmbMajorPatterns).set(rest).where(eq(tmbMajorPatterns.id, id));
        return { success: true };
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(tmbMajorPatterns).where(eq(tmbMajorPatterns.id, input.id));
      return { success: true };
    }),

    preview: adminProcedure
      .input(z.object({ pattern: z.string().min(2), limit: z.number().int().min(1).max(20).optional() }))
      .handler(async ({ input }) => {
        validatePatternRegex(input.pattern);
        const prodiList = await getProdiList();
        const re = new RegExp(input.pattern, "i");
        const matched = prodiList.filter((x) => re.test(x.name));
        return { count: matched.length, examples: matched.slice(0, input.limit ?? 5) };
      }),
  },

  careers: {
    list: adminProcedure.handler(async () => {
      const rows = await db.query.tmbCareerMappings.findMany({
        orderBy: asc(tmbCareerMappings.careerName),
      });
      return { items: rows };
    }),

    create: adminProcedure
      .input(z.object({ majorCategory: z.string().min(2), careerName: z.string().min(2) }))
      .handler(async ({ input }) => {
        const exists = await db.query.tmbCareerMappings.findFirst({
          where: and(
            eq(tmbCareerMappings.careerName, input.careerName),
            eq(tmbCareerMappings.majorCategory, input.majorCategory),
          ),
        });
        if (exists) preconditionFailed("Karier ini sudah terdaftar di kategori tersebut");
        await db
          .insert(tmbCareerMappings)
          .values({ id: randomUUID(), careerName: input.careerName, majorCategory: input.majorCategory });
        return { success: true };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          majorCategory: z.string().min(2).optional(),
          careerName: z.string().min(2).optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { id, ...rest } = input;
        await db.update(tmbCareerMappings).set(rest).where(eq(tmbCareerMappings.id, id));
        return { success: true };
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(tmbCareerMappings).where(eq(tmbCareerMappings.id, input.id));
      return { success: true };
    }),
  },

  catalog: {
    update: adminProcedure
      .input(
        z.object({
          code: z.enum(["interest", "ability"]),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          xpReward: z.number().int().min(0).optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { code, ...rest } = input;
        await db.update(tmbTestCatalog).set(rest).where(eq(tmbTestCatalog.code, code));
        return { success: true };
      }),
  },

  /** Analitik assessment — batch (B2B) + lintas-tes (B2C). */
  analytics: {
    /** Analitik satu batch/kelas (dipakai halaman batch admin). */
    batch: adminProcedure.input(z.object({ batchId: z.string() })).handler(async ({ input }) => {
      const students = await db.query.tmbBatchStudents.findMany({ where: eq(tmbBatchStudents.batchId, input.batchId) });
      const total = students.length;
      const completed = students.filter((s) => s.status === "completed").length;
      const inProgress = students.filter((s) => s.status === "in_progress").length;
      const invited = students.filter((s) => s.status === "invited").length;

      // 2 query total (bukan 2×N seperti versi lama) — aman untuk batas subrequest Worker.
      const resultIds = [...new Set(students.map((s) => s.resultId).filter(Boolean))] as string[];
      const [results, recos] = await Promise.all([
        resultIds.length
          ? db.query.tmbAssessmentResults.findMany({ where: inArray(tmbAssessmentResults.id, resultIds) })
          : Promise.resolve([]),
        resultIds.length
          ? db.query.tmbRecommendations.findMany({ where: inArray(tmbRecommendations.resultId, resultIds) })
          : Promise.resolve([]),
      ]);

      const hollandCount: Record<string, number> = {};
      const abilityAvg: Record<string, { sum: number; n: number }> = {};
      const topMajorCount: Record<string, number> = {};
      const confident: number[] = [];

      for (const r of results) {
        if (r.hollandCode) {
          const primary = r.hollandCode.charAt(0);
          hollandCount[primary] = (hollandCount[primary] ?? 0) + 1;
        }
        const ability = (r.abilityScores as any)?.scores ?? {};
        for (const [dim, v] of Object.entries(ability as Record<string, { correct: number; total: number }>)) {
          if (v.total > 0) {
            abilityAvg[dim] = abilityAvg[dim] ?? { sum: 0, n: 0 };
            abilityAvg[dim].sum += v.correct / v.total;
            abilityAvg[dim].n += 1;
          }
        }
        const c = Number(r.confidenceScore);
        if (Number.isFinite(c) && c > 0) confident.push(c);
      }
      for (const rc of recos) {
        if (rc.type !== "major" || (rc.rank ?? 99) > 3) continue;
        topMajorCount[rc.itemName] = (topMajorCount[rc.itemName] ?? 0) + 1;
      }

      const topMajors = Object.entries(topMajorCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
      const hollandDistribution = Object.entries(hollandCount)
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count);
      const abilityAvgClean = Object.entries(abilityAvg).map(([dim, v]) => ({
        dim,
        avg: Math.round((v.sum / v.n) * 100),
      }));

      return {
        total,
        completed,
        inProgress,
        invited,
        hollandDistribution,
        abilityAvg: abilityAvgClean,
        topMajors,
        avgConfidence: avgOf(confident),
      };
    }),

    /** Ringkasan lintas tes (B2C) + kesehatan data + daftar perlu perhatian. */
    overview: adminProcedure
      .input(
        z.object({
          code: z.string().trim().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
          batchId: z.string().optional(),
          schoolId: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const scope = await analyticsScope(input);
        const sessionIds = scope.sessions.map((s) => s.id);
        const results = sessionIds.length
          ? await db.query.assessmentResults.findMany({ where: inArray(assessmentResults.sessionId, sessionIds) })
          : [];
        const tmb = await db.query.tmbAssessmentResults.findMany({});

        const answerRows = sessionIds.length
          ? await db.query.assessmentAnswers.findMany({
              where: inArray(assessmentAnswers.sessionId, sessionIds),
              columns: { sessionId: true },
            })
          : [];
        const answersBySession = new Set(answerRows.map((a) => a.sessionId));

        const bySession = new Map(results.map((r) => [r.sessionId, r]));
        const confidence = scope.sessions.map((s) => {
          const r = bySession.get(s.id);
          const recos = (r?.recommendationsJson ?? []) as any[];
          const top = Number(recos?.[0]?.confidence);
          return Number.isFinite(top) ? top : null;
        });

        const completed = scope.sessions.filter((x) => x.status === "completed").length;
        const totalTmb = tmb.length;
        const tmbWithConfidence = tmb.filter((r) => Number(r.confidenceScore) > 0).length;

        return {
          tests: scope.assets.map((a) => ({ code: a.code, name: a.name, family: a.family })),
          versions: scope.versions.length,
          sessions: {
            total: scope.sessions.length,
            completed,
            inProgress: scope.sessions.filter((x) => x.status === "in_progress").length,
            paused: scope.sessions.filter((x) => x.status === "paused").length,
            timeout: scope.sessions.filter((x) => x.status === "timeout").length,
            abandoned: scope.sessions.filter((x) => x.status === "abandoned").length,
            completionRate: scope.sessions.length ? Math.round((completed / scope.sessions.length) * 1000) / 1000 : 0,
            uniqueUsers: new Set(scope.sessions.map((s) => s.studentId)).size,
          },
          confidence: {
            avg: avgOf(confidence),
            n: confidence.filter((c) => c !== null).length,
          },
          retest: (() => {
            const perUser = new Map<string, number>();
            for (const s of scope.sessions) perUser.set(s.studentId, (perUser.get(s.studentId) ?? 0) + 1);
            const repeat = [...perUser.values()].filter((n) => n > 1).length;
            return {
              users: perUser.size,
              repeated: repeat,
              repeatRate: perUser.size ? Math.round((repeat / perUser.size) * 1000) / 1000 : 0,
            };
          })(),
          health: {
            resultRows: totalTmb,
            resultRowsWithConfidence: tmbWithConfidence,
            resultRowsWithoutConfidence: totalTmb - tmbWithConfidence,
            // sesi yang selesai tapi tidak menyimpan satu jawaban pun (data race/batal di tengah)
            sessionsWithoutAnswers: scope.sessions.filter(
              (s) => (s.status === "completed" || s.status === "timeout") && !answersBySession.has(s.id),
            ).length,
            resultRowsWithoutSession: Math.max(0, totalTmb - scope.sessions.length),
          },
        };
      }),

    /**
     * Ringkasan KOHORT (B2B): satu kelas (batchId) atau satu sekolah (schoolId).
     * Dipakai halaman sekolah admin & panel analitik kelas — menggabungkan
     * kelengkapan, sebaran minat/kemampuan, rekomendasi, perhatian, funnel, dan versi.
     */
    cohort: adminProcedure
      .input(
        z.object({
          batchId: z.string().optional(),
          schoolId: z.string().optional(),
          code: z.string().trim().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        if (!input.batchId && !input.schoolId) preconditionFailed("batchId atau schoolId wajib diisi");

        let students: (typeof tmbBatchStudents.$inferSelect)[] = [];
        let batchList: (typeof tmbBatches.$inferSelect)[] = [];
        if (input.batchId) {
          students = await db.query.tmbBatchStudents.findMany({ where: eq(tmbBatchStudents.batchId, input.batchId) });
          batchList = await db.query.tmbBatches.findMany({ where: eq(tmbBatches.id, input.batchId) });
        } else if (input.schoolId) {
          batchList = await db.query.tmbBatches.findMany({ where: eq(tmbBatches.schoolId, input.schoolId) });
          students = batchList.length
            ? await db.query.tmbBatchStudents.findMany({
                where: inArray(
                  tmbBatchStudents.batchId,
                  batchList.map((b) => b.id),
                ),
              })
            : [];
        }

        const resultIds = [...new Set(students.map((s) => s.resultId).filter(Boolean))] as string[];
        const [results, recos] = await Promise.all([
          resultIds.length
            ? db.query.tmbAssessmentResults.findMany({ where: inArray(tmbAssessmentResults.id, resultIds) })
            : Promise.resolve([]),
          resultIds.length
            ? db.query.tmbRecommendations.findMany({ where: inArray(tmbRecommendations.resultId, resultIds) })
            : Promise.resolve([]),
        ]);

        const stats = computeCohortStats({
          students: students.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            resultId: s.resultId,
            batchId: s.batchId,
          })),
          results: results.map((r) => ({
            id: r.id,
            hollandCode: r.hollandCode,
            hollandScores: (r.hollandScores ?? {}) as Record<string, unknown>,
            abilityScores: r.abilityScores,
            confidenceScore: r.confidenceScore,
            differentiation: r.differentiation,
            createdAt: r.createdAt,
          })),
          recos: recos.map((r) => ({
            resultId: r.resultId,
            type: r.type,
            rank: r.rank,
            itemName: r.itemName,
          })),
        });

        // funnel & versi untuk kohort yang sama (sesi milik siswa kohort)
        const scope = await analyticsScope({
          code: input.code,
          from: input.from,
          to: input.to,
          batchId: input.batchId,
          schoolId: input.schoolId,
        });
        const sessionIds = scope.sessions.map((x) => x.id);
        const answers = sessionIds.length
          ? await db.query.assessmentAnswers.findMany({
              where: inArray(assessmentAnswers.sessionId, sessionIds),
            })
          : [];
        const questionsForFunnel = scope.versionIds.length
          ? await db.query.questions.findMany({ where: inArray(questions.versionId, scope.versionIds) })
          : [];
        const dims = scope.versionIds.length
          ? await db.query.assessmentDimensions.findMany({
              where: inArray(assessmentDimensions.versionId, scope.versionIds),
            })
          : [];
        const funnel = computeFunnel(
          scope.sessions,
          answers.map((a) => ({ sessionId: a.sessionId, questionId: a.questionId, scoreEarned: a.scoreEarned })),
          questionsForFunnel.map((q) => ({
            id: q.id,
            versionId: q.versionId,
            order: q.displayOrder,
            text: q.questionText,
            type: q.questionType,
            dimensionId: q.dimensionId,
          })),
        );
        const dimMap = new Map(dims.map((d) => [d.id, d]));

        return {
          ...stats,
          funnel: {
            ...funnel,
            completionRatePct: Math.round(funnel.completionRate * 1000) / 10,
            perDimension: funnel.perDimension.map((d) => ({
              ...d,
              code: dimMap.get(d.dimensionId)?.code ?? "",
              name: dimMap.get(d.dimensionId)?.name ?? "",
              dropRatePct: Math.round(d.dropRate * 1000) / 10,
            })),
          },
          batches: batchList.map((b) => {
            const rows = students.filter((s) => s.batchId === b.id);
            const done = rows.filter((s) => s.status === "completed").length;
            return {
              id: b.id,
              name: b.name,
              className: b.className,
              major: b.major,
              graduationYear: b.graduationYear,
              inviteCode: b.inviteCode,
              total: rows.length,
              completed: done,
              completionRatePct: rows.length ? Math.round((done / rows.length) * 1000) / 10 : 0,
            };
          }),
          sessionsInScope: scope.sessions.length,
        };
      }),

    /** Statistik per butir soal: kesulitan, daya beda, distractor, skip. */
    items: adminProcedure
      .input(
        z.object({
          code: z.string().trim().optional(),
          versionId: z.string().trim().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
          batchId: z.string().optional(),
          schoolId: z.string().optional(),
          minAnswers: z.number().int().min(0).default(1),
        }),
      )
      .handler(async ({ input }) => {
        const scope = await analyticsScope(input);
        const versionIds = input.versionId ? [input.versionId] : scope.versionIds;
        if (!versionIds.length)
          return {
            items: [],
            dimensions: [],
            questionCount: 0,
            summary: { items: 0, flagged: 0, avgP: null as number | null, avgDiscrimination: 0 },
          };

        const finished = scope.sessions.filter(
          (s) => (s.status === "completed" || s.status === "timeout") && versionIds.includes(s.versionId),
        );
        // hanya soal AKTIF: soal nonaktif tidak pernah dilihat siswa →
        // kalau ikut dihitung, semua tampak "banyak dilewati" (bug lama).
        const qs = await db.query.questions.findMany({
          where: and(inArray(questions.versionId, versionIds), eq(questions.isActive, true)),
          orderBy: [asc(questions.displayOrder)],
        });
        const qIds = qs.map((q) => q.id);
        const [opts, ans, dims] = await Promise.all([
          qIds.length
            ? db.query.questionOptions.findMany({ where: inArray(questionOptions.questionId, qIds) })
            : Promise.resolve([]),
          finished.length
            ? db.query.assessmentAnswers.findMany({
                where: inArray(
                  assessmentAnswers.sessionId,
                  finished.map((s) => s.id),
                ),
              })
            : Promise.resolve([]),
          db.query.assessmentDimensions.findMany({ where: inArray(assessmentDimensions.versionId, versionIds) }),
        ]);

        const stats = computeItemStats({
          questions: qs.map((q) => ({
            id: q.id,
            versionId: q.versionId,
            order: q.displayOrder,
            code: q.questionCode,
            text: q.questionText,
            type: q.questionType,
            dimensionId: q.dimensionId,
          })),
          options: opts.map((o) => ({
            id: o.id,
            questionId: o.questionId,
            value: o.optionValue,
            label: o.label,
            score: o.score,
          })),
          answers: ans.map((a) => ({
            sessionId: a.sessionId,
            questionId: a.questionId,
            selectedOptionId: a.selectedOptionId,
            textAnswer: a.textAnswer,
            scoreEarned: a.scoreEarned,
          })),
          sessions: finished.map((x) => ({ ...x, versionId: x.versionId })),
          versionId: input.versionId,
        }).filter((s) => s.answered >= input.minAnswers);

        const verById = new Map(scope.versions.map((v) => [v.id, v]));
        const testByVersion = new Map<string, string>();
        for (const v of scope.versions) {
          const a = scope.assets.find((x) => x.id === v.assessmentId);
          testByVersion.set(v.id, a?.code ?? "");
        }
        const ordered = [...stats].sort(
          (a, b) =>
            b.flags.length - a.flags.length ||
            (verById.get(a.versionId)?.versionNumber ?? 0) - (verById.get(b.versionId)?.versionNumber ?? 0) ||
            a.order - b.order,
        );

        return {
          questionCount: qs.length,
          dimensions: dims.map((d) => ({ id: d.id, code: d.code, name: d.name })),
          items: ordered.map((s) => ({
            ...s,
            testCode: testByVersion.get(s.versionId) ?? "",
            versionNumber: verById.get(s.versionId)?.versionNumber ?? null,
          })),
          summary: {
            items: stats.length,
            flagged: stats.filter((s) => s.flags.length > 0).length,
            avgP: avgOf(stats.map((s) => (s.p === null ? null : s.p * 100))),
            avgDiscrimination: (() => {
              const rs = stats.map((x) => x.discrimination).filter((r): r is number => r !== null);
              return rs.length ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 1000) / 1000 : null;
            })(),
          },
        };
      }),

    /** Funnel penyelesaian + drop-off per dimensi. */
    funnel: adminProcedure
      .input(
        z.object({
          code: z.string().trim().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
          batchId: z.string().optional(),
          schoolId: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const scope = await analyticsScope(input);
        const sessionIds = scope.sessions.map((s) => s.id);
        const [ans, qs, dims] = await Promise.all([
          sessionIds.length
            ? db.query.assessmentAnswers.findMany({ where: inArray(assessmentAnswers.sessionId, sessionIds) })
            : Promise.resolve([]),
          scope.versionIds.length
            ? db.query.questions.findMany({ where: inArray(questions.versionId, scope.versionIds) })
            : Promise.resolve([]),
          scope.versionIds.length
            ? db.query.assessmentDimensions.findMany({
                where: inArray(assessmentDimensions.versionId, scope.versionIds),
              })
            : Promise.resolve([]),
        ]);
        const f = computeFunnel(
          scope.sessions.map((x) => ({ ...x, configJson: x.configJson })),
          ans.map((a) => ({ sessionId: a.sessionId, questionId: a.questionId, scoreEarned: a.scoreEarned })),
          qs.map((q) => ({
            id: q.id,
            versionId: q.versionId,
            order: q.displayOrder,
            text: q.questionText,
            type: q.questionType,
            dimensionId: q.dimensionId,
          })),
        );
        const dimMap = new Map(dims.map((d) => [d.id, d]));
        return {
          ...f,
          completionRatePct: Math.round(f.completionRate * 1000) / 10,
          perDimension: f.perDimension.map((d) => ({
            ...d,
            code: dimMap.get(d.dimensionId)?.code ?? "",
            name: dimMap.get(d.dimensionId)?.name ?? "",
            dropRatePct: Math.round(d.dropRate * 1000) / 10,
          })),
        };
      }),

    /** Perbandingan versi soal (konversi, confidence, rata-rata p). */
    versions: adminProcedure.input(z.object({ code: z.string().trim().optional() })).handler(async ({ input }) => {
      const scope = await analyticsScope(input);
      if (!scope.versionIds.length) return { versions: [] };

      const finished = scope.sessions.filter((s) => s.status === "completed" || s.status === "timeout");
      const finishedIds = finished.map((s) => s.id);
      const [qs, opts, ans, results] = await Promise.all([
        db.query.questions.findMany({ where: inArray(questions.versionId, scope.versionIds) }),
        db.query.questionOptions.findMany({}),
        finishedIds.length
          ? db.query.assessmentAnswers.findMany({ where: inArray(assessmentAnswers.sessionId, finishedIds) })
          : Promise.resolve([]),
        finishedIds.length
          ? db.query.assessmentResults.findMany({ where: inArray(assessmentResults.sessionId, finishedIds) })
          : Promise.resolve([]),
      ]);
      const resBy = new Map(results.map((r) => [r.sessionId, r]));

      const itemStatsByVersion = scope.versionIds.map((vid) => {
        const vqs = qs.filter((q) => q.versionId === vid);
        const qIds = new Set(vqs.map((q) => q.id));
        const stats = computeItemStats({
          questions: vqs.map((q) => ({
            id: q.id,
            versionId: q.versionId,
            order: q.displayOrder,
            text: q.questionText,
            type: q.questionType,
            dimensionId: q.dimensionId,
          })),
          options: opts
            .filter((o) => qIds.has(o.questionId))
            .map((o) => ({
              id: o.id,
              questionId: o.questionId,
              value: o.optionValue,
              label: o.label,
              score: o.score,
            })),
          answers: ans
            .filter((a) => qIds.has(a.questionId))
            .map((a) => ({
              sessionId: a.sessionId,
              questionId: a.questionId,
              selectedOptionId: a.selectedOptionId,
              scoreEarned: a.scoreEarned,
            })),
          sessions: finished.filter((s) => s.versionId === vid),
        });
        return stats.map((s) => ({ versionId: vid, p: s.p }));
      });

      const versions = computeVersionStats({
        versions: scope.versions.map((v) => ({ id: v.id, versionNumber: v.versionNumber, status: v.status })),
        sessions: scope.sessions.map((s) => ({ ...s, versionId: s.versionId })),
        itemStats: itemStatsByVersion.flat(),
        confidences: finished.map((s) => ({
          sessionId: s.id,
          versionId: s.versionId,
          confidence: (() => {
            const r = resBy.get(s.id);
            const top = Number(((r?.recommendationsJson ?? []) as any[])?.[0]?.confidence);
            return Number.isFinite(top) ? top : null;
          })(),
        })),
      });
      return {
        versions: versions
          .filter((v) => v.sessions > 0)
          .map((v) => ({
            ...v,
            completionRatePct: Math.round(v.completionRate * 1000) / 10,
            avgPPct: v.avgP === null ? null : Math.round(v.avgP * 1000) / 10,
          })),
      };
    }),

    /** Tren harian: sesi mulai, selesai, pengguna unik. */
    timeseries: adminProcedure
      .input(
        z.object({
          code: z.string().trim().optional(),
          batchId: z.string().optional(),
          schoolId: z.string().optional(),
          days: z.number().int().min(1).max(120).default(14),
        }),
      )
      .handler(async ({ input }) => {
        const scope = await analyticsScope({ code: input.code, batchId: input.batchId, schoolId: input.schoolId });
        return { days: input.days, points: computeTimeseries(scope.sessions, { days: input.days }) };
      }),

    /** Segmentasi: sumber, sekolah, jenjang, kota. */
    segments: adminProcedure
      .input(
        z.object({
          code: z.string().trim().optional(),
          batchId: z.string().optional(),
          schoolId: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const scope = await analyticsScope({ code: input.code, batchId: input.batchId, schoolId: input.schoolId });
        const sessionIds = scope.sessions.map((s) => s.id);
        const results = sessionIds.length
          ? await db.query.assessmentResults.findMany({ where: inArray(assessmentResults.sessionId, sessionIds) })
          : [];
        const resBy = new Map(results.map((r) => [r.sessionId, r]));

        const userIds = [...new Set(scope.sessions.map((s) => s.studentId))];
        const accountIds = userIds.filter((u) => !u.startsWith("guest-"));
        const [accounts, details, roster] = await Promise.all([
          accountIds.length
            ? db.query.user.findMany({ where: inArray(userSchema.id, accountIds) })
            : Promise.resolve([]),
          accountIds.length
            ? db.query.studentDetail.findMany({ where: inArray(studentDetail.userId, accountIds) })
            : Promise.resolve([]),
          userIds.length
            ? db.query.tmbBatchStudents.findMany({ where: inArray(tmbBatchStudents.userId, userIds) })
            : Promise.resolve([]),
        ]);
        const batchIds = [...new Set(roster.map((r) => r.batchId))];
        const batches = batchIds.length
          ? await db.query.tmbBatches.findMany({ where: inArray(tmbBatches.id, batchIds) })
          : [];
        const schoolIds = [...new Set(batches.map((b) => b.schoolId))];
        const schools = schoolIds.length
          ? await db.query.tmbSchools.findMany({ where: inArray(tmbSchools.id, schoolIds) })
          : [];
        const batchMap = new Map(batches.map((b) => [b.id, b]));
        const schoolMap = new Map(schools.map((s) => [s.id, s]));
        const rosterByUser = new Map<string, (typeof roster)[number]>();
        for (const r of roster) if (r.userId && !rosterByUser.has(r.userId)) rosterByUser.set(r.userId, r);
        const detailBy = new Map(details.map((d) => [d.userId, d]));

        const group = (keyFn: (s: (typeof scope.sessions)[number]) => string) => {
          const m = new Map<string, { total: number; completed: number; conf: number[]; users: Set<string> }>();
          for (const s of scope.sessions) {
            const key = keyFn(s) || "Tidak diketahui";
            const cur = m.get(key) ?? { total: 0, completed: 0, conf: [], users: new Set<string>() };
            cur.total += 1;
            if (s.status === "completed") cur.completed += 1;
            cur.users.add(s.studentId);
            const top = Number(((resBy.get(s.id)?.recommendationsJson ?? []) as any[])?.[0]?.confidence);
            if (Number.isFinite(top)) cur.conf.push(top);
            m.set(key, cur);
          }
          return [...m.entries()]
            .map(([key, v2]) => ({
              key,
              sessions: v2.total,
              users: v2.users.size,
              completionRatePct: Math.round((v2.completed / v2.total) * 1000) / 10,
              avgConfidence: avgOf(v2.conf),
            }))
            .sort((a, b) => b.sessions - a.sessions);
        };

        const schoolOf = (studentId: string) => {
          const r = rosterByUser.get(studentId);
          const b = r ? batchMap.get(r.batchId) : null;
          return b ? (schoolMap.get(b.schoolId)?.name ?? "") : "";
        };

        return {
          bySource: group((s) => (rosterByUser.has(s.studentId) ? "Sekolah (invitasi)" : "Mandiri")),
          bySchool: group((s) => schoolOf(s.studentId)).slice(0, 20),
          byLevel: group((s) => {
            const d = detailBy.get(s.studentId);
            return (d?.educationLevel as string) ?? "";
          }),
          byCity: group((s) => {
            const r = rosterByUser.get(s.studentId);
            const b = r ? batchMap.get(r.batchId) : null;
            const sc = b ? schoolMap.get(b.schoolId) : null;
            return (sc as any)?.city ?? "";
          }),
          withAccount: accounts.length,
        };
      }),

    /** Daftar peserta yang perlu perhatian (keyakinan rendah / minat menyebar / kemampuan lemah). */
    attention: adminProcedure
      .input(
        z.object({
          code: z.string().trim().optional(),
          batchId: z.string().optional(),
          schoolId: z.string().optional(),
          limit: z.number().int().min(1).max(200).default(50),
        }),
      )
      .handler(async ({ input }) => {
        const scope = await analyticsScope({ code: input.code, batchId: input.batchId, schoolId: input.schoolId });
        const finished = scope.sessions.filter((s) => s.status === "completed" || s.status === "timeout");
        if (!finished.length) return { items: [] };
        const results = await db.query.assessmentResults.findMany({
          where: inArray(
            assessmentResults.sessionId,
            finished.map((s) => s.id),
          ),
        });
        const bySession = new Map(results.map((r) => [r.sessionId, r]));

        const userIds = [...new Set(finished.map((s) => s.studentId))];
        const accountIds = userIds.filter((u) => !u.startsWith("guest-"));
        const [accounts, roster, tmbRows] = await Promise.all([
          accountIds.length
            ? db.query.user.findMany({ where: inArray(userSchema.id, accountIds) })
            : Promise.resolve([]),
          db.query.tmbBatchStudents.findMany({ where: inArray(tmbBatchStudents.userId, userIds) }),
          db.query.tmbAssessmentResults.findMany({ where: inArray(tmbAssessmentResults.userId, userIds) }),
        ]);
        const accBy = new Map(accounts.map((a) => [a.id, a]));
        const familyByVersion = new Map<string, string | null>();
        for (const v of scope.versions) {
          const a = scope.assets.find((x) => x.id === v.assessmentId);
          familyByVersion.set(v.id, (a?.family as string | null) ?? null);
        }
        const rosterBy = new Map<string, (typeof roster)[number]>();
        for (const r of roster) if (r.userId && !rosterBy.has(r.userId)) rosterBy.set(r.userId, r);
        const tmbByUser = new Map<string, (typeof tmbRows)[number]>();
        for (const r of tmbRows) if (!tmbByUser.has(r.userId)) tmbByUser.set(r.userId, r);

        const items = finished.map((s) => {
          const res = bySession.get(s.id);
          const tmb = tmbByUser.get(s.studentId);
          const conf = Number(tmb?.confidenceScore ?? 0) || null;
          const diff = String(tmb?.differentiation ?? "").toLowerCase();
          const reasons: string[] = [];
          if (conf !== null && conf < 50) reasons.push("keyakinan rendah");
          if (diff.startsWith("weak") || diff.startsWith("flat")) reasons.push("minat menyebar");
          // kemampuan lemah (berlaku untuk tes bakat): dimensi dengan benar < 40%
          // hanya untuk tes BAKAT — kemampuan tidak relevan di baris minat
          if (familyByVersion.get(s.versionId) === "bakat") {
            const ab = ((tmb?.abilityScores as any)?.scores ?? tmb?.abilityScores ?? {}) as Record<
              string,
              { correct?: number; total?: number }
            >;
            for (const [k, v] of Object.entries(ab)) {
              if (!v || typeof v !== "object" || !v.total) continue;
              if ((v.correct ?? 0) / v.total < 0.4) reasons.push(`kemampuan ${k} lemah`);
            }
          }
          if (!res) reasons.push("hasil belum terbentuk");
          return {
            sessionId: s.id,
            studentId: s.studentId,
            name: accBy.get(s.studentId)?.name ?? rosterBy.get(s.studentId)?.name ?? "Guest",
            profileCode: res?.profileCode ?? tmb?.hollandCode ?? null,
            confidence: conf,
            differentiation: tmb?.differentiation ?? null,
            finishedAt: s.completedAt,
            reasons: reasons.slice(0, 3),
          };
        });
        return {
          items: items.filter((i) => i.reasons.length > 0).slice(0, input.limit),
          checked: items.length,
        };
      }),
  },

  // ── B2C: statistik & history seluruh pengguna ──
  b2c: {
    stats: adminProcedure.handler(async () => {
      const [resultCount, userCount, legacyAttempts, legacyCompleted, engineSessions, engineCompleted] =
        await Promise.all([
          db.select({ n: count() }).from(tmbAssessmentResults),
          db
            .select({ userId: tmbAssessmentResults.userId })
            .from(tmbAssessmentResults)
            .groupBy(tmbAssessmentResults.userId),
          // legacy (arsip) — tetap ditampilkan terpisah supaya angka tidak menyesatkan
          db.select({ n: count() }).from(tmbTestAttempts),
          db.select({ n: count() }).from(tmbTestAttempts).where(eq(tmbTestAttempts.status, "completed")),
          // sumber utama sekarang: sesi engine
          db.select({ n: count() }).from(assessmentSessions),
          db
            .select({ n: count() })
            .from(assessmentSessions)
            .where(inArray(assessmentSessions.status, ["completed", "timeout"] as any)),
        ]);

      // distribusi Holland (semua hasil)
      const results = await db.query.tmbAssessmentResults.findMany({
        columns: { id: true, hollandCode: true, confidenceScore: true, createdAt: true },
      });
      const hollandCount: Record<string, number> = {};
      const confValues: number[] = [];
      for (const r of results) {
        if (r.hollandCode) {
          const primary = r.hollandCode.charAt(0);
          hollandCount[primary] = (hollandCount[primary] ?? 0) + 1;
        }
        // hanya nilai valid yang masuk rata-rata (dulu null dihitung 0 → rata-rata terlalu rendah)
        const c = Number(r.confidenceScore);
        if (Number.isFinite(c) && c > 0) confValues.push(c);
      }

      // top jurusan (rekomendasi)
      const recoRows = await db
        .select({ itemName: tmbRecommendations.itemName })
        .from(tmbRecommendations)
        .where(eq(tmbRecommendations.type, "major"));
      const majorCount: Record<string, number> = {};
      for (const r of recoRows) majorCount[r.itemName] = (majorCount[r.itemName] ?? 0) + 1;
      const topMajors = Object.entries(majorCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // aktivitas terakhir
      const recent = results.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)).slice(0, 5);
      void recent;

      return {
        totalAssessments: resultCount[0]?.n ?? 0,
        totalUsers: userCount.length,
        totalAttempts: engineSessions[0]?.n ?? 0,
        completedAttempts: engineCompleted[0]?.n ?? 0,
        legacyAttempts: legacyAttempts[0]?.n ?? 0,
        legacyCompleted: legacyCompleted[0]?.n ?? 0,
        hollandDistribution: Object.entries(hollandCount)
          .map(([code, count]) => ({ code, count }))
          .sort((a, b) => b.count - a.count),
        topMajors,
        avgConfidence: confValues.length ? Math.round(confValues.reduce((a, b) => a + b, 0) / confValues.length) : 0,
        confidenceSamples: confValues.length,
        resultsWithoutConfidence: results.length - confValues.length,
      };
    }),

    history: adminProcedure
      .input(z.object({ limit: z.number().int().default(20), offset: z.number().int().default(0) }))
      .handler(async ({ input }) => {
        const rows = await db.query.tmbAssessmentResults.findMany({
          orderBy: desc(tmbAssessmentResults.createdAt),
          limit: input.limit,
          offset: input.offset,
        });
        const total = await db.select({ n: count() }).from(tmbAssessmentResults);

        // nama user: user table utk akun, batch_students utk guest
        const userRows = await db.query.user.findMany({
          where: inArray(
            userSchema.id,
            rows.filter((r) => !r.userId.startsWith("guest-")).map((r) => r.userId),
          ),
        });
        const userMap = new Map(userRows.map((u) => [u.id, u.name]));
        const guestRows = await db.query.tmbBatchStudents.findMany();
        const guestMap = new Map(guestRows.map((g) => [`guest-${g.id}`, g.name]));

        // top major per result
        const resultIds = rows.map((r) => r.id);
        const recos = await db.query.tmbRecommendations.findMany({
          where: and(eq(tmbRecommendations.type, "major"), inArray(tmbRecommendations.resultId, resultIds)),
        });
        const topMajorMap = new Map<string, string>();
        for (const rec of recos) {
          if (!topMajorMap.has(rec.resultId)) topMajorMap.set(rec.resultId, rec.itemName);
        }

        // sesi engine per siswa — dipakai menandai hasil yang punya jawaban tersimpan
        const uids = [...new Set(rows.map((r) => r.userId))];
        const sessRows = uids.length
          ? await db.query.assessmentSessions.findMany({
              where: inArray(assessmentSessions.studentId, uids),
              columns: { id: true, studentId: true },
            })
          : [];
        const usersWithSession = new Set(sessRows.map((x) => x.studentId));

        return {
          total: total[0]?.n ?? 0,
          items: await Promise.all(
            rows.map(async (r) => ({
              id: r.id,
              hasSession: usersWithSession.has(r.userId),
              name: userMap.get(r.userId) ?? guestMap.get(r.userId) ?? "Guest",
              isGuest: r.userId.startsWith("guest-"),
              hollandCode: r.hollandCode,
              confidenceScore: r.confidenceScore,
              topMajor: topMajorMap.get(r.id) ?? null,
              createdAt: r.createdAt,
              source: await resolveResultSource(r.id),
            })),
          ),
        };
      }),

    /**
     * Data ekspor hasil assessment (admin) — 1 baris = 1 PERCOBAAN (sesi tes yang selesai).
     *
     * Sumber jawaban & versi soal = engine (`assessment_sessions` → `assessment_answers`),
     * jadi versi soal tiap percobaan pasti benar. Profil & confidence diambil dari
     * `assessment_results` (terikat `sessionId`) dan confidence profil dari baris
     * `tmb_assessment_results` user yang paling dekat waktunya (dicatat di `confidenceMatch`).
     */
    exportData: adminProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(1000).default(300),
          offset: z.number().int().min(0).default(0),
          code: z.string().trim().optional(), // filter kode tes (DISCOVER/TALENT/…)
          from: z.string().trim().optional(), // ISO — filter completedAt
          to: z.string().trim().optional(),
          batchId: z.string().trim().optional(), // B2B: satu kelas
          schoolId: z.string().trim().optional(), // B2B: satu sekolah
        }),
      )
      .handler(async ({ input }) => {
        const fromD = input.from ? new Date(input.from) : null;
        const toD = input.to ? new Date(input.to) : null;
        const range =
          fromD || toD
            ? and(
                fromD ? gte(assessmentSessions.completedAt, fromD) : undefined,
                toD ? lte(assessmentSessions.completedAt, toD) : undefined,
              )
            : undefined;

        const sessionsAll = await db.query.assessmentSessions.findMany({
          where: and(
            inArray(assessmentSessions.status, ["completed", "timeout"] as any),
            isNotNull(assessmentSessions.completedAt),
            range,
          ),
          orderBy: [desc(assessmentSessions.completedAt)],
          limit: input.limit,
          offset: input.offset,
        });

        // versi + tes (untuk kode/nama/family + nomor versi)
        const versionIds = [...new Set(sessionsAll.map((s) => s.versionId))];
        const versions = versionIds.length
          ? await db.query.assessmentVersions.findMany({
              where: inArray(assessmentVersions.id, versionIds),
            })
          : [];
        const assessmentIds = [...new Set(versions.map((v) => v.assessmentId))];
        const assessRows = assessmentIds.length
          ? await db.query.assessments.findMany({ where: inArray(assessments.id, assessmentIds) })
          : [];
        const versionMap = new Map(versions.map((v) => [v.id, v]));
        const assessMap = new Map(assessRows.map((a) => [a.id, a]));
        const codeOf = (versionId: string) => {
          const v = versionMap.get(versionId);
          return v ? (assessMap.get(v.assessmentId)?.code ?? "") : "";
        };

        // B2B: batasi ke siswa kohort (kelas/sekolah)
        let cohortIds: string[] | null = null;
        if (input.batchId || input.schoolId) {
          const batchIds = input.batchId
            ? [input.batchId]
            : (
                await db.query.tmbBatches.findMany({
                  where: eq(tmbBatches.schoolId, input.schoolId as string),
                  columns: { id: true },
                })
              ).map((b) => b.id);
          const roster = batchIds.length
            ? await db.query.tmbBatchStudents.findMany({ where: inArray(tmbBatchStudents.batchId, batchIds) })
            : [];
          cohortIds = roster.map((r) => r.userId ?? `guest-${r.id}`);
        }
        if (cohortIds)
          sessionsAll.splice(0, sessionsAll.length, ...sessionsAll.filter((s) => cohortIds?.includes(s.studentId)));

        let sessions = sessionsAll;
        if (input.code) {
          const want = input.code.toUpperCase();
          sessions = sessions.filter((s) => codeOf(s.versionId).toUpperCase() === want);
        }

        const sessionIds = sessions.map((s) => s.id);
        const results = sessionIds.length
          ? await db.query.assessmentResults.findMany({
              where: inArray(assessmentResults.sessionId, sessionIds),
            })
          : [];
        const answers = sessionIds.length
          ? await db.query.assessmentAnswers.findMany({
              where: inArray(assessmentAnswers.sessionId, sessionIds),
            })
          : [];
        const questionIds = [...new Set(answers.map((a) => a.questionId))];
        const questionRows = versionIds.length
          ? await db.query.questions.findMany({
              where: inArray(questions.versionId, versionIds),
              orderBy: [asc(questions.displayOrder)],
            })
          : [];
        const allQuestionIds = [...new Set([...questionIds, ...questionRows.map((q) => q.id)])];
        const options = allQuestionIds.length
          ? await db.query.questionOptions.findMany({
              where: inArray(questionOptions.questionId, allQuestionIds),
              orderBy: [asc(questionOptions.displayOrder)],
            })
          : [];
        const dims = versionIds.length
          ? await db.query.assessmentDimensions.findMany({
              where: inArray(assessmentDimensions.versionId, versionIds),
              orderBy: [asc(assessmentDimensions.displayOrder)],
            })
          : [];

        // identitas
        const userIds = [...new Set(sessions.map((s) => s.studentId))];
        const accountIds = userIds.filter((u) => !u.startsWith("guest-"));
        const accounts = accountIds.length
          ? await db.query.user.findMany({ where: inArray(userSchema.id, accountIds) })
          : [];
        const accountMap = new Map(accounts.map((u) => [u.id, { name: u.name, email: u.email }]));
        const roster = userIds.length
          ? await db.query.tmbBatchStudents.findMany({ where: inArray(tmbBatchStudents.userId, userIds) })
          : [];
        const batchIds = [...new Set(roster.map((r) => r.batchId))];
        const batches = batchIds.length
          ? await db.query.tmbBatches.findMany({ where: inArray(tmbBatches.id, batchIds) })
          : [];
        const schoolIds = [...new Set(batches.map((b) => b.schoolId))];
        const schools = schoolIds.length
          ? await db.query.tmbSchools.findMany({ where: inArray(tmbSchools.id, schoolIds) })
          : [];
        const batchMap = new Map(batches.map((b) => [b.id, b]));
        const schoolMap = new Map(schools.map((s2) => [s2.id, s2]));
        const rosterByUser = new Map<string, (typeof roster)[number]>();
        const rosterById = new Map<string, (typeof roster)[number]>();
        for (const r of roster) {
          if (r.userId && !rosterByUser.has(r.userId)) rosterByUser.set(r.userId, r);
          if (!rosterById.has(r.id)) rosterById.set(r.id, r);
        }
        /** guest-<rosterId> atau roster yg user_id-nya kosong tetap dapat namanya. */
        const rosterFor = (studentId: string) =>
          rosterByUser.get(studentId) ?? rosterById.get(studentId.replace(/^guest-/, "")) ?? null;

        // confidence profil (tmb) — baris terdekat waktunya per user
        const tmbRows = userIds.length
          ? await db.query.tmbAssessmentResults.findMany({
              where: inArray(tmbAssessmentResults.userId, userIds),
              orderBy: [desc(tmbAssessmentResults.createdAt)],
            })
          : [];
        const matchAttempt = (userId: string, family: string | null, at: Date | null) => {
          const cands = tmbRows.filter((r) => r.userId === userId);
          if (!cands.length) return null;
          const prefer =
            family === "minat"
              ? cands.filter((r) => (r.hollandCode ?? "").length > 0)
              : family === "bakat"
                ? cands.filter((r) => Object.keys((r as any).abilityScores ?? {}).length > 0)
                : cands;
          const pool = prefer.length ? prefer : cands;
          if (!at) return pool[0] ?? null;
          return pool.reduce<(typeof pool)[number] | null>((best, r) => {
            if (!r.createdAt) return best;
            if (!best?.createdAt) return r;
            return Math.abs(r.createdAt.getTime() - at.getTime()) < Math.abs(best.createdAt.getTime() - at.getTime())
              ? r
              : best;
          }, null);
        };

        const rows = sessions.map((s) => {
          const v = versionMap.get(s.versionId);
          const a = v ? assessMap.get(v.assessmentId) : null;
          const family = (a?.family ?? null) as string | null;
          const res = results.find((r) => r.sessionId === s.id) ?? null;
          const tmb = matchAttempt(s.studentId, family, s.completedAt);
          const recos = ((res?.recommendationsJson ?? []) as any[]).map((r: any, i: number) => ({
            rank: i + 1,
            name: r.categoryName ?? r.itemName ?? "",
            confidence: Number(r.confidence ?? 0),
          }));
          const rosterRow = rosterFor(s.studentId);
          const batch = rosterRow ? batchMap.get(rosterRow.batchId) : null;
          const school = batch ? schoolMap.get(batch.schoolId) : null;
          const acc = accountMap.get(s.studentId);
          const ans = answers.filter((x) => x.sessionId === s.id);
          return {
            studentId: s.studentId,
            // samakan dengan tabel Riwayat B2C: tanpa akun/roster → "Guest" (id tetap ada di kolom ID Siswa)
            name: acc?.name ?? rosterRow?.name ?? "Guest",
            email: acc?.email ?? rosterRow?.email ?? "",
            isGuest: s.studentId.startsWith("guest-") || !acc,
            source: rosterRow ? "sekolah" : "mandiri",
            schoolName: school?.name ?? "",
            batchName: batch?.name ?? "",
            testCode: a?.code ?? "",
            testName: a?.name ?? "",
            family,
            versionNumber: v?.versionNumber ?? null,
            versionStatus: v?.status ?? "",
            sessionId: s.id,
            versionId: s.versionId,
            startedAt: s.startedAt,
            finishedAt: s.completedAt,
            status: s.status,
            profileCode: res?.profileCode ?? tmb?.hollandCode ?? null,
            topDimensions: (res?.topDimensionsJson ?? []) as string[],
            rawScores: (res?.rawScoresJson ?? {}) as Record<string, number>,
            timedOut: res?.timedOut ?? false,
            xpEarned: res?.xpEarned ?? 0,
            recommendations: recos,
            confidenceProfile: tmb?.confidenceScore ?? null,
            differentiation: tmb?.differentiation ?? null,
            confidenceMatch: tmb ? { attemptId: tmb.id, createdAt: tmb.createdAt } : null,
            answers: ans.map((x) => ({
              questionId: x.questionId,
              optionId: x.selectedOptionId ?? null,
              text: x.textAnswer ?? null,
              score: x.scoreEarned ?? null,
            })),
          };
        });

        const total = await db
          .select({ n: count() })
          .from(assessmentSessions)
          .where(
            and(
              inArray(assessmentSessions.status, ["completed", "timeout"] as any),
              isNotNull(assessmentSessions.completedAt),
              range,
            ),
          );

        const totalResultRows = await db.select({ n: count() }).from(tmbAssessmentResults);
        // total HARUS mengikuti cakupan (kohort/tes) — bukan total global
        const scopedTotal = cohortIds ? rows.length : (total[0]?.n ?? 0);

        return {
          generatedAt: new Date().toISOString(),
          total: scopedTotal,
          totalResults: totalResultRows[0]?.n ?? 0,
          offset: input.offset,
          limit: input.limit,
          rows,
          questions: questionRows.map((q) => ({
            id: q.id,
            versionId: q.versionId,
            order: q.displayOrder,
            code: q.questionCode ?? "",
            text: q.questionText ?? "",
            type: q.questionType,
            dimensionId: q.dimensionId,
            presentationMode: q.presentationMode,
          })),
          options: options.map((o) => ({
            id: o.id,
            questionId: o.questionId,
            value: o.optionValue,
            label: o.label,
            score: o.score,
          })),
          dimensions: dims.map((d) => ({ id: d.id, versionId: d.versionId, code: d.code, name: d.name })),
        };
      }),
  },
};

// ─── Sumber test: mandiri (B2C) vs via sekolah (B2B batch) ───
async function resolveResultSource(resultId: string) {
  const bs = await db.query.tmbBatchStudents.findFirst({ where: eq(tmbBatchStudents.resultId, resultId) });
  if (!bs) return { kind: "self" as const };
  const batch = await db.query.tmbBatches.findFirst({ where: eq(tmbBatches.id, bs.batchId) });
  const school = batch ? await db.query.tmbSchools.findFirst({ where: eq(tmbSchools.id, batch.schoolId) }) : null;
  return { kind: "batch" as const, batchName: batch?.name ?? null, schoolName: school?.name ?? null };
}

// ─── Short claim code (tanpa huruf ambigu O/0/I/1/L) ───
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateClaimCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

// ─── Email undangan ─────────────────────────────────────

function inviteEmailHtml(name: string, link: string, schoolName?: string) {
  const escaped = link.replace(/&/g, "&amp;");
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fafafc">
  <div style="background:linear-gradient(135deg,#1a1f6d,#272c75);border-radius:16px;padding:28px;text-align:center;color:#fff">
    <p style="font-size:28px;margin:0">🧭</p>
    <h1 style="margin:8px 0 4px;font-size:20px">Kamu Diundang!</h1>
    <p style="margin:0;opacity:.8;font-size:14px">Test Minat Bakat by MULAI+</p>
  </div>
  <div style="background:#fff;border-radius:16px;padding:24px;margin-top:16px">
    <p style="font-size:15px;color:#333;line-height:1.6">Halo <b>${name}</b>,</p>
    <p style="font-size:14px;color:#555;line-height:1.6">
      ${schoolName ? `<b>${schoolName}</b> mengundang kamu mengikuti ` : "Sekolahmu mengundang kamu mengikuti "}<b>Test Minat Bakat by MULAI+</b> —
      20 soal cepat (±10 menit) untuk menemukan jurusan & karier yang cocok.
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${escaped}" style="background:#fe9114;color:#fff;text-decoration:none;padding:14px 32px;border-radius:14px;font-size:15px;font-weight:bold;display:inline-block">
        Mulai Test →
      </a>
    </div>
    <p style="font-size:12px;color:#999;text-align:center">Link berlaku 30 hari. Hasil akan dikirim ke sekolahmu.</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#bbb;margin-top:16px">Test by MULAI+ · mulaiplus.id</p>
</div>`;
}

export const tmbScoring = { computeHolland, computeAbility, computeRecommendations };
