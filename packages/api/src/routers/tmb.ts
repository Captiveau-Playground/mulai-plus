import { randomUUID } from "node:crypto";
import { and, asc, count, db, desc, eq } from "@mulai-plus/db";
import { studyPrograms, universities } from "@mulai-plus/db/schema/pddikti";
import {
  tmbAiSummaries,
  tmbAssessmentResults,
  tmbBatches,
  tmbBatchStudents,
  tmbInvitations,
  tmbMajorPatterns,
  tmbProfiles,
  tmbQuestionBank,
  tmbRecommendations,
  tmbTestAnswers,
  tmbTestAttempts,
  tmbTestCatalog,
  tmbUserStats,
} from "@mulai-plus/db/schema/tmb";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";
import { notFound, preconditionFailed } from "../lib/errors";

// ─── Konstanta ───────────────────────────────────────────

const HOLLAND_DIMS = ["R", "I", "A", "S", "E", "C"];
const ABILITY_DIMS = ["numerical", "verbal", "logical", "spatial", "clerical"];
const ABILITY_LEVEL_MAP: Record<string, number> = { high: 1, medium: 0.6, low: 0.3 };

// Cache prodi (data statis) — refresh 1 jam
let prodiCache: { name: string; level: string | null; university: string; idSms: string; idSp: string }[] | null = null;
let prodiCacheTs = 0;

