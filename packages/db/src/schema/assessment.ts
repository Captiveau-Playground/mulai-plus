import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

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

export const assessmentQuestionTypeEnum = pgEnum("assessment_question_type", [
  "multiple_choice",
  "text_input",
  "likert",
]);

export const assessmentPresentationModeEnum = pgEnum("assessment_presentation_mode", [
  "standard_option_card",
  "icon_option",
  "image_option",
  "emoji_option",
  "visual_comparison",
]);

export const assessmentMediaPositionEnum = pgEnum("assessment_media_position", [
  "above_text",
  "below_text",
  "side_by_side",
]);

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
  family: varchar("family", { length: 20 }), // B2C: minat | bakat — hanya satu LIVE per keluarga
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
  /** Timer per dimensi: null = ikut config global | "none" | "dimension" | "question" */
  timerScope: text("timer_scope"),
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
    durationSeconds: integer("duration_seconds"), // timer per SOAL (scope question) — null = pakai default
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_questions_version_dim").on(table.versionId, table.dimensionId)],
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
  icon: text("icon"), // emoji / ikon utk mode emoji_option
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
      .references(() => assessmentVersions.id, { onDelete: "cascade" }),
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
  xpEarned: integer("xp_earned").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  timedOut: boolean("timed_out").notNull().default(false),
  profileCode: varchar("profile_code", { length: 40 }), // misal "S-I-A"
  topDimensionsJson: jsonb("top_dimensions_json"),
  rawScoresJson: jsonb("raw_scores_json"),
  recommendationsJson: jsonb("recommendations_json"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// ─── B2B: Organisasi (sekolah/institusi) & anggotanya ──────────────────

export const assessmentOrgStatusEnum = pgEnum("assessment_org_status", ["pending", "aktif", "ditolak", "nonaktif"]);
export const assessmentOrgMemberRoleEnum = pgEnum("assessment_org_member_role", ["school_admin", "school_viewer"]);
export const assessmentOrgMemberStatusEnum = pgEnum("assessment_org_member_status", ["pending", "aktif", "ditolak"]);

/**
 * Sekolah/institusi pemakai kanal B2B. Dibuat saat admin sekolah mendaftar
 * (status `pending`), diaktifkan setelah disetujui admin MULAI+.
 */
export const assessmentOrgs = pgTable(
  "assessment_orgs",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").default("sekolah").notNull(), // sekolah | kampus | bimbel | korporat
    npsn: text("npsn"),
    // (M4.3) kode rujukan sekolah (referral antar sekolah)
    referralCode: text("referral_code"),
    referredByOrgId: text("referred_by_org_id"),
    city: text("city"),
    address: text("address"),
    picName: text("pic_name"),
    picPosition: text("pic_position"), // jabatan: staff BK, wakil kepala sekolah, dst.
    picPhone: text("pic_phone"),
    picEmail: text("pic_email"),
    status: assessmentOrgStatusEnum("status").default("pending").notNull(),
    /**
     * Jembatan ke tabel sekolah legacy (`tmb_schools`) yang menampung batch/roster
     * yang dipakai halaman admin saat ini. Diisi otomatis saat pendaftaran disetujui
     * (dibuatkan bila belum ada) supaya admin sekolah langsung bisa melihat datanya.
     */
    schoolId: text("school_id"),
    note: text("note"), // catatan saat disetujui / alasan ditolak
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [index("idx_assessment_orgs_status").on(t.status)],
);

/**
 * Anggota organisasi (admin sekolah / guru BK).
 * Satu akun hanya boleh terikat ke satu organisasi pada fase ini supaya
 * "sekolah mana yang saya lihat" tidak ambigu (multi-sekolah = pengembangan lanjut).
 */
/**
 * (M3.3) Snapshot laporan insight kelas — disimpan saat sekolah menekan
 * "Simpan laporan" agar angka yang dilaporkan ke yayasan tidak berubah
 * walaupun data peserta berubah setelahnya.
 */
/**
 * (M4.1) Undangan rekan sekolah (guru BK / wakil kepala). Diklaim otomatis saat
 * akun dengan email tersebut membuka portal sekolah.
 */
export const assessmentOrgInvites = pgTable(
  "assessment_org_invites",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => assessmentOrgs.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").default("school_viewer").notNull(),
    invitedBy: text("invited_by"),
    status: text("status").default("pending").notNull(), // pending | accepted | revoked
    createdAt: timestamp("created_at").defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at"),
  },
  (t) => [index("idx_assessment_org_invites_org").on(t.orgId)],
);

export const assessmentCohortReports = pgTable(
  "assessment_cohort_reports",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id").notNull(),
    orgId: text("org_id").notNull(), // assessment_orgs.id (tenant)
    schoolId: text("school_id"), // tmb_schools.id (jembatan legacy)
    createdBy: text("created_by"),
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    snapshot: jsonb("snapshot").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("assessment_cohort_reports_batch_idx").on(table.batchId),
    index("assessment_cohort_reports_org_idx").on(table.orgId),
    index("assessment_cohort_reports_school_idx").on(table.schoolId),
  ],
);

export const assessmentOrgMembers = pgTable(
  "assessment_org_members",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => assessmentOrgs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: assessmentOrgMemberRoleEnum("role").default("school_admin").notNull(),
    status: assessmentOrgMemberStatusEnum("status").default("pending").notNull(),
    invitedBy: text("invited_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("uq_assessment_org_members_user").on(t.userId),
    index("idx_assessment_org_members_org").on(t.orgId),
  ],
);
