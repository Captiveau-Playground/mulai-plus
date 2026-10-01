import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * Assessment Engine — model generik (Fase 0).
 * Melayani Discover™ (minat/RIASEC) & Talent™ (bakat/Thurstone).
 * Terpisah dari tabel legacy tmb_* — tidak mengganggu alur saat ini.
 */

// ─── Enums ─────────────────────────────────────────────

export const assessmentVersionStatusEnum = pgEnum("assessment_version_status", [
  "draft",
  "preview",
  "validate",
  "live",
  "archived",
]);

export const assessmentContentTypeEnum = pgEnum("assessment_content_type", ["description", "bullet_list", "cards"]);

export const assessmentQuestionTypeEnum = pgEnum("assessment_question_type", ["multiple_choice", "text_input"]);

export const assessmentPresentationModeEnum = pgEnum("assessment_presentation_mode", [
  "standard_option_card",
  "icon_option",
  "image_option",
  "emoji_option",
  "visual_comparison",
]);

export const assessmentMediaPositionEnum = pgEnum("assessment_media_position", ["above_text", "below_text", "side_by_side"]);

export const assessmentScoringMethodEnum = pgEnum("assessment_scoring_method", ["sum", "average", "weighted"]);

export const assessmentSessionStatusEnum = pgEnum("assessment_session_status", [
  "in_progress",
  "paused",
  "completed",
  "timeout",
]);

export const assessmentTimerScopeEnum = pgEnum("assessment_timer_scope", ["dimension", "question", "none"]);

export const assessmentTextEvalEnum = pgEnum("assessment_text_eval", [
  "exact_match",
  "numeric_tolerance",
  "keyword_match",
  "pattern_match",
]);

export const assessmentScoringAggEnum = pgEnum("assessment_scoring_agg", ["correct", "weight", "time"]);

// ─── Master akar ───────────────────────────────────────

