import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

// ─── Enums ─────────────────────────────────────────────

export const tmbTestCodeEnum = pgEnum("tmb_test_code", ["interest", "ability"]);
export const tmbAttemptStatusEnum = pgEnum("tmb_attempt_status", ["in_progress", "completed"]);
export const tmbRecoTypeEnum = pgEnum("tmb_reco_type", ["major", "career"]);
export const tmbBatchStudentStatusEnum = pgEnum("tmb_batch_student_status", ["invited", "in_progress", "completed"]);

// ─── Profil siswa ──────────────────────────────────────

export const tmbProfiles = pgTable("tmb_profiles", {
  userId: text("user_id").primaryKey(), // user_id atau guest-<batch_student_id>
  gender: text("gender"),
  birthDate: text("birth_date"),
  educationLevel: text("education_level"), // SMA / Mahasiswa / Fresh Graduate / Umum
  schoolName: text("school_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Katalog test & bank soal ──────────────────────────

export const tmbTestCatalog = pgTable("tmb_test_catalog", {
  id: text("id").primaryKey(),
  code: tmbTestCodeEnum("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  totalQuestions: integer("total_questions").notNull().default(0),
  xpReward: integer("xp_reward").notNull().default(50),
  isActive: boolean("is_active").notNull().default(true),
});

export const tmbQuestionBank = pgTable(
  "tmb_question_bank",
  {
    id: text("id").primaryKey(),
    testCode: tmbTestCodeEnum("test_code").notNull(),
    dimension: text("dimension").notNull(), // R/I/A/S/E/C | numerical/verbal/logical/spatial/clerical
    pairDimension: text("pair_dimension"), // untuk interest (dimensi lawan)
    text: text("text").notNull(),
    optionA: text("option_a").notNull(),
    optionB: text("option_b").notNull(),
    optionC: text("option_c"), // ability MC
    optionD: text("option_d"), // ability MC
    answer: text("answer"), // ability: A/B/C/D
    order: integer("order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [index("idx_tmb_q_test").on(table.testCode)],
);

// ─── Attempt & jawaban ─────────────────────────────────

export const tmbTestAttempts = pgTable(
  "tmb_test_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(), // user_id atau guest-<batch_student_id>
    testCode: tmbTestCodeEnum("test_code").notNull(),
    status: tmbAttemptStatusEnum("status").notNull().default("in_progress"),
    currentQuestion: integer("current_question").notNull().default(0),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [index("idx_tmb_attempt_user").on(table.userId)],
);

export const tmbTestAnswers = pgTable(
  "tmb_test_answers",
  {
    id: text("id").primaryKey(),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => tmbTestAttempts.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => tmbQuestionBank.id, { onDelete: "cascade" }),
    selectedOption: text("selected_option").notNull(), // A/B/C/D
    isCorrect: boolean("is_correct"),
    answeredAt: timestamp("answered_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_tmb_ans_attempt_question").on(table.attemptId, table.questionId)],
);

// ─── Hasil & rekomendasi ───────────────────────────────

export const tmbAssessmentResults = pgTable("tmb_assessment_results", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(), // user_id atau guest-<batch_student_id>
  attemptInterestId: text("attempt_interest_id").references(() => tmbTestAttempts.id),
  attemptAbilityId: text("attempt_ability_id").references(() => tmbTestAttempts.id),
  hollandCode: text("holland_code"),
  hollandScores: jsonb("holland_scores"), // { R: 4, I: 3, ... }
  abilityScores: jsonb("ability_scores"), // { numerical: { correct: 2, total: 2 }, ... }
  differentiation: text("differentiation"), // strong / moderate / weak
  confidenceScore: text("confidence_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tmbRecommendations = pgTable("tmb_recommendations", {
  id: text("id").primaryKey(),
  resultId: text("result_id")
    .notNull()
    .references(() => tmbAssessmentResults.id, { onDelete: "cascade" }),
  type: tmbRecoTypeEnum("type").notNull(),
  rank: integer("rank").notNull(),
  itemName: text("item_name").notNull(), // kategori jurusan / nama karier
  categoryKey: text("category_key"), // untuk jurusan
  confidence: text("confidence"),
  prodiRefs: jsonb("prodi_refs"), // [{ prodi, level, university, link }]
});

export const tmbAiSummaries = pgTable("tmb_ai_summaries", {
  id: text("id").primaryKey(),
  resultId: text("result_id")
    .notNull()
    .references(() => tmbAssessmentResults.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  model: text("model"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Gamifikasi ────────────────────────────────────────

export const tmbUserStats = pgTable("tmb_user_stats", {
  userId: text("user_id").primaryKey(), // user_id atau guest-<batch_student_id>
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streak: integer("streak").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at"),
  testsCompleted: integer("tests_completed").notNull().default(0),
});

export const tmbAchievements = pgTable("tmb_achievements", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(), // user_id atau guest-<batch_student_id>
  code: text("code").notNull(), // first_test / both_tests / streak_3 / retake / perfect_ability
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
});

// ─── Seed: mapping kategori jurusan → Holland/ability ──

export const tmbMajorPatterns = pgTable("tmb_major_patterns", {
  id: text("id").primaryKey(),
  categoryKey: text("category_key").notNull().unique(), // "kedokteran", "teknik-informatika", ...
  categoryName: text("category_name").notNull(),
  pattern: text("pattern").notNull(), // regex pada nama prodi
  hollandPrimary: text("holland_primary").notNull(), // I
  hollandSecondary: text("holland_secondary").notNull(), // S
  abilityWeights: jsonb("ability_weights").notNull(), // { numerical: 1, logical: 1, verbal: 0.5, spatial: 0, clerical: 0 }
  isActive: boolean("is_active").notNull().default(true),
});

export const tmbCareerMappings = pgTable("tmb_career_mappings", {
  id: text("id").primaryKey(),
  majorCategory: text("major_category").notNull(),
  careerName: text("career_name").notNull(),
});

// ─── B2B ───────────────────────────────────────────────

export const tmbSchoolStatusEnum = pgEnum("tmb_school_status", ["prospek", "aktif", "selesai"]);

export const tmbSchools = pgTable("tmb_schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  city: text("city"),
  status: tmbSchoolStatusEnum("status").notNull().default("prospek"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tmbBatches = pgTable("tmb_batches", {
  id: text("id").primaryKey(),
  schoolId: text("school_id")
    .notNull()
    .references(() => tmbSchools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  className: text("class_name"),
  major: text("major"), // IPA / IPS / Bahasa / SMK
  graduationYear: integer("graduation_year"),
  inviteCode: text("invite_code").unique(), // 1 kode untuk seluruh batch
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tmbBatchStudents = pgTable(
  "tmb_batch_students",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => tmbBatches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    nis: text("nis"),
    gender: text("gender"),
    status: tmbBatchStudentStatusEnum("status").notNull().default("invited"),
    userId: text("user_id"), // akun student yang meng-klaim undangan (wajib login)
    resultId: text("result_id").references(() => tmbAssessmentResults.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_tmb_batch_students_batch").on(table.batchId)],
);

// ─── Relations ─────────────────────────────────────────

import { relations } from "drizzle-orm";

export const tmbAssessmentResultsRelations = relations(tmbAssessmentResults, ({ many }) => ({
  recommendations: many(tmbRecommendations),
}));

export const tmbRecommendationsRelations = relations(tmbRecommendations, ({ one }) => ({
  result: one(tmbAssessmentResults, {
    fields: [tmbRecommendations.resultId],
    references: [tmbAssessmentResults.id],
  }),
}));

export const tmbTestAttemptsRelations = relations(tmbTestAttempts, ({ one, many }) => ({
  user: one(user, {
    fields: [tmbTestAttempts.userId],
    references: [user.id],
  }),
  answers: many(tmbTestAnswers),
}));

export const tmbTestAnswersRelations = relations(tmbTestAnswers, ({ one }) => ({
  attempt: one(tmbTestAttempts, {
    fields: [tmbTestAnswers.attemptId],
    references: [tmbTestAttempts.id],
  }),
  question: one(tmbQuestionBank, {
    fields: [tmbTestAnswers.questionId],
    references: [tmbQuestionBank.id],
  }),
}));

export const tmbQuestionBankRelations = relations(tmbQuestionBank, ({ many }) => ({
  answers: many(tmbTestAnswers),
}));
