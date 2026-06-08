import { and, asc, count, db, desc, eq, ilike, or, sql } from "@mulai-plus/db";
import {
  graduationRates,
  lecturerCounts,
  nameHistories,
  programCounts,
  snbpCapacityHistory,
  snbpPrograms,
  snbtCapacityHistory,
  snbtPrograms,
  snpmbUniversities,
  studentStats,
  studyDurations,
  studyPrograms,
  tuitionFees,
  universities,
  universityDetails,
  universityMappings,
} from "@mulai-plus/db/schema/pddikti";
import { z } from "zod";
import { adminProcedure, publicProcedure } from "../index";

const paginationSchema = z.object({
  page: z.number().default(1),
  pageSize: z.number().min(1).max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const pddiktiRouter = {
  // ══════════════════════════════════════════
  // UNIVERSITIES
  // ══════════════════════════════════════════

  listUniversities: adminProcedure
    .input(
      paginationSchema.extend({
        search: z.string().optional(),
        type: z.string().optional(),
        province: z.string().optional(),
        accreditation: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions: any[] = [];
      if (input.search)
        conditions.push(
          or(
            ilike(universities.name, `%${input.search}%`),
            ilike(universities.shortName, `%${input.search}%`),
            ilike(universities.code, `%${input.search}%`),
          ),
        );
      if (input.type) conditions.push(eq(universities.type, input.type));
      if (input.province) conditions.push(eq(universities.province, input.province));
      if (input.accreditation) conditions.push(eq(universities.accreditation, input.accreditation));
      if (input.status) conditions.push(eq(universities.status, input.status));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;
      const orderBy =
        input.sort && input.order
          ? input.order === "desc"
            ? desc(sql.raw(`"${input.sort}"`))
            : asc(sql.raw(`"${input.sort}"`))
          : asc(universities.name);
      const [data, totalResult] = await Promise.all([
        db
          .select()
          .from(universities)
          .where(where ?? undefined)
          .limit(input.pageSize)
          .offset(offset)
          .orderBy(orderBy),
        db
          .select({ count: count() })
          .from(universities)
          .where(where ?? undefined),
      ]);
      return { data, total: totalResult[0]?.count ?? 0, page: input.page, pageSize: input.pageSize };
    }),

  getUniversity: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    // Basic university data
    const uni = await db.select().from(universities).where(eq(universities.idSp, input.id)).limit(1);
    if (!uni.length) return null;
    const result: Record<string, any> = { ...uni[0] };

    // Related data via separate queries
    const [details, programs, fees, stats, durations, pcounts, lcounts, grates, nhists] = await Promise.all([
      db
        .select()
        .from(universityDetails)
        .where(eq(universityDetails.idSp, input.id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db.select().from(studyPrograms).where(eq(studyPrograms.idSp, input.id)),
      db
        .select()
        .from(tuitionFees)
        .where(eq(tuitionFees.idSp, input.id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select()
        .from(studentStats)
        .where(eq(studentStats.idSp, input.id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db.select().from(studyDurations).where(eq(studyDurations.idSp, input.id)),
      db
        .select()
        .from(programCounts)
        .where(eq(programCounts.idSp, input.id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select()
        .from(lecturerCounts)
        .where(eq(lecturerCounts.idSp, input.id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select()
        .from(graduationRates)
        .where(eq(graduationRates.idSp, input.id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db.select().from(nameHistories).where(eq(nameHistories.idSp, input.id)),
    ]);
    result.details = details;
    result.studyPrograms = programs;
    result.tuitionFees = fees;
    result.studentStats = stats;
    result.studyDurations = durations;
    result.programCounts = pcounts;
    result.lecturerCounts = lcounts;
    result.graduationRates = grates;
    result.nameHistories = nhists;

    // SNPMB data
    const mappings = await db.select().from(universityMappings).where(eq(universityMappings.idSp, input.id));
    if (mappings.length) {
      for (const m of mappings) {
        const snpmbUni = await db
          .select()
          .from(snpmbUniversities)
          .where(eq(snpmbUniversities.idPtn, m.idPtn))
          .limit(1)
          .then((r) => r[0] ?? null);
        if (snpmbUni) {
          (m as any).snpmbUniversity = snpmbUni;
          const sbp = await db.select().from(snbpPrograms).where(eq(snbpPrograms.idPtn, m.idPtn));
          for (const p of sbp) {
            (p as any).capacityHistory = await db
              .select()
              .from(snbpCapacityHistory)
              .where(eq(snbpCapacityHistory.idProdi, p.idProdi))
              .orderBy(asc(snbpCapacityHistory.year));
          }
          (snpmbUni as any).snbpPrograms = sbp;
          const sbt = await db.select().from(snbtPrograms).where(eq(snbtPrograms.idPtn, m.idPtn));
          for (const p of sbt) {
            (p as any).capacityHistory = await db
              .select()
              .from(snbtCapacityHistory)
              .where(eq(snbtCapacityHistory.idProdi, p.idProdi))
              .orderBy(asc(snbtCapacityHistory.year));
          }
          (snpmbUni as any).snbtPrograms = sbt;
        }
      }
    }
    result.universityMappings = mappings;

    return result;
  }),

  createUniversity: adminProcedure
    .input(
      z.object({
        idSp: z.string().min(1),
        code: z.string().optional(),
        name: z.string().min(1),
        shortName: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        province: z.string().optional(),
        regency: z.string().optional(),
        accreditation: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      await db.insert(universities).values({
        ...input,
        code: input.code ?? null,
        shortName: input.shortName ?? null,
        type: input.type ?? null,
        status: input.status ?? null,
        province: input.province ?? null,
        regency: input.regency ?? null,
        accreditation: input.accreditation ?? null,
      });
      return { success: true };
    }),

  updateUniversity: adminProcedure
    .input(
      z.object({
        idSp: z.string().min(1),
        name: z.string().optional(),
        shortName: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        province: z.string().nullable().optional(),
        regency: z.string().nullable().optional(),
        accreditation: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { idSp, ...updates } = input;
      await db
        .update(universities)
        .set(updates as Record<string, unknown>)
        .where(eq(universities.idSp, idSp));
      return { success: true };
    }),

  deleteUniversity: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    await db.delete(universities).where(eq(universities.idSp, input.id));
    return { success: true };
  }),

  // ══════════════════════════════════════════
  // STUDY PROGRAMS
  // ══════════════════════════════════════════

  listStudyPrograms: adminProcedure
    .input(
      paginationSchema.extend({
        search: z.string().optional(),
        idSp: z.string().optional(),
        level: z.string().optional(),
        accreditation: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions: any[] = [];
      if (input.search)
        conditions.push(
          or(ilike(studyPrograms.name, `%${input.search}%`), ilike(studyPrograms.code, `%${input.search}%`)),
        );
      if (input.idSp) conditions.push(eq(studyPrograms.idSp, input.idSp));
      if (input.level) conditions.push(eq(studyPrograms.level, input.level));
      if (input.accreditation) conditions.push(eq(studyPrograms.accreditation, input.accreditation));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;
      const orderBy =
        input.sort && input.order
          ? input.order === "desc"
            ? desc(sql.raw(`"${input.sort}"`))
            : asc(sql.raw(`"${input.sort}"`))
          : asc(studyPrograms.name);
      const [data, totalResult] = await Promise.all([
        db
          .select()
          .from(studyPrograms)
          .where(where ?? undefined)
          .limit(input.pageSize)
          .offset(offset)
          .orderBy(orderBy),
        db
          .select({ count: count() })
          .from(studyPrograms)
          .where(where ?? undefined),
      ]);
      return { data, total: totalResult[0]?.count ?? 0, page: input.page, pageSize: input.pageSize };
    }),

  listProgramLevels: adminProcedure.handler(async () => {
    const r = await db
      .select({ v: studyPrograms.level })
      .from(studyPrograms)
      .where(sql`${studyPrograms.level} IS NOT NULL`)
      .groupBy(studyPrograms.level)
      .orderBy(asc(studyPrograms.level));
    return r.map((x) => x.v);
  }),

  // ══════════════════════════════════════════
  // SNPMB
  // ══════════════════════════════════════════

  listSnpmbUniversities: adminProcedure
    .input(
      paginationSchema.extend({
        search: z.string().optional(),
        type: z.string().optional(),
        province: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions: any[] = [];
      if (input.search) conditions.push(ilike(snpmbUniversities.name, `%${input.search}%`));
      if (input.type) conditions.push(eq(snpmbUniversities.type, input.type));
      if (input.province) conditions.push(eq(snpmbUniversities.province, input.province));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;
      const orderBy =
        input.sort && input.order
          ? input.order === "desc"
            ? desc(sql.raw(`"${input.sort}"`))
            : asc(sql.raw(`"${input.sort}"`))
          : asc(snpmbUniversities.name);
      const [data, totalResult] = await Promise.all([
        db
          .select()
          .from(snpmbUniversities)
          .where(where ?? undefined)
          .limit(input.pageSize)
          .offset(offset)
          .orderBy(orderBy),
        db
          .select({ count: count() })
          .from(snpmbUniversities)
          .where(where ?? undefined),
      ]);
      return { data, total: totalResult[0]?.count ?? 0, page: input.page, pageSize: input.pageSize };
    }),

  listSnpmbTypes: adminProcedure.handler(async () => {
    const r = await db
      .select({ v: snpmbUniversities.type })
      .from(snpmbUniversities)
      .where(sql`${snpmbUniversities.type} IS NOT NULL`)
      .groupBy(snpmbUniversities.type)
      .orderBy(asc(snpmbUniversities.type));
    return r.map((x) => x.v);
  }),

  // ══════════════════════════════════════════
  // PUBLIC ENDPOINTS (no auth needed)
  // ══════════════════════════════════════════

  /**
   * Generate SEO-friendly slug from name + short ID
   */
  publicGetSlug: publicProcedure.input(z.object({ name: z.string(), id: z.string() })).handler(async ({ input }) => {
    const slug =
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      input.id.substring(0, 6);
    return slug;
  }),

  publicListUniversities: publicProcedure
    .input(
      paginationSchema.extend({
        search: z.string().optional(),
        type: z.string().optional(),
        province: z.string().optional(),
        accreditation: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions: any[] = [eq(universities.status, "Aktif")];
      if (input.search)
        conditions.push(
          or(ilike(universities.name, `%${input.search}%`), ilike(universities.shortName, `%${input.search}%`)),
        );
      if (input.type) conditions.push(eq(universities.type, input.type));
      if (input.province) conditions.push(eq(universities.province, input.province));
      if (input.accreditation) conditions.push(eq(universities.accreditation, input.accreditation));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;
      const orderBy =
        input.sort && input.order
          ? input.order === "desc"
            ? desc(sql.raw(`"${input.sort}"`))
            : asc(sql.raw(`"${input.sort}"`))
          : asc(universities.name);
      const [data, totalResult] = await Promise.all([
        db
          .select({
            idSp: universities.idSp,
            name: universities.name,
            shortName: universities.shortName,
            type: universities.type,
            province: universities.province,
            accreditation: universities.accreditation,
            totalPrograms: universities.totalPrograms,
          })
          .from(universities)
          .where(where ?? undefined)
          .limit(input.pageSize)
          .offset(offset)
          .orderBy(orderBy),
        db
          .select({ count: count() })
          .from(universities)
          .where(where ?? undefined),
      ]);
      return { data, total: totalResult[0]?.count ?? 0, page: input.page, pageSize: input.pageSize };
    }),

  publicGetUniversity: publicProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    const uni = await db.select().from(universities).where(eq(universities.idSp, input.id)).limit(1);
    if (!uni.length) return null;
    const result: Record<string, any> = { ...uni[0] };
    const [details, programs, fees, stats, durations, grates] = await Promise.all([
      db
        .select()
        .from(universityDetails)
        .where(eq(universityDetails.idSp, input.id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select({
          idSms: studyPrograms.idSms,
          code: studyPrograms.code,
          name: studyPrograms.name,
          level: studyPrograms.level,
          accreditation: studyPrograms.accreditation,
          totalStudents: studyPrograms.totalStudents,
        })
        .from(studyPrograms)
        .where(eq(studyPrograms.idSp, input.id)),
      db
        .select()
        .from(tuitionFees)
        .where(eq(tuitionFees.idSp, input.id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select()
        .from(studentStats)
        .where(eq(studentStats.idSp, input.id))
        .limit(1)
        .then((r) => r[0] ?? null),
      db.select().from(studyDurations).where(eq(studyDurations.idSp, input.id)),
      db
        .select()
        .from(graduationRates)
        .where(eq(graduationRates.idSp, input.id))
        .limit(1)
        .then((r) => r[0] ?? null),
    ]);
    result.details = details;
    result.studyPrograms = programs;
    result.tuitionFees = fees;
    result.studentStats = stats;
    result.studyDurations = durations;
    result.graduationRates = grates;
    return result;
  }),

  publicListStudyPrograms: publicProcedure
    .input(paginationSchema.extend({ search: z.string().optional(), level: z.string().optional() }))
    .handler(async ({ input }) => {
      const conditions: any[] = [eq(studyPrograms.status, "Aktif")];
      if (input.search) conditions.push(ilike(studyPrograms.name, `%${input.search}%`));
      if (input.level) conditions.push(eq(studyPrograms.level, input.level));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;
      const orderBy = asc(studyPrograms.name);
      const [data, totalResult] = await Promise.all([
        db
          .select({
            idSms: studyPrograms.idSms,
            code: studyPrograms.code,
            name: studyPrograms.name,
            level: studyPrograms.level,
            accreditation: studyPrograms.accreditation,
          })
          .from(studyPrograms)
          .where(where ?? undefined)
          .limit(input.pageSize)
          .offset(offset)
          .orderBy(orderBy),
        db
          .select({ count: count() })
          .from(studyPrograms)
          .where(where ?? undefined),
      ]);
      return { data, total: totalResult[0]?.count ?? 0, page: input.page, pageSize: input.pageSize };
    }),

  publicGetStudyProgram: publicProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    const prog = await db.select().from(studyPrograms).where(eq(studyPrograms.idSms, input.id)).limit(1);
    if (!prog.length) return null;
    return prog[0];
  }),

  publicGetUniversitySlugs: publicProcedure.handler(async () => {
    const data = await db
      .select({ idSp: universities.idSp, name: universities.name })
      .from(universities)
      .where(eq(universities.status, "Aktif"));
    return data.map((u) => ({
      id: u.idSp,
      slug: `${u.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")}-${u.idSp.substring(0, 6)}`,
      name: u.name,
    }));
  }),

  publicGetProgramSlugs: publicProcedure.handler(async () => {
    const data = await db
      .select({ idSms: studyPrograms.idSms, name: studyPrograms.name })
      .from(studyPrograms)
      .where(eq(studyPrograms.status, "Aktif"));
    return data.map((p) => ({
      id: p.idSms,
      slug: `${p.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")}-${p.idSms.substring(0, 6)}`,
      name: p.name,
    }));
  }),

  // Public filters
  publicListProvinces: publicProcedure.handler(async () => {
    const r = await db
      .select({ v: universities.province })
      .from(universities)
      .where(sql`${universities.province} IS NOT NULL AND ${universities.status} = 'Aktif'`)
      .groupBy(universities.province)
      .orderBy(asc(universities.province));
    return r.map((x) => x.v);
  }),
  publicListTypes: publicProcedure.handler(async () => {
    const r = await db
      .select({ v: universities.type })
      .from(universities)
      .where(sql`${universities.type} IS NOT NULL AND ${universities.status} = 'Aktif'`)
      .groupBy(universities.type)
      .orderBy(asc(universities.type));
    return r.map((x) => x.v);
  }),
  publicListAccreditations: publicProcedure.handler(async () => {
    const r = await db
      .select({ v: universities.accreditation })
      .from(universities)
      .where(sql`${universities.accreditation} IS NOT NULL AND ${universities.status} = 'Aktif'`)
      .groupBy(universities.accreditation)
      .orderBy(asc(universities.accreditation));
    return r.map((x) => x.v);
  }),
  publicListProgramLevels: publicProcedure.handler(async () => {
    const r = await db
      .select({ v: studyPrograms.level })
      .from(studyPrograms)
      .where(sql`${studyPrograms.level} IS NOT NULL AND ${studyPrograms.status} = 'Aktif'`)
      .groupBy(studyPrograms.level)
      .orderBy(asc(studyPrograms.level));
    return r.map((x) => x.v);
  }),

  // ══════════════════════════════════════════
  // FILTERS (for universities)
  // ══════════════════════════════════════════

  listProvinces: adminProcedure.handler(async () => {
    const r = await db
      .select({ v: universities.province })
      .from(universities)
      .where(sql`${universities.province} IS NOT NULL`)
      .groupBy(universities.province)
      .orderBy(asc(universities.province));
    return r.map((x) => x.v);
  }),
  listTypes: adminProcedure.handler(async () => {
    const r = await db
      .select({ v: universities.type })
      .from(universities)
      .where(sql`${universities.type} IS NOT NULL`)
      .groupBy(universities.type)
      .orderBy(asc(universities.type));
    return r.map((x) => x.v);
  }),
  listAccreditations: adminProcedure.handler(async () => {
    const r = await db
      .select({ v: universities.accreditation })
      .from(universities)
      .where(sql`${universities.accreditation} IS NOT NULL`)
      .groupBy(universities.accreditation)
      .orderBy(asc(universities.accreditation));
    return r.map((x) => x.v);
  }),
  listStatuses: adminProcedure.handler(async () => {
    const r = await db
      .select({ v: universities.status })
      .from(universities)
      .where(sql`${universities.status} IS NOT NULL`)
      .groupBy(universities.status)
      .orderBy(asc(universities.status));
    return r.map((x) => x.v);
  }),
};