export const assessments = pgTable("assessments", {
  id: varchar("id", { length: 24 }).primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  defaultConfigJson: jsonb("default_config_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assessmentVersions = pgTable(
  "assessment_versions",
  {
    id: varchar("id", { length: 24 }).primaryKey(),
    assessmentId: varchar("assessment_id", { length: 24 })
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull().default(1),
    status: assessmentVersionStatusEnum("status").notNull().default("draft"),
    configJson: jsonb("config_json").notNull(), // { total_dim, result_dim_count, min_q_per_dim, randomize_q, randomize_a, timer_enabled, timer_scope, allow_pause, scoring_method }
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_assessment_versions_uniq").on(table.assessmentId, table.versionNumber),
    index("idx_assessment_versions_status").on(table.status),
  ],
);

// ─── Conten (per versi) ────────────────────────────────

export const assessmentSections = pgTable("assessment_sections", {
  id: varchar("id", { length: 24 }).primaryKey(),
  versionId: varchar("version_id", { length: 24 })
    .notNull()
    .references(() => assessmentVersions.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  contentType: assessmentContentTypeEnum("content_type").notNull().default("description"),
  contentJson: jsonb("content_json").notNull().default({}),
  displayOrder: integer("display_order").notNull().default(0),
  visibility: boolean("visibility").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assessmentDimensions = pgTable("assessment_dimensions", {
  id: varchar("id", { length: 24 }).primaryKey(),
  versionId: varchar("version_id", { length: 24 })
    .notNull()
    .references(() => assessmentVersions.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull(), // R/I/A/S/E/C | NUM/VER/SPA…
  name: varchar("name", { length: 80 }).notNull(),
  shortName: varchar("short_name", { length: 40 }),
  description: text("description"),
  iconUrl: text("icon_url"),
  durationSeconds: integer("duration_seconds"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dimensionInstructions = pgTable("dimension_instructions", {
  id: varchar("id", { length: 24 }).primaryKey(),
  dimensionId: varchar("dimension_id", { length: 24 })
    .notNull()
    .references(() => assessmentDimensions.id, { onDelete: "cascade" }),
  header: varchar("header", { length: 200 }),
  contentType: assessmentContentTypeEnum("content_type").notNull().default("description"),
  contentJson: jsonb("content_json").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Answer scale (global reusable) ────────────────────

export const answerScales = pgTable("answer_scales", {
  id: varchar("id", { length: 24 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const answerScaleOptions = pgTable("answer_scale_options", {
  id: varchar("id", { length: 24 }).primaryKey(),
  scaleId: varchar("scale_id", { length: 24 })
    .notNull()
    .references(() => answerScales.id, { onDelete: "cascade" }),
  value: varchar("value", { length: 20 }).notNull(), // internal
  score: integer("score").notNull().default(0), // bobot perhitungan
  label: text("label").notNull(), // teks UI / LaTeX
  hasMathNotation: boolean("has_math_notation").notNull().default(false),
  icon: text("icon"), // emoji / ikon
  imageUrl: text("image_url"),
  displayOrder: integer("display_order").notNull().default(0),
});

// ─── Question bank (multi-format, kolom siap utk Fase 2) ──

export const questions = pgTable(
  "questions",
  {
    id: varchar("id", { length: 24 }).primaryKey(),
    versionId: varchar("version_id", { length: 24 })
      .notNull()
      .references(() => assessmentVersions.id, { onDelete: "cascade" }),
    dimensionId: varchar("dimension_id", { length: 24 }).notNull(),
    scaleId: varchar("scale_id", { length: 24 }),
    questionCode: varchar("question_code", { length: 40 }),
    questionText: text("question_text").notNull(), // HTML/LaTeX
    hasMathNotation: boolean("has_math_notation").notNull().default(false),
    mediaUrl: text("media_url"),
    mediaType: varchar("media_type", { length: 20 }),
    mediaCaption: text("media_caption"),
    mediaPosition: assessmentMediaPositionEnum("media_position"),
    altText: text("alt_text"),
    questionType: assessmentQuestionTypeEnum("question_type").notNull().default("multiple_choice"),
    presentationMode: assessmentPresentationModeEnum("presentation_mode").notNull().default("standard_option_card"),
    weight: integer("weight").notNull().default(1),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_questions_version_dim").on(table.versionId, table.dimensionId),
  ],
);

export const questionOptions = pgTable("question_options", {
  id: varchar("id", { length: 24 }).primaryKey(),
  questionId: varchar("question_id", { length: 24 })
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  optionValue: varchar("option_value", { length: 20 }).notNull(), // OPT_A
  targetDimension: varchar("target_dimension", { length: 24 }), // dimension yg di-scoring (mendukung pair/reverse)
  label: text("label").notNull(), // HTML/LaTeX
  hasMathNotation: boolean("has_math_notation").notNull().default(false),
  imageUrl: text("image_url"),
  imageCaption: text("image_caption"),
  score: integer("score").notNull().default(0),
  displayOrder: integer("display_order").notNull().default(0),
});

export const textInputConfigs = pgTable("text_input_configs", {
  id: varchar("id", { length: 24 }).primaryKey(),
  questionId: varchar("question_id", { length: 24 })
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  evaluationType: assessmentTextEvalEnum("evaluation_type").notNull().default("exact_match"),
  answerKey: text("answer_key").notNull(),
  numericTolerance: text("numeric_tolerance"), // "0.01" — simpan sbg string agar ringan; parse di evaluator
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Sesi & hasil siswa ────────────────────────────────

export const assessmentSessions = pgTable(
  "assessment_sessions",
  {
    id: varchar("id", { length: 24 }).primaryKey(),
    studentId: text("student_id").notNull(), // user_id atau guest-<batch_student_id>
    versionId: varchar("version_id", { length: 24 })
      .notNull()
      .references(() => assessmentVersions.id),
    status: assessmentSessionStatusEnum("status").notNull().default("in_progress"),
    currentDimensionId: varchar("current_dimension_id", { length: 24 }),
    configJson: jsonb("config_json"), // snapshot config utk anti-tamper
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [index("idx_ass_sessions_student").on(table.studentId)],
);

export const assessmentAnswers = pgTable(
  "assessment_answers",
  {
    id: varchar("id", { length: 24 }).primaryKey(),
    sessionId: varchar("session_id", { length: 24 })
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: "cascade" }),
    questionId: varchar("question_id", { length: 24 })
      .notNull()
      .references(() => questions.id),
    selectedOptionId: varchar("selected_option_id", { length: 24 }),
    textAnswer: text("text_answer"),
    scoreEarned: integer("score_earned"),
    answeredAt: timestamp("answered_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_ass_answers_session_question").on(table.sessionId, table.questionId)],
);

export const assessmentDimensionScores = pgTable("assessment_dimension_scores", {
  id: varchar("id", { length: 24 }).primaryKey(),
  sessionId: varchar("session_id", { length: 24 })
    .notNull()
    .references(() => assessmentSessions.id, { onDelete: "cascade" }),
  dimensionId: varchar("dimension_id", { length: 24 }).notNull(),
  totalScore: integer("total_score").notNull().default(0),
  rank: integer("rank"),
  completionTimeSeconds: integer("completion_time_seconds"),
  accuracyRate: jsonb("accuracy_rate"),
});

export const assessmentResults = pgTable("assessment_results", {
  id: varchar("id", { length: 24 }).primaryKey(),
  sessionId: varchar("session_id", { length: 24 })
    .notNull()
    .references(() => assessmentSessions.id, { onDelete: "cascade" }),
  profileCode: varchar("profile_code", { length: 40 }), // misal "S-I-A"
  topDimensionsJson: jsonb("top_dimensions_json"),
  rawScoresJson: jsonb("raw_scores_json"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});