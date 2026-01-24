import { relations, sql } from "drizzle-orm";
import { check, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "excused"]);

export const program = pgTable("program", {
  id: text("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  bannerUrl: text("banner_url"),
  registrationForm: jsonb("registration_form"), // Form definition for applicants
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const programBatch = pgTable("program_batch", {
  id: text("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => program.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "Batch 1 - Jan 2024"
  bannerUrl: text("banner_url"),
  durationWeeks: integer("duration_weeks").default(0).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  registrationStartDate: timestamp("registration_start_date").notNull(),
  registrationEndDate: timestamp("registration_end_date").notNull(),
  verificationStartDate: timestamp("verification_start_date"),
  verificationEndDate: timestamp("verification_end_date"),
  assessmentStartDate: timestamp("assessment_start_date"),
  assessmentEndDate: timestamp("assessment_end_date"),
  announcementDate: timestamp("announcement_date"),
  onboardingDate: timestamp("onboarding_date"),
  quota: integer("quota").default(0).notNull(),
  status: text("status").default("upcoming").notNull(), // upcoming | open | closed | running | completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const programFaq = pgTable("program_faq", {
  id: text("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => program.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const programBenefit = pgTable("program_benefit", {
  id: text("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => program.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"), // Lucide icon name
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const programSyllabus = pgTable("program_syllabus", {
  id: text("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => program.id, { onDelete: "cascade" }),
  week: integer("week").notNull(),
  title: text("title").notNull(),
  outcome: text("outcome"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const programMentor = pgTable(
  "program_mentor",
  {
    programId: text("program_id")
      .notNull()
      .references(() => program.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: { columns: [t.programId, t.userId] },
  }),
);

export const programApplication = pgTable("program_application", {
  id: text("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => program.id, { onDelete: "cascade" }),
  batchId: text("batch_id").references(() => programBatch.id),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reflectiveAnswers: jsonb("reflective_answers"),
  status: text("status").default("applied").notNull(), // applied | accepted | rejected | waitlisted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const programParticipant = pgTable("program_participant", {
  id: text("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => program.id, { onDelete: "cascade" }),
  batchId: text("batch_id").references(() => programBatch.id),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").default("confirmed").notNull(), // confirmed | active | dropped | completed
  agreedAt: timestamp("agreed_at"), // Commitment gate
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const programSession = pgTable("program_session", {
  id: text("id").primaryKey(),
  programId: text("program_id")
    .notNull()
    .references(() => program.id, { onDelete: "cascade" }),
  batchId: text("batch_id").references(() => programBatch.id),
  mentorId: text("mentor_id").references(() => user.id),
  datetime: timestamp("datetime").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const programBatchMentor = pgTable(
  "program_batch_mentor",
  {
    batchId: text("batch_id")
      .notNull()
      .references(() => programBatch.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: { columns: [t.batchId, t.userId] },
  }),
);

export const programAttendance = pgTable(
  "program_attendance",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => programBatch.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    unq: { columns: [t.batchId, t.userId, t.week] },
    weekCheck: check("week_check", sql`${t.week} > 0`),
  }),
);

// Relations
export const programRelations = relations(program, ({ many }) => ({
  syllabus: many(programSyllabus),
  applications: many(programApplication),
  participants: many(programParticipant),
  sessions: many(programSession),
  batches: many(programBatch),
  faqs: many(programFaq),
  benefits: many(programBenefit),
}));

export const programBatchRelations = relations(programBatch, ({ one, many }) => ({
  program: one(program, {
    fields: [programBatch.programId],
    references: [program.id],
  }),
  participants: many(programParticipant),
  sessions: many(programSession),
  mentors: many(programBatchMentor),
  attendance: many(programAttendance),
}));

export const programFaqRelations = relations(programFaq, ({ one }) => ({
  program: one(program, {
    fields: [programFaq.programId],
    references: [program.id],
  }),
}));

export const programBenefitRelations = relations(programBenefit, ({ one }) => ({
  program: one(program, {
    fields: [programBenefit.programId],
    references: [program.id],
  }),
}));

export const programSyllabusRelations = relations(programSyllabus, ({ one }) => ({
  program: one(program, {
    fields: [programSyllabus.programId],
    references: [program.id],
  }),
}));

export const programBatchMentorRelations = relations(programBatchMentor, ({ one }) => ({
  batch: one(programBatch, {
    fields: [programBatchMentor.batchId],
    references: [programBatch.id],
  }),
  user: one(user, {
    fields: [programBatchMentor.userId],
    references: [user.id],
  }),
}));

export const programAttendanceRelations = relations(programAttendance, ({ one }) => ({
  batch: one(programBatch, {
    fields: [programAttendance.batchId],
    references: [programBatch.id],
  }),
  user: one(user, {
    fields: [programAttendance.userId],
    references: [user.id],
  }),
}));

export const programApplicationRelations = relations(programApplication, ({ one }) => ({
  program: one(program, {
    fields: [programApplication.programId],
    references: [program.id],
  }),
  batch: one(programBatch, {
    fields: [programApplication.batchId],
    references: [programBatch.id],
  }),
  user: one(user, {
    fields: [programApplication.userId],
    references: [user.id],
  }),
}));

export const programParticipantRelations = relations(programParticipant, ({ one }) => ({
  program: one(program, {
    fields: [programParticipant.programId],
    references: [program.id],
  }),
  batch: one(programBatch, {
    fields: [programParticipant.batchId],
    references: [programBatch.id],
  }),
  user: one(user, {
    fields: [programParticipant.userId],
    references: [user.id],
  }),
}));
