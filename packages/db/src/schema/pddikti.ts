import { relations } from "drizzle-orm";
import { doublePrecision, index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────
// PDDIKTI DOMAIN
// ──────────────────────────────────────────────

export const universities = pgTable("universities", {
  idSp: text("id_sp").primaryKey(),
  code: text("code"),
  name: text("name").notNull(),
  shortName: text("short_name"),
  type: text("type"), // Negeri, Swasta, Agama, Kedinasan
  status: text("status"), // Aktif, Alih Bentuk, Tutup, etc.
  province: text("province"),
  regency: text("regency"),
  accreditation: text("accreditation"), // Unggul, Baik Sekali, Baik, etc.
  totalPrograms: integer("total_programs"),
  tuitionRange: text("tuition_range"),
});

export const universityDetails = pgTable("university_details", {
  idSp: text("id_sp")
    .primaryKey()
    .references(() => universities.idSp),
  detailId: text("detail_id"),
  groupName: text("group_name"), // Perguruan Tinggi Negeri/Swasta/Agama/etc
  supervisor: text("supervisor"), // LLDIKTI / PTA, etc.
  email: text("email"),
  phone: text("phone"),
  fax: text("fax"),
  website: text("website"),
  address: text("address"),
  postalCode: text("postal_code"),
  subdistrict: text("subdistrict"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  foundedDate: text("founded_date"),
  establishmentDecreeDate: text("establishment_decree_date"),
  establishmentDecree: text("establishment_decree"),
  accreditationStatus: text("accreditation_status"),
  accreditation: text("accreditation"),
});

export const studyPrograms = pgTable(
  "study_programs",
  {
    idSms: text("id_sms").primaryKey(),
    idSp: text("id_sp")
      .notNull()
      .references(() => universities.idSp),
    code: text("code"),
    name: text("name").notNull(),
    level: text("level"), // S1, D3, D4, S2, Profesi, etc.
    accreditation: text("accreditation"),
    status: text("status"), // Aktif, Tutup, Alih Bentuk, etc.
    lecturersNidn: integer("lecturers_nidn").default(0),
    lecturersNidk: integer("lecturers_nidk").default(0),
    totalLecturers: integer("total_lecturers").default(0),
    teachingLecturers: integer("teaching_lecturers").default(0),
    totalStudents: integer("total_students").default(0),
    ratio: text("ratio"),
    dataCompleteness: integer("data_completeness").default(0),
  },
  (table) => [index("idx_study_programs_id_sp").on(table.idSp), index("idx_study_programs_code").on(table.code)],
);

export const tuitionFees = pgTable("tuition_fees", {
  idSp: text("id_sp")
    .primaryKey()
    .references(() => universities.idSp),
  feeId: text("fee_id"),
  tuitionRange: text("tuition_range"),
});

export const studentStats = pgTable("student_stats", {
  idSp: text("id_sp")
    .primaryKey()
    .references(() => universities.idSp),
  studentStatsId: text("student_stats_id"),
  avgGraduates: doublePrecision("avg_graduates").default(0),
  avgNewStudents: doublePrecision("avg_new_students").default(0),
});

export const studyDurations = pgTable(
  "study_durations",
  {
    id: serial("id").primaryKey(),
    idSp: text("id_sp")
      .notNull()
      .references(() => universities.idSp),
    durationId: text("duration_id"),
    level: text("level"),
    avgDurationYears: doublePrecision("avg_duration_years"),
  },
  (table) => [index("idx_study_durations_id_sp").on(table.idSp)],
);

export const programCounts = pgTable("program_counts", {
  idSp: text("id_sp")
    .primaryKey()
    .references(() => universities.idSp),
  programCountId: text("program_count_id"),
  totalPrograms: integer("total_programs").default(0),
});

export const lecturerCounts = pgTable("lecturer_counts", {
  idSp: text("id_sp")
    .primaryKey()
    .references(() => universities.idSp),
  lecturerCountId: text("lecturer_count_id"),
  totalLecturers: integer("total_lecturers").default(0),
});

export const graduationRates = pgTable("graduation_rates", {
  idSp: text("id_sp")
    .primaryKey()
    .references(() => universities.idSp),
  gradRateId: text("grad_rate_id"),
  graduationRate: doublePrecision("graduation_rate"),
});

export const nameHistories = pgTable("name_histories", {
  id: serial("id").primaryKey(),
  idSp: text("id_sp")
    .notNull()
    .references(() => universities.idSp),
  oldName: text("old_name"),
  yearChanged: integer("year_changed"),
});

// ──────────────────────────────────────────────
// SNPMB DOMAIN
// ──────────────────────────────────────────────

export const snpmbUniversities = pgTable("snpmb_universities", {
  idPtn: integer("id_ptn").primaryKey(),
  code: integer("code"),
  name: text("name").notNull(),
  province: text("province"),
  type: text("type"), // PTN Akademik / PTN Vokasi / PTKIN
  isPtnbh: integer("is_ptnbh").default(0),
  website: text("website"),
  address: text("address"),
});

export const snbpPrograms = pgTable(
  "snbp_programs",
  {
    idProdi: integer("id_prodi").primaryKey(),
    idPtn: integer("id_ptn")
      .notNull()
      .references(() => snpmbUniversities.idPtn),
    code: integer("code"),
    name: text("name").notNull(),
    level: text("level"),
    portfolioCode: integer("portfolio_code").default(0),
    portfolioName: text("portfolio_name"),
    capacity: integer("capacity"),
    isNew: integer("is_new").default(0),
  },
  (table) => [index("idx_snbp_programs_id_ptn").on(table.idPtn)],
);

export const snbtPrograms = pgTable(
  "snbt_programs",
  {
    idProdi: integer("id_prodi").primaryKey(),
    idPtn: integer("id_ptn")
      .notNull()
      .references(() => snpmbUniversities.idPtn),
    code: integer("code"),
    name: text("name").notNull(),
    level: text("level"),
    portfolioCode: integer("portfolio_code").default(0),
    portfolioName: text("portfolio_name"),
    capacity: integer("capacity"),
    isNew: integer("is_new").default(0),
  },
  (table) => [index("idx_snbt_programs_id_ptn").on(table.idPtn)],
);

export const snbpCapacityHistory = pgTable(
  "snbp_capacity_history",
  {
    id: serial("id").primaryKey(),
    idProdi: integer("id_prodi")
      .notNull()
      .references(() => snbpPrograms.idProdi),
    year: integer("year").notNull(),
    capacity: integer("capacity"),
    applicants: integer("applicants"),
    accepted: integer("accepted"),
  },
  (table) => [index("idx_snbp_capacity_id_prodi").on(table.idProdi)],
);

export const snbtCapacityHistory = pgTable(
  "snbt_capacity_history",
  {
    id: serial("id").primaryKey(),
    idProdi: integer("id_prodi")
      .notNull()
      .references(() => snbtPrograms.idProdi),
    year: integer("year").notNull(),
    capacity: integer("capacity"),
    applicants: integer("applicants"),
    accepted: integer("accepted"),
  },
  (table) => [index("idx_snbt_capacity_id_prodi").on(table.idProdi)],
);

export const snbtApplicantProvinces = pgTable(
  "snbt_applicant_provinces",
  {
    id: serial("id").primaryKey(),
    idProdi: integer("id_prodi")
      .notNull()
      .references(() => snbtPrograms.idProdi),
    year: integer("year").notNull(),
    provinceCode: text("province_code"),
    provinceName: text("province_name"),
    totalApplicants: integer("total_applicants").default(0),
  },
  (table) => [index("idx_snbt_prov_id_prodi").on(table.idProdi), index("idx_snbt_prov_year").on(table.year)],
);

// ──────────────────────────────────────────────
// MAPPING DOMAIN
// ──────────────────────────────────────────────

export const universityMappings = pgTable("university_mappings", {
  idPtn: integer("id_ptn")
    .primaryKey()
    .references(() => snpmbUniversities.idPtn),
  code: integer("code"),
  name: text("name").notNull(),
  idSp: text("id_sp").references(() => universities.idSp),
  ptCode: text("pt_code"),
  ptName: text("pt_name"),
  province: text("province"),
  groupName: text("group_name"),
  supervisor: text("supervisor"),
  matchType: text("match_type").default("exact"),
  matchSimilarity: doublePrecision("match_similarity").default(1),
});

export const programMappings = pgTable(
  "program_mappings",
  {
    id: serial("id").primaryKey(),
    snpmbProgramId: integer("snpmb_program_id").notNull(),
    snpmbProgramCode: integer("snpmb_program_code"),
    snpmbProgramName: text("snpmb_program_name").notNull(),
    level: text("level"),
    pddiktiProgramId: text("pddikti_program_id"),
    pddiktiProgramCode: text("pddikti_program_code"),
    pddiktiProgramName: text("pddikti_program_name"),
    pddiktiLevel: text("pddikti_level"),
    idPtn: integer("id_ptn").notNull(),
    idSp: text("id_sp"),
    similarity: doublePrecision("similarity"),
  },
  (table) => [
    index("idx_program_mappings_snpmb").on(table.snpmbProgramId),
    index("idx_program_mappings_pddikti").on(table.pddiktiProgramId),
  ],
);

// ──────────────────────────────────────────────
// RELATIONS
// ──────────────────────────────────────────────

// PDDIKTI relations
export const universitiesRelations = relations(universities, ({ many, one }) => ({
  details: one(universityDetails),
  studyPrograms: many(studyPrograms),
  tuitionFees: one(tuitionFees),
  studentStats: one(studentStats),
  studyDurations: many(studyDurations),
  programCounts: one(programCounts),
  lecturerCounts: one(lecturerCounts),
  graduationRates: one(graduationRates),
  nameHistories: many(nameHistories),
  universityMappings: many(universityMappings),
  programMappings: many(programMappings),
}));

export const studyProgramsRelations = relations(studyPrograms, ({ one, many }) => ({
  university: one(universities, {
    fields: [studyPrograms.idSp],
    references: [universities.idSp],
  }),
  programMappings: many(programMappings),
}));

export const studyDurationsRelations = relations(studyDurations, ({ one }) => ({
  university: one(universities, {
    fields: [studyDurations.idSp],
    references: [universities.idSp],
  }),
}));

export const nameHistoriesRelations = relations(nameHistories, ({ one }) => ({
  university: one(universities, {
    fields: [nameHistories.idSp],
    references: [universities.idSp],
  }),
}));

// SNPMB relations
export const snpmbUniversitiesRelations = relations(snpmbUniversities, ({ many, one }) => ({
  snbpPrograms: many(snbpPrograms),
  snbtPrograms: many(snbtPrograms),
  universityMapping: one(universityMappings),
}));

export const snbpProgramsRelations = relations(snbpPrograms, ({ one, many }) => ({
  university: one(snpmbUniversities, {
    fields: [snbpPrograms.idPtn],
    references: [snpmbUniversities.idPtn],
  }),
  capacityHistory: many(snbpCapacityHistory),
}));

export const snbtProgramsRelations = relations(snbtPrograms, ({ one, many }) => ({
  university: one(snpmbUniversities, {
    fields: [snbtPrograms.idPtn],
    references: [snpmbUniversities.idPtn],
  }),
  capacityHistory: many(snbtCapacityHistory),
  applicantProvinces: many(snbtApplicantProvinces),
}));

export const snbpCapacityHistoryRelations = relations(snbpCapacityHistory, ({ one }) => ({
  program: one(snbpPrograms, {
    fields: [snbpCapacityHistory.idProdi],
    references: [snbpPrograms.idProdi],
  }),
}));

export const snbtCapacityHistoryRelations = relations(snbtCapacityHistory, ({ one }) => ({
  program: one(snbtPrograms, {
    fields: [snbtCapacityHistory.idProdi],
    references: [snbtPrograms.idProdi],
  }),
}));

export const snbtApplicantProvincesRelations = relations(snbtApplicantProvinces, ({ one }) => ({
  program: one(snbtPrograms, {
    fields: [snbtApplicantProvinces.idProdi],
    references: [snbtPrograms.idProdi],
  }),
}));

// Mapping relations
export const universityMappingsRelations = relations(universityMappings, ({ one }) => ({
  snpmbUniversity: one(snpmbUniversities, {
    fields: [universityMappings.idPtn],
    references: [snpmbUniversities.idPtn],
  }),
  pddiktiUniversity: one(universities, {
    fields: [universityMappings.idSp],
    references: [universities.idSp],
  }),
}));

export const programMappingsRelations = relations(programMappings, ({ one }) => ({
  snpmbProgram: one(snbpPrograms, {
    fields: [programMappings.snpmbProgramId],
    references: [snbpPrograms.idProdi],
  }),
  pddiktiProgram: one(studyPrograms, {
    fields: [programMappings.pddiktiProgramId],
    references: [studyPrograms.idSms],
  }),
}));