async function getProdiList() {
  const now = Date.now();
  if (!prodiCache || now - prodiCacheTs > 3600_000) {
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

function computeRecommendations(
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
    const interestMatch = ((studentHolland[primary] ?? 0) + (studentHolland[secondary] ?? 0)) / 2;

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

// ─── Router ──────────────────────────────────────────────

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

      return { resultId, alreadyCompleted: false, bothDone: true };
    }),
  },

  result: {
    get: protectedProcedure.handler(async ({ context }) => {
      const userId = context.session.user.id;
      const result = await db.query.tmbAssessmentResults.findFirst({
        where: eq(tmbAssessmentResults.userId, userId),
        orderBy: desc(tmbAssessmentResults.createdAt),
      });
      if (!result) notFound("Belum ada hasil — selesaikan kedua test dulu");

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
      return db.query.tmbAssessmentResults.findMany({
        where: eq(tmbAssessmentResults.userId, userId),
        orderBy: desc(tmbAssessmentResults.createdAt),
        limit: 10,
      });
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
        summary =
          `Kode minatmu **${result?.hollandCode}** menunjukkan kombinasi unik. Rekomendasi terbaikmu: ` +
          recommendations
            .filter((r) => r.type === "major")
            .slice(0, 3)
            .map((r) => r.itemName)
            .join(", ") +
          ". Terus eksplorasi dan jangan takut mencoba hal baru! 🎉";
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

function parseCsv(text: string): string[][] {
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

export const tmbAdminRouter = {
  batches: {
    list: protectedProcedure.handler(async ({ context }) => {
      return db.query.tmbBatches.findMany({
        where: eq(tmbBatches.schoolId, context.session.user.id),
        orderBy: desc(tmbBatches.createdAt),
      });
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          className: z.string().optional(),
          major: z.string().optional(),
          graduationYear: z.number().int().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const id = randomUUID();
        await db.insert(tmbBatches).values({ id, schoolId: context.session.user.id, ...input });
        return { id };
      }),

    get: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
      const batch = await db.query.tmbBatches.findFirst({
        where: and(eq(tmbBatches.id, input.id), eq(tmbBatches.schoolId, context.session.user.id)),
      });
      if (!batch) notFound("Batch tidak ditemukan");
      const students = await db.query.tmbBatchStudents.findMany({
        where: eq(tmbBatchStudents.batchId, input.id),
        orderBy: asc(tmbBatchStudents.createdAt),
      });
      return { batch, students };
    }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
      await db
        .delete(tmbBatches)
        .where(and(eq(tmbBatches.id, input.id), eq(tmbBatches.schoolId, context.session.user.id)));
      return { success: true };
    }),
  },

  students: {
    add: protectedProcedure
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
          name: input.name,
          email: input.email || null,
          nis: input.nis || null,
        });
        return { id };
      }),

    remove: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      await db.delete(tmbBatchStudents).where(eq(tmbBatchStudents.id, input.id));
      return { success: true };
    }),

    detail: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
      const student = await db.query.tmbBatchStudents.findFirst({ where: eq(tmbBatchStudents.id, input.id) });
      if (!student) notFound("Siswa tidak ditemukan");
      let result = null;
      if (student.resultId) {
        const [r, recommendations, summary] = await Promise.all([
          db.query.tmbAssessmentResults.findFirst({ where: eq(tmbAssessmentResults.id, student.resultId) }),
          db.query.tmbRecommendations.findMany({
            where: eq(tmbRecommendations.resultId, student.resultId!),
            orderBy: asc(tmbRecommendations.rank),
          }),
          db.query.tmbAiSummaries.findFirst({ where: eq(tmbAiSummaries.resultId, student.resultId!) }),
        ]);
        result = { result: r, recommendations, summary: summary?.content ?? null };
      }
      return { student, result };
    }),

    import: protectedProcedure
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
          email: idxEmail >= 0 ? (r[idxEmail] ?? "").trim() || null : null,
          nis: idxNis >= 0 ? (r[idxNis] ?? "").trim() || null : null,
        }));
        const valid = values.filter((v) => v.name);
        if (valid.length === 0) preconditionFailed("Tidak ada data valid");

        await db.insert(tmbBatchStudents).values(valid);
        return { imported: valid.length, totalRows: rows.length - 1 };
      }),

    invite: protectedProcedure
      .input(z.object({ studentIds: z.array(z.string()).min(1) }))
      .handler(async ({ input }) => {
        const results: { id: string; name: string; link: string; qr: string | null }[] = [];
        for (const sid of input.studentIds) {
          const student = await db.query.tmbBatchStudents.findFirst({ where: eq(tmbBatchStudents.id, sid) });
          if (!student) continue;

          let inv = await db.query.tmbInvitations.findFirst({ where: eq(tmbInvitations.batchStudentId, sid) });
          if (!inv) {
            const token = randomUUID().replace(/-/g, "");
            const id = randomUUID();
            await db.insert(tmbInvitations).values({
              id,
              batchStudentId: sid,
              linkToken: token,
              expiresAt: new Date(Date.now() + 30 * 24 * 3600_000),
            });
            inv = { id, batchStudentId: sid, linkToken: token, qrUrl: null, sentAt: null, expiresAt: null } as any;
          }

          // link relatif — frontend yang menempelkan origin (biar benar di dev & prod)
          const link = `/tmb-invite/${inv?.linkToken}`;
          results.push({ id: student.id, name: student.name, link, qr: null });
        }
        return { results };
      }),

    exportRekap: protectedProcedure.input(z.object({ batchId: z.string() })).handler(async ({ input }) => {
      const students = await db.query.tmbBatchStudents.findMany({ where: eq(tmbBatchStudents.batchId, input.batchId) });
      const rows: any[] = [];
      for (const s of students) {
        let holland = "";
        let confidence = "";
        let topMajors: string[] = [];
        if (s.resultId) {
          const [r, recos] = await Promise.all([
            db.query.tmbAssessmentResults.findFirst({ where: eq(tmbAssessmentResults.id, s.resultId) }),
            db.query.tmbRecommendations.findMany({
              where: eq(tmbRecommendations.resultId, s.resultId!),
              orderBy: asc(tmbRecommendations.rank),
            }),
          ]);
          holland = r?.hollandCode ?? "";
          confidence = r?.confidenceScore ?? "";
          topMajors = recos
            .filter((x) => x.type === "major")
            .slice(0, 3)
            .map((x) => x.itemName);
        }
        rows.push({
          nama: s.name,
          email: s.email ?? "",
          nis: s.nis ?? "",
          status: s.status,
          hollandCode: holland,
          confidence: confidence,
          topMajors: topMajors.join(", "),
        });
      }
      return { rows };
    }),
  },

  analytics: protectedProcedure.input(z.object({ batchId: z.string() })).handler(async ({ input }) => {
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
      const [r, recos] = await Promise.all([
        db.query.tmbAssessmentResults.findFirst({ where: eq(tmbAssessmentResults.id, s.resultId) }),
        db.query.tmbRecommendations.findMany({
          where: eq(tmbRecommendations.resultId, s.resultId!),
          orderBy: asc(tmbRecommendations.rank),
        }),
      ]);
      if (r?.hollandCode) {
        const primary = r.hollandCode[0]!;
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
};

// ─── Guest flow (siswa B2B via undangan) ─────────────────

function resolveGuest(token: string) {
  return {
    async student() {
      const inv = await db.query.tmbInvitations.findFirst({ where: eq(tmbInvitations.linkToken, token) });
      if (!inv) return null;
      if (inv.expiresAt && inv.expiresAt < new Date()) return null;
      const student = await db.query.tmbBatchStudents.findFirst({ where: eq(tmbBatchStudents.id, inv.batchStudentId) });
      return student;
    },
  };
}

export const tmbGuestRouter = {
  start: publicProcedure
    .input(z.object({ token: z.string(), testCode: z.enum(["interest", "ability"]) }))
    .handler(async ({ input }) => {
      const student = await resolveGuest(input.token).student();
      if (!student) notFound("Undangan tidak valid atau sudah kedaluwarsa");
      const guestId = `guest-${student.id}`;

      const existing = await db.query.tmbTestAttempts.findFirst({
        where: and(
          eq(tmbTestAttempts.userId, guestId),
          eq(tmbTestAttempts.testCode, input.testCode),
          eq(tmbTestAttempts.status, "in_progress"),
        ),
      });
      if (existing)
        return {
          attemptId: existing.id,
          total: existing.currentQuestion,
          current: existing.currentQuestion,
          resumed: true,
        };

      const id = randomUUID();
      await db.insert(tmbTestAttempts).values({ id, userId: guestId, testCode: input.testCode });
      return { attemptId: id, total: 10, current: 0, resumed: false };
    }),

  question: publicProcedure.input(z.object({ attemptId: z.string() })).handler(async ({ input }) => {
    const attempt = await db.query.tmbTestAttempts.findFirst({ where: eq(tmbTestAttempts.id, input.attemptId) });
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

  answer: publicProcedure
    .input(z.object({ attemptId: z.string(), questionId: z.string(), selectedOption: z.string() }))
    .handler(async ({ input }) => {
      const attempt = await db.query.tmbTestAttempts.findFirst({ where: eq(tmbTestAttempts.id, input.attemptId) });
      if (!attempt || attempt.status === "completed") preconditionFailed("Test sudah selesai");
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

  finish: publicProcedure.input(z.object({ token: z.string(), attemptId: z.string() })).handler(async ({ input }) => {
    const student = await resolveGuest(input.token).student();
    if (!student) notFound("Undangan tidak valid");
    const guestId = `guest-${student.id}`;
    const attempt = await db.query.tmbTestAttempts.findFirst({
      where: and(eq(tmbTestAttempts.id, input.attemptId), eq(tmbTestAttempts.userId, guestId)),
    });
    if (!attempt) notFound("Attempt tidak ditemukan");

    const answers = await db.query.tmbTestAnswers.findMany({
      where: eq(tmbTestAnswers.attemptId, attempt.id),
      with: { question: true },
    });
    if (answers.length === 0) preconditionFailed("Belum ada jawaban");
    await db
      .update(tmbTestAttempts)
      .set({ status: "completed", finishedAt: new Date() })
      .where(eq(tmbTestAttempts.id, attempt.id));

    const otherCode = attempt.testCode === "interest" ? "ability" : "interest";
    const otherAttempt = await db.query.tmbTestAttempts.findFirst({
      where: and(
        eq(tmbTestAttempts.userId, guestId),
        eq(tmbTestAttempts.testCode, otherCode),
        eq(tmbTestAttempts.status, "completed"),
      ),
    });
    await db
      .update(tmbBatchStudents)
      .set({ status: otherAttempt ? "completed" : "in_progress" })
      .where(eq(tmbBatchStudents.id, student.id));

    if (!otherAttempt) return { resultId: null, bothDone: false };

    const interestAttempt = attempt.testCode === "interest" ? attempt : otherAttempt;
    const abilityAttempt = attempt.testCode === "ability" ? attempt : otherAttempt;
    const resultId = await computeResult(guestId, interestAttempt.id, abilityAttempt.id);
    await db.update(tmbBatchStudents).set({ resultId, status: "completed" }).where(eq(tmbBatchStudents.id, student.id));
    return { resultId, bothDone: true };
  }),

  result: publicProcedure.input(z.object({ token: z.string() })).handler(async ({ input }) => {
    const student = await resolveGuest(input.token).student();
    if (!student?.resultId) notFound("Belum ada hasil");
    const result = await db.query.tmbAssessmentResults.findFirst({
      where: eq(tmbAssessmentResults.id, student.resultId),
    });
    const [recommendations, summary] = await Promise.all([
      db.query.tmbRecommendations.findMany({
        where: eq(tmbRecommendations.resultId, student.resultId!),
        orderBy: asc(tmbRecommendations.rank),
      }),
      db.query.tmbAiSummaries.findFirst({ where: eq(tmbAiSummaries.resultId, student.resultId!) }),
    ]);
    return { student: { name: student.name }, result, recommendations, summary: summary?.content ?? null };
  }),
};

export const tmbScoring = { computeHolland, computeAbility, computeRecommendations };
