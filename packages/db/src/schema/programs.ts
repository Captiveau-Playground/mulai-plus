import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const program = pgTable("program", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  durationWeeks: integer("duration_weeks").default(0).notNull(),
  quota: integer("quota").default(0).notNull(),
  status: text("status").default("draft").notNull(), // draft | open | running | completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
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
  mentorId: text("mentor_id").references(() => user.id),
  datetime: timestamp("datetime").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Relations
export const programRelations = relations(program, ({ many }) => ({
  syllabus: many(programSyllabus),
  mentors: many(programMentor),
  applications: many(programApplication),
  participants: many(programParticipant),
  sessions: many(programSession),
}));

export const programSyllabusRelations = relations(programSyllabus, ({ one }) => ({
  program: one(program, {
    fields: [programSyllabus.programId],
    references: [program.id],
  }),
}));

export const programMentorRelations = relations(programMentor, ({ one }) => ({
  program: one(program, {
    fields: [programMentor.programId],
    references: [program.id],
  }),
  user: one(user, {
    fields: [programMentor.userId],
    references: [user.id],
  }),
}));

export const programApplicationRelations = relations(programApplication, ({ one }) => ({
  program: one(program, {
    fields: [programApplication.programId],
    references: [program.id],
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
  user: one(user, {
    fields: [programParticipant.userId],
    references: [user.id],
  }),
}));
