import { randomUUID } from "node:crypto";
import { and, asc, count, db, desc, eq, inArray, isNotNull, max, ne, sql } from "@mulai-plus/db/db";
import { assessmentOrgs } from "@mulai-plus/db/schema/assessment";
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
import { notFound, preconditionFailed } from "../lib/errors";
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
let prodiCache: { name: string; level: string | null; university: string; idSms: string; idSp: string }[] | null = null;
let prodiCacheTs = 0;

export async function getProdiList() {
  const now = Date.now();
  if (!prodiCache || now - prodiCacheTs > 86400_000) {
    const rows = await db
      .select({
        name: studyPrograms.name,
        level: studyPrograms.level,
        university: universities.name,
        idSms: studyPrograms.idSms,
        idSp: studyPrograms.idSp,
      })
      .from(studyPrograms)
      .innerJoin(universities, eq(studyPrograms.idSp, universities.idSp))
      .where(eq(studyPrograms.status, "Aktif"));
    prodiCache = rows;
    prodiCacheTs = now;
  }
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
  // kelompokkan prodi per kategori
  const byCategory = new Map<string, typeof prodiList>();
  for (const p of prodiList) {
    for (const pat of patterns) {
      if (new RegExp(pat.pattern, "i").test(p.name)) {
        const arr = byCategory.get(pat.categoryKey) ?? [];
        arr.push(p);
        byCategory.set(pat.categoryKey, arr);
        break;
      }
    }
  }

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
      examples: prodis.slice(0, 3),
    });
  }

  results.sort((a, b) => b.confidence - a.confidence);
  const top = results.slice(0, 5);

  // karier untuk top kategori
  const topKeys = new Set(top.map((r) => r.category.categoryKey));
  const matchedCareers = careers.filter((c) => topKeys.has(c.majorCategory)).slice(0, 5);

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
    /** Papan peringkat Test Bakat — publik; nama disensor (inisial + ***), email tak pernah dikirim.
     *  Per user: attempt ability terbaik (skor = jawaban benar, tie-break waktu tercepat). */
    ability: publicProcedure.handler(async ({ context }) => {
      const nowMs = Date.now();
      if (lbCacheTs > nowMs) return lbCache;
      const viewerId = (context as any)?.session?.user?.id ?? null;
      const rows = (await db.execute(sql`
        WITH sc AS (
          SELECT a.user_id, a.id,
            (SELECT count(*) FROM tmb_test_answers x
              WHERE x.attempt_id = a.id AND x.is_correct = true)::int AS score,
            (SELECT count(*) FROM tmb_test_answers x
              WHERE x.attempt_id = a.id)::int AS total,
            EXTRACT(EPOCH FROM (a.finished_at - a.started_at))::int AS dur
          FROM tmb_test_attempts a
          WHERE a.test_code = 'ability' AND a.status = 'completed'
            AND a.finished_at IS NOT NULL AND a.started_at IS NOT NULL
        ), best AS (
          SELECT DISTINCT ON (user_id) user_id, score, total, dur, id
          FROM sc ORDER BY user_id, score DESC, dur ASC
        )
        SELECT b.user_id, b.score, b.total, b.dur, u.name AS name
        FROM best b
        JOIN "user" u ON u.id = b.user_id
        ORDER BY b.score DESC, b.dur ASC
        LIMIT 50`)) as unknown as {
        rows?: { user_id: string; score: number; total: number; dur: number; name: string }[];
      };

      const list = (rows.rows ?? []).map((r, i) => {
        const name = (r.name ?? "Pengguna").trim();
        const masked =
          name.length > 1 ? `${name[0]}${"*".repeat(Math.min(3, Math.max(2, name.length - 1)))}` : `${name}**`;
        return {
          rank: i + 1,
          masked,
          score: Number(r.score ?? 0),
          total: Number(r.total ?? 0),
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

      return { result, recommendations, summary: summary?.content ?? null, stats, profile };
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

        // 2) kelompokkan prodi per kategori (regex pola dari major_patterns)
        const byCategory = new Map<string, typeof prodiList>();
        for (const p of prodiList) {
          for (const pat of patterns) {
            if (new RegExp(pat.pattern, "i").test(p.name)) {
              const arr = byCategory.get(pat.categoryKey) ?? [];
              arr.push(p);
              byCategory.set(pat.categoryKey, arr);
              break;
            }
          }
        }

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
        for (const m of top) {
          if (seen.has(m.categoryKey)) continue;
          seen.add(m.categoryKey);
          const pat = patterns.find((p) => p.categoryKey === m.categoryKey);
          const prodis = (byCategory.get(m.categoryKey) ?? []).slice(0, 6);
          paths.push({
            categoryKey: m.categoryKey,
            categoryName: pat?.categoryName ?? m.categoryKey,
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
          let best = 0;
          for (const path of paths) {
            const pat = patterns.find((p) => p.categoryKey === path.categoryKey);
            if (!pat) continue;
            const interest =
              ((hollandScores[pat.hollandPrimary] ?? 0) + (hollandScores[pat.hollandSecondary] ?? 0)) / 2;
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
  const existing = await db.query.tmbUserStats.findFirst({ where: eq(tmbUserStats.userId, userId) });
  const today = new Date().toDateString();
  const lastDay = existing?.lastActivityAt ? new Date(existing.lastActivityAt).toDateString() : null;

  const newXp = (existing?.xp ?? 0) + xp;
  const newLevel = Math.floor(newXp / 150) + 1;
  const isNewDay = lastDay !== today;
  const newStreak = isNewDay ? (existing?.streak ?? 0) + 1 : (existing?.streak ?? 0);

  await db
    .insert(tmbUserStats)
    .values({ userId, xp: newXp, level: newLevel, streak: newStreak, testsCompleted: 1, lastActivityAt: new Date() })
    .onConflictDoUpdate({
      target: tmbUserStats.userId,
      set: {
        xp: newXp,
        level: newLevel,
        streak: newStreak,
        testsCompleted: (existing?.testsCompleted ?? 0) + 1,
        lastActivityAt: new Date(),
      },
    });
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

  analytics: adminProcedure.input(z.object({ batchId: z.string() })).handler(async ({ input }) => {
    const students = await db.query.tmbBatchStudents.findMany({ where: eq(tmbBatchStudents.batchId, input.batchId) });
    const total = students.length;
    const completed = students.filter((s) => s.status === "completed").length;
    const inProgress = students.filter((s) => s.status === "in_progress").length;
    const invited = students.filter((s) => s.status === "invited").length;

    // distribusi Holland
    const hollandCount: Record<string, number> = {};
    const abilityAvg: Record<string, { sum: number; n: number }> = {};
    const topMajorCount: Record<string, number> = {};

    for (const s of students) {
      if (!s.resultId) continue;
      const resultId = s.resultId;
      const [r, recos] = await Promise.all([
        db.query.tmbAssessmentResults.findFirst({ where: eq(tmbAssessmentResults.id, resultId) }),
        db.query.tmbRecommendations.findMany({
          where: eq(tmbRecommendations.resultId, resultId),
          orderBy: asc(tmbRecommendations.rank),
        }),
      ]);
      if (r?.hollandCode) {
        const primary = r.hollandCode.charAt(0);
        hollandCount[primary] = (hollandCount[primary] ?? 0) + 1;
      }
      const ability = (r?.abilityScores as any)?.scores ?? {};
      for (const [dim, v] of Object.entries(ability as Record<string, { correct: number; total: number }>)) {
        if (v.total > 0) {
          abilityAvg[dim] = abilityAvg[dim] ?? { sum: 0, n: 0 };
          abilityAvg[dim].sum += v.correct / v.total;
          abilityAvg[dim].n += 1;
        }
      }
      recos
        .filter((x) => x.type === "major")
        .slice(0, 3)
        .forEach((x) => {
          topMajorCount[x.itemName] = (topMajorCount[x.itemName] ?? 0) + 1;
        });
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

    return { total, completed, inProgress, invited, hollandDistribution, abilityAvg: abilityAvgClean, topMajors };
  }),

  // ── B2C: statistik & history seluruh pengguna ──
  b2c: {
    stats: adminProcedure.handler(async () => {
      const [resultCount, userCount, attemptCount, completedCount] = await Promise.all([
        db.select({ n: count() }).from(tmbAssessmentResults),
        db
          .select({ userId: tmbAssessmentResults.userId })
          .from(tmbAssessmentResults)
          .groupBy(tmbAssessmentResults.userId),
        db.select({ n: count() }).from(tmbTestAttempts),
        db.select({ n: count() }).from(tmbTestAttempts).where(eq(tmbTestAttempts.status, "completed")),
      ]);

      // distribusi Holland (semua hasil)
      const results = await db.query.tmbAssessmentResults.findMany({
        columns: { id: true, hollandCode: true, confidenceScore: true, createdAt: true },
      });
      const hollandCount: Record<string, number> = {};
      let totalConfidence = 0;
      for (const r of results) {
        if (r.hollandCode) {
          const primary = r.hollandCode.charAt(0);
          hollandCount[primary] = (hollandCount[primary] ?? 0) + 1;
        }
        totalConfidence += Number(r.confidenceScore ?? 0);
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
        totalAttempts: attemptCount[0]?.n ?? 0,
        completedAttempts: completedCount[0]?.n ?? 0,
        hollandDistribution: Object.entries(hollandCount)
          .map(([code, count]) => ({ code, count }))
          .sort((a, b) => b.count - a.count),
        topMajors,
        avgConfidence: results.length ? Math.round(totalConfidence / results.length) : 0,
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

        return {
          total: total[0]?.n ?? 0,
          items: await Promise.all(
            rows.map(async (r) => ({
              id: r.id,
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
