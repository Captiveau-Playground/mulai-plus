// ─────────────────────────────────────────────────────────────────────────────
// B2B — Sekolah / institusi (M1)
//
// Alur: admin sekolah mendaftar (`school.register`) → status `pending` →
// admin MULAI+ menyetujui (`schoolAdmin.approve`) → organisasi aktif, akun naik
// jadi role `school_admin`, dan sekolah otomatis tersambung ke `tmb_schools`
// supaya batch/roster yang sudah ada langsung terlihat oleh admin sekolah.
//
// Admin sekolah TIDAK menyentuh management test (bank soal/versi/aturan/publish);
// dia hanya mengelola peserta + jadwal dan melihat hasil/insight sekolahnya.
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from "node:crypto";
import { and, asc, db, desc, eq, inArray } from "@mulai-plus/db/db";
import {
  assessmentCohortReports,
  assessmentOrgInvites,
  assessmentOrgMembers,
  assessmentOrgs,
} from "@mulai-plus/db/schema/assessment";
import { user } from "@mulai-plus/db/schema/auth";
import {
  tmbAssessmentResults,
  tmbBatches,
  tmbBatchStudents,
  tmbRecommendations,
  tmbSchools,
} from "@mulai-plus/db/schema/tmb";
import { notifyDiscord } from "@mulai-plus/notify/discord";
import { z } from "zod";
import { adminProcedure, protectedProcedure } from "../index";
import { notFound, preconditionFailed } from "../lib/errors";
import { buildBatchRekap, generateClaimCode, parseCsv } from "./tmb";

/** Keanggotaan + organisasi milik user (fase ini: satu akun = satu organisasi). */
export async function orgOfUser(userId: string) {
  const member = await db.query.assessmentOrgMembers.findFirst({
    where: eq(assessmentOrgMembers.userId, userId),
  });
  if (!member) return { member: null, org: null };
  const org = await db.query.assessmentOrgs.findFirst({ where: eq(assessmentOrgs.id, member.orgId) });
  return { member, org: org ?? null };
}

/** Cari sekolah legacy dengan nama sama (biar tidak dobel saat approval). */
async function findLegacySchoolByName(name: string) {
  const rows = await db.query.tmbSchools.findMany({ columns: { id: true, name: true } });
  const target = name.trim().toLowerCase();
  return rows.find((r) => (r.name ?? "").trim().toLowerCase() === target) ?? null;
}

/**
 * Guard data sekolah: user harus anggota organisasi yang AKTIF dan organisasinya aktif.
 * Dipakai semua endpoint baca (dashboard, kelas, peserta) supaya aturannya konsisten.
 */
/** (M4.1) Hanya `school_admin` yang boleh mengubah peserta/jadwal/tim. */
function isManager(member: { role?: string | null } | null | undefined) {
  return member?.role === "school_admin";
}

/**
 * (M4.1) Klaim undangan rekan yang masih pending untuk email user ini.
 * Dipanggil saat user membuka portal sekolah → member row dibuat, role akun naik.
 */
async function consumeInvites(userId: string) {
  const [u] = await db.select({ email: user.email, role: user.role }).from(user).where(eq(user.id, userId));
  const email = (u?.email ?? "").trim().toLowerCase();
  if (!email) return;
  const invites = await db.query.assessmentOrgInvites.findMany({
    where: and(eq(assessmentOrgInvites.email, email), eq(assessmentOrgInvites.status, "pending")),
    limit: 5,
  });
  if (!invites.length) return;
  const existing = await orgOfUser(userId);
  if (existing.member) return; // satu akun = satu sekolah
  for (const inv of invites) {
    const org = await db.query.assessmentOrgs.findFirst({ where: eq(assessmentOrgs.id, inv.orgId) });
    if (!org) continue;
    const role = inv.role === "school_admin" ? "school_admin" : "school_viewer";
    await db.insert(assessmentOrgMembers).values({
      id: randomUUID(),
      orgId: inv.orgId,
      userId,
      role,
      status: org.status === "aktif" ? "aktif" : "pending",
      invitedBy: inv.invitedBy,
    });
    await db
      .update(assessmentOrgInvites)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(assessmentOrgInvites.id, inv.id));
    if (u?.role !== role) await db.update(user).set({ role }).where(eq(user.id, userId));
    return;
  }
}

async function activeSchool(userId: string) {
  const { member, org } = await orgOfUser(userId);
  if (!member || !org) return { error: "belum_terdaftar" as const };
  if (member.status !== "aktif" || org.status !== "aktif") {
    return { error: "belum_aktif" as const, status: org.status, memberStatus: member.status };
  }
  return { member, org, schoolId: org.schoolId ?? null };
}

/** Status window jadwal kelas: tanpa jadwal / belum mulai / berjalan / selesai. */
function windowState(b: { windowStart?: Date | null; windowEnd?: Date | null }) {
  const now = Date.now();
  const s = b.windowStart ? new Date(b.windowStart).getTime() : null;
  const e = b.windowEnd ? new Date(b.windowEnd).getTime() : null;
  if (s === null && e === null) return "tanpa_jadwal" as const;
  if (s !== null && now < s) return "belum_mulai" as const;
  if (e !== null && now > e) return "selesai" as const;
  return "berjalan" as const;
}

/** Pastikan batch milik sekolah org ini (isolasi data). */
async function ownedBatch(batchId: string, schoolId: string | null) {
  if (!schoolId) return null;
  const b = await db.query.tmbBatches.findFirst({ where: eq(tmbBatches.id, batchId) });
  return b && b.schoolId === schoolId ? b : null;
}

/** (M2.6) Kode akses personal untuk peserta tanpa email — unik & tanpa huruf ambigu. */
async function ensureClaimCode(studentId: string): Promise<string> {
  const row = await db.query.tmbBatchStudents.findFirst({
    where: eq(tmbBatchStudents.id, studentId),
    columns: { claimCode: true },
  });
  if (row?.claimCode) return row.claimCode;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateClaimCode(6);
    const clash = await db.query.tmbBatchStudents.findFirst({
      where: eq(tmbBatchStudents.claimCode, code),
      columns: { id: true },
    });
    if (clash) continue;
    await db.update(tmbBatchStudents).set({ claimCode: code }).where(eq(tmbBatchStudents.id, studentId));
    return code;
  }
  throw new Error("gagal membuat kode akses");
}

/** (M2.6) Pastikan semua peserta tanpa email punya kode akses (idempoten). */
async function ensureClaimCodes(students: Array<{ id: string; email: string | null; claimCode?: string | null }>) {
  const need = students.filter((s) => !s.email && !s.claimCode);
  for (const s of need) await ensureClaimCode(s.id);
}

/** (M3) Hitung insight kelas — dipakai endpoint insight & snapshot laporan. */
async function computeCohortInsight(
  batchId: string,
  schoolName: string | null,
  batchMeta: { id: string; name: string | null; className: string | null; major: string | null },
) {
  const students = await db.query.tmbBatchStudents.findMany({
    where: eq(tmbBatchStudents.batchId, batchId),
    orderBy: asc(tmbBatchStudents.name),
  });
  const resultIds = [...new Set(students.map((x) => x.resultId).filter(Boolean))] as string[];
  const [results, recos] = await Promise.all([
    resultIds.length
      ? db.query.tmbAssessmentResults.findMany({ where: inArray(tmbAssessmentResults.id, resultIds) })
      : Promise.resolve([]),
    resultIds.length
      ? db.query.tmbRecommendations.findMany({ where: inArray(tmbRecommendations.resultId, resultIds) })
      : Promise.resolve([]),
  ]);
  const byId = new Map(results.map((r) => [r.id, r]));
  const recosByResult = new Map<string, typeof recos>();
  for (const r of recos) {
    const arr = recosByResult.get(r.resultId) ?? [];
    arr.push(r);
    recosByResult.set(r.resultId, arr);
  }

  const HOLLAND = ["R", "I", "A", "S", "E", "C"] as const;
  const hollandCount: Record<string, number> = Object.fromEntries(HOLLAND.map((k) => [k, 0]));
  const hollandSum: Record<string, number> = Object.fromEntries(HOLLAND.map((k) => [k, 0]));
  const majorCount = new Map<string, number>();
  const careerCount = new Map<string, number>();
  const abilSum = new Map<string, { correct: number; total: number }>();
  const attention: Array<{ participantId: string; name: string; reasons: string[] }> = [];
  let confSum = 0;
  let confN = 0;
  let firstAt: Date | null = null;
  let lastAt: Date | null = null;
  let completed = 0;
  let inProgress = 0;

  for (const st of students) {
    if (st.status === "in_progress") inProgress++;
    const res = st.resultId ? byId.get(st.resultId) : null;
    if (!res) {
      if (st.status !== "completed")
        attention.push({ participantId: st.id, name: st.name, reasons: ["belum selesai"] });
      continue;
    }
    completed++;

    const hs = (res.hollandScores ?? {}) as Record<string, number>;
    for (const k of HOLLAND) {
      const v = Number(hs[k] ?? 0);
      hollandSum[k] = (hollandSum[k] ?? 0) + v;
    }
    const top = String(res.hollandCode ?? "")
      .slice(0, 1)
      .toUpperCase();
    if (top in hollandCount) hollandCount[top] = (hollandCount[top] ?? 0) + 1;

    const myRecos = recosByResult.get(res.id) ?? [];
    for (const rc of myRecos) {
      if (rc.type === "major" && (rc.rank ?? 99) <= 3) {
        majorCount.set(rc.itemName, (majorCount.get(rc.itemName) ?? 0) + 1);
      } else if (rc.type === "career" && (rc.rank ?? 99) <= 3) {
        careerCount.set(rc.itemName, (careerCount.get(rc.itemName) ?? 0) + 1);
      }
    }

    const ab = (res.abilityScores ?? {}) as any;
    const scores = ab?.scores ?? ab ?? {};
    let weakest: { key: string; pct: number } | null = null;
    for (const [k, v] of Object.entries(scores)) {
      if (!v || typeof v !== "object") continue;
      const correct = Number((v as any).correct ?? 0);
      const total = Number((v as any).total ?? 0);
      if (!total) continue;
      const acc = abilSum.get(k) ?? { correct: 0, total: 0 };
      acc.correct += correct;
      acc.total += total;
      abilSum.set(k, acc);
      const pct = Math.round((correct / total) * 100);
      if (!weakest || pct < weakest.pct) weakest = { key: k, pct };
    }

    const conf = Number(res.confidenceScore ?? 0);
    if (conf) {
      confSum += conf;
      confN++;
    }
    const reasons: string[] = [];
    if (conf && conf < 50) reasons.push("keyakinan rendah");
    if (
      String(res.differentiation ?? "")
        .toLowerCase()
        .startsWith("flat")
    )
      reasons.push("minat menyebar (belum jelas)");
    if (weakest && weakest.pct < 40) reasons.push(`kemampuan ${weakest.key} terendah`);
    if (reasons.length) attention.push({ participantId: st.id, name: st.name, reasons });

    const at = res.createdAt ? new Date(res.createdAt) : null;
    if (at) {
      if (!firstAt || at < firstAt) firstAt = at;
      if (!lastAt || at > lastAt) lastAt = at;
    }
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const hollandDist = HOLLAND.map((k) => ({
    code: k,
    count: hollandCount[k] ?? 0,
    pct: pct(hollandCount[k] ?? 0, completed),
    avg: completed ? Math.round(((hollandSum[k] ?? 0) / completed) * 10) / 10 : 0,
  })).sort((a, b) => b.count - a.count || b.avg - a.avg);

  const ability = [...abilSum.entries()]
    .map(([key, v]) => ({ key, correct: v.correct, total: v.total, pct: pct(v.correct, v.total) }))
    .sort((a, b) => b.pct - a.pct);

  const topOf = (m: Map<string, number>, limit = 8) =>
    [...m.entries()]
      .map(([name, count]) => ({ name, count, pct: pct(count, Math.max(1, completed)) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, limit);

  return {
    batch: batchMeta,
    school: schoolName,
    counts: {
      total: students.length,
      completed,
      inProgress,
      invited: Math.max(0, students.length - completed - inProgress),
    },
    confidenceAvg: confN ? Math.round((confSum / confN) * 10) / 10 : null,
    hollandDist,
    ability,
    strongest: ability[0] ?? null,
    weakest: ability.length > 1 ? ability[ability.length - 1] : null,
    topMajors: topOf(majorCount),
    topCareers: topOf(careerCount),
    attention: attention.slice(0, 40),
    range: { first: firstAt, last: lastAt },
  };
}

export const schoolRouter = {
  /**
   * Ajukan pendaftaran sekolah. Akun belum aktif sampai disetujui admin MULAI+.
   * Satu akun hanya boleh mendaftar sekali (keanggotaan unik per user).
   */
  register: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(3).max(120),
        type: z.enum(["sekolah", "kampus", "bimbel", "korporat"]).default("sekolah"),
        npsn: z.string().trim().max(24).optional().or(z.literal("")),
        city: z.string().trim().max(60).optional().or(z.literal("")),
        address: z.string().trim().max(200).optional().or(z.literal("")),
        picName: z.string().trim().min(2).max(80),
        picPosition: z.string().trim().max(60).optional().or(z.literal("")),
        picPhone: z.string().trim().min(8).max(24),
        picEmail: z.string().trim().email().optional().or(z.literal("")),
      }),
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const existing = await orgOfUser(userId);
      if (existing.member) {
        return {
          ok: false as const,
          error: "sudah_terdaftar" as const,
          status: existing.member.status,
          orgName: existing.org?.name ?? null,
        };
      }

      const orgId = randomUUID();
      await db.insert(assessmentOrgs).values({
        id: orgId,
        name: input.name,
        type: input.type,
        npsn: input.npsn || null,
        city: input.city || null,
        address: input.address || null,
        picName: input.picName,
        picPosition: input.picPosition || null,
        picPhone: input.picPhone,
        picEmail: input.picEmail || null,
        status: "pending",
      });
      await db.insert(assessmentOrgMembers).values({
        id: randomUUID(),
        orgId,
        userId,
        role: "school_admin",
        status: "pending",
      });

      const u = context.session.user;
      notifyDiscord({
        webhookUrl: (context.env as { DISCORD_WEBHOOK_URL?: string } | undefined)?.DISCORD_WEBHOOK_URL,
        event: "school.registration",
        title: "🏫 Pendaftaran sekolah baru (menunggu persetujuan)",
        description: `${input.name} mendaftar sebagai mitra B2B. Setujui di Admin → Assessment → Sekolah.`,
        fields: [
          { name: "Sekolah", value: input.name, inline: true },
          { name: "Kota", value: input.city || "-", inline: true },
          { name: "NPSN", value: input.npsn || "-", inline: true },
          { name: "PIC", value: `${input.picName}${input.picPosition ? ` (${input.picPosition})` : ""}`, inline: true },
          { name: "Kontak", value: `${input.picPhone}${input.picEmail ? ` · ${input.picEmail}` : ""}`, inline: false },
          { name: "Akun", value: `${u.name ?? "-"} · ${u.email ?? "-"}`, inline: false },
        ],
        throttleMs: 0,
        waitUntil: context.executionCtx?.waitUntil,
      });

      return { ok: true as const, orgId, status: "pending" as const };
    }),

  /** Status keanggotaan user (dipakai halaman "menunggu persetujuan" / sekolah aktif). */
  me: protectedProcedure.handler(async ({ context }) => {
    await consumeInvites(context.session.user.id);
    const { member, org } = await orgOfUser(context.session.user.id);
    if (!member || !org) return { ok: true as const, member: null, org: null };
    return {
      ok: true as const,
      member: { role: member.role, status: member.status, joinedAt: member.createdAt },
      org: {
        id: org.id,
        name: org.name,
        type: org.type,
        city: org.city,
        status: org.status,
        note: org.note,
        schoolId: org.schoolId,
        approvedAt: org.approvedAt,
      },
    };
  }),

  /**
   * Ringkasan sekolah untuk admin sekolah: jumlah peserta, progres, sebaran Holland.
   * Hanya bisa diakses anggota yang sudah AKTIF (dan organisasinya aktif).
   */
  /** (M2.1) Daftar kelas/batch milik sekolah + ringkasan progres peserta. */
  cohorts: protectedProcedure.handler(async ({ context }) => {
    const g = await activeSchool(context.session.user.id);
    if ("error" in g) return { ok: false as const, ...g };
    if (!g.schoolId) return { ok: true as const, items: [] as any[] };

    const batches = await db.query.tmbBatches.findMany({
      where: eq(tmbBatches.schoolId, g.schoolId),
      orderBy: desc(tmbBatches.createdAt),
    });
    const ids = batches.map((b) => b.id);
    const students = ids.length
      ? await db.query.tmbBatchStudents.findMany({ where: inArray(tmbBatchStudents.batchId, ids) })
      : [];

    return {
      ok: true as const,
      items: batches.map((b) => {
        const rows = students.filter((s) => s.batchId === b.id);
        const selesai = rows.filter((s) => s.status === "completed").length;
        const mulai = rows.filter((s) => s.status === "in_progress").length;
        return {
          id: b.id,
          name: b.name,
          className: b.className,
          major: b.major,
          graduationYear: b.graduationYear,
          inviteCode: b.inviteCode,
          total: rows.length,
          selesai,
          mulai,
          belum: rows.length - selesai - mulai,
          progress: rows.length ? Math.round((selesai / rows.length) * 100) : 0,
          scheduleMode: b.scheduleMode ?? "anytime",
          windowStart: b.windowStart,
          windowEnd: b.windowEnd,
          windowState: windowState(b),
        };
      }),
    };
  }),

  /** (M2.1) Peserta satu kelas + status & hasil ringkas. Hanya kelas milik sekolahnya. */
  participants: protectedProcedure
    .input(z.object({ batchId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const g = await activeSchool(context.session.user.id);
      if ("error" in g) return { ok: false as const, ...g };
      const batch = await db.query.tmbBatches.findFirst({ where: eq(tmbBatches.id, input.batchId) });
      // isolasi: batch harus milik sekolah org ini
      if (!batch || !g.schoolId || batch.schoolId !== g.schoolId) {
        return { ok: false as const, error: "not_found" as const };
      }
      let students = await db.query.tmbBatchStudents.findMany({
        where: eq(tmbBatchStudents.batchId, batch.id),
        orderBy: asc(tmbBatchStudents.name),
      });
      // (M2.6) peserta tanpa email otomatis dapat kode akses sekali pakai
      if (students.some((s) => !s.email && !s.claimCode)) {
        await ensureClaimCodes(students);
        students = await db.query.tmbBatchStudents.findMany({
          where: eq(tmbBatchStudents.batchId, batch.id),
          orderBy: asc(tmbBatchStudents.name),
        });
      }
      const resultIds = [...new Set(students.map((s) => s.resultId).filter(Boolean))] as string[];
      const results = resultIds.length
        ? await db.query.tmbAssessmentResults.findMany({
            where: inArray(tmbAssessmentResults.id, resultIds),
            columns: { id: true, hollandCode: true, confidenceScore: true, createdAt: true },
          })
        : [];
      const byId = new Map(results.map((r) => [r.id, r]));
      const selesai = students.filter((s) => s.status === "completed").length;
      const mulai = students.filter((s) => s.status === "in_progress").length;
      return {
        ok: true as const,
        batch: {
          id: batch.id,
          name: batch.name,
          className: batch.className,
          major: batch.major,
          inviteCode: batch.inviteCode,
          scheduleMode: batch.scheduleMode ?? "anytime",
          windowStart: batch.windowStart,
          windowEnd: batch.windowEnd,
          windowState: windowState(batch),
        },
        totals: { total: students.length, selesai, mulai, belum: students.length - selesai - mulai },
        items: students.map((s) => {
          const r = s.resultId ? byId.get(s.resultId) : undefined;
          return {
            id: s.id,
            name: s.name,
            email: s.email,
            nis: s.nis,
            status: s.status,
            claimCode: s.claimCode ?? null,
            claimCodeUsed: !!s.claimCodeUsedAt,
            hollandCode: r?.hollandCode ?? null,
            confidence: r?.confidenceScore ?? null,
            selesaiPada: r?.createdAt ?? null,
          };
        }),
      };
    }),

  /** (M2.2) Buat kelas baru milik sekolah + kode undangan otomatis. */
  cohortCreate: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(120),
        className: z.string().trim().max(60).optional().or(z.literal("")),
        major: z.string().trim().max(60).optional().or(z.literal("")),
        graduationYear: z.number().int().min(2000).max(2100).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const g = await activeSchool(context.session.user.id);
      if ("error" in g) return { ok: false as const, ...g };
      if (!isManager(g.member)) return { ok: false as const, error: "hanya_admin" as const };
      if (!g.schoolId) return { ok: false as const, error: "sekolah_belum_terhubung" as const };

      // kode undangan harus unik global — coba beberapa kali
      let inviteCode = generateClaimCode();
      for (let i = 0; i < 5; i++) {
        const dup = await db.query.tmbBatches.findFirst({ where: eq(tmbBatches.inviteCode, inviteCode) });
        if (!dup) break;
        inviteCode = generateClaimCode();
      }
      const id = randomUUID();
      await db.insert(tmbBatches).values({
        id,
        schoolId: g.schoolId,
        name: input.name,
        className: input.className || null,
        major: input.major || null,
        graduationYear: input.graduationYear ?? null,
        inviteCode,
      });
      return { ok: true as const, id, inviteCode };
    }),

  /** (M2.2) Tambah satu peserta ke kelas (manual). */
  participantAdd: protectedProcedure
    .input(
      z.object({
        batchId: z.string().min(1),
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().optional().or(z.literal("")),
        nis: z.string().trim().max(30).optional().or(z.literal("")),
      }),
    )
    .handler(async ({ input, context }) => {
      const g = await activeSchool(context.session.user.id);
      if ("error" in g) return { ok: false as const, ...g };
      if (!isManager(g.member)) return { ok: false as const, error: "hanya_admin" as const };
      const owned = await ownedBatch(input.batchId, g.schoolId);
      if (!owned) return { ok: false as const, error: "not_found" as const };
      const email = input.email ? input.email.toLowerCase() : null;
      if (email) {
        const dup = await db.query.tmbBatchStudents.findFirst({
          where: and(eq(tmbBatchStudents.batchId, input.batchId), eq(tmbBatchStudents.email, email)),
        });
        if (dup) return { ok: false as const, error: "peserta_sudah_ada" as const };
      }
      const id = randomUUID();
      await db.insert(tmbBatchStudents).values({
        id,
        batchId: input.batchId,
        name: input.name,
        email,
        nis: input.nis || null,
        status: "invited",
      });
      return { ok: true as const, id };
    }),

  /**
   * (M2.2) Import peserta dari CSV (header: nama | email | nis).
   * Duplikat (email/NIS yang sudah ada di kelas, atau dobel di file) dilewati dan
   * dilaporkan — bukan menggagalkan seluruh import.
   */
  participantsImport: protectedProcedure
    .input(z.object({ batchId: z.string().min(1), csv: z.string().min(1).max(200_000) }))
    .handler(async ({ input, context }) => {
      const g = await activeSchool(context.session.user.id);
      if ("error" in g) return { ok: false as const, ...g };
      if (!isManager(g.member)) return { ok: false as const, error: "hanya_admin" as const };
      const owned = await ownedBatch(input.batchId, g.schoolId);
      if (!owned) return { ok: false as const, error: "not_found" as const };

      const rows = parseCsv(input.csv);
      if (rows.length < 2) return { ok: false as const, error: "csv_kosong" as const };
      const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
      const idxName = header.findIndex((h) => h.includes("nama") || h === "name");
      const idxEmail = header.findIndex((h) => h.includes("email"));
      const idxNis = header.findIndex((h) => h === "nis" || h.includes("nis"));
      if (idxName < 0) return { ok: false as const, error: "kolom_nama_wajib" as const };

      const existing = await db.query.tmbBatchStudents.findMany({
        where: eq(tmbBatchStudents.batchId, input.batchId),
        columns: { email: true, nis: true },
      });
      const seenEmail = new Set(existing.map((s) => (s.email ?? "").toLowerCase()).filter(Boolean));
      const seenNis = new Set(existing.map((s) => (s.nis ?? "").trim()).filter(Boolean));

      const toInsert: any[] = [];
      const failed: { row: number; reason: string }[] = [];
      let skipped = 0;
      const data = rows.slice(1);
      if (data.length > 500) return { ok: false as const, error: "terlalu_banyak_baris" as const };

      data.forEach((r, i) => {
        const line = i + 2; // nomor baris di file (1-based + header)
        const name = (r[idxName] ?? "").trim();
        if (!name) {
          failed.push({ row: line, reason: "nama kosong" });
          return;
        }
        const email = (idxEmail >= 0 ? (r[idxEmail] ?? "").trim().toLowerCase() : "") || "";
        const nis = (idxNis >= 0 ? (r[idxNis] ?? "").trim() : "") || "";
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          failed.push({ row: line, reason: "email tidak valid" });
          return;
        }
        if ((email && seenEmail.has(email)) || (nis && seenNis.has(nis))) {
          skipped++;
          return;
        }
        if (email) seenEmail.add(email);
        if (nis) seenNis.add(nis);
        toInsert.push({
          id: randomUUID(),
          batchId: input.batchId,
          name,
          email: email || null,
          nis: nis || null,
          status: "invited",
        });
      });

      if (toInsert.length) await db.insert(tmbBatchStudents).values(toInsert);
      return { ok: true as const, imported: toInsert.length, skipped, failed };
    }),

  /**
   * (M2.3) Atur jadwal tes kelas.
   * `mode: "anytime"` → boleh dikerjakan di dalam rentang (tanggal saja cukup).
   * `mode: "scheduled"` → serentak pada jam tertentu (tanggal + jam).
   * `mode: "off"` → hapus jadwal (tes bebas kapan saja).
   */
  cohortSchedule: protectedProcedure
    .input(
      z.object({
        batchId: z.string().min(1),
        mode: z.enum(["anytime", "scheduled", "off"]),
        startISO: z.string().datetime({ offset: true }).optional().nullable(),
        endISO: z.string().datetime({ offset: true }).optional().nullable(),
      }),
    )
    .handler(async ({ input, context }) => {
      const g = await activeSchool(context.session.user.id);
      if ("error" in g) return { ok: false as const, ...g };
      if (!isManager(g.member)) return { ok: false as const, error: "hanya_admin" as const };
      const owned = await ownedBatch(input.batchId, g.schoolId);
      if (!owned) return { ok: false as const, error: "not_found" as const };

      if (input.mode === "off") {
        await db
          .update(tmbBatches)
          .set({ scheduleMode: "anytime", windowStart: null, windowEnd: null })
          .where(eq(tmbBatches.id, input.batchId));
        return { ok: true as const, windowState: "tanpa_jadwal" as const };
      }

      const start = input.startISO ? new Date(input.startISO) : null;
      const end = input.endISO ? new Date(input.endISO) : null;
      if (!start || !end) return { ok: false as const, error: "jadwal_kosong" as const };
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return { ok: false as const, error: "jadwal_invalid" as const };
      }
      if (end.getTime() <= start.getTime())
        return { ok: false as const, error: "selesai_harus_setelah_mulai" as const };

      await db
        .update(tmbBatches)
        .set({ scheduleMode: input.mode, windowStart: start, windowEnd: end })
        .where(eq(tmbBatches.id, input.batchId));
      return { ok: true as const, windowState: windowState({ windowStart: start, windowEnd: end }) };
    }),

  /**
   * (M2.5) Hasil lengkap satu peserta: skor per dimensi, Holland, rekomendasi.
   * Siswa hanya bisa dibuka kalau memang anggota kelas milik sekolah ini.
   */
  participantResult: protectedProcedure
    .input(z.object({ batchId: z.string().min(1), participantId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const g = await activeSchool(context.session.user.id);
      if ("error" in g) return { ok: false as const, ...g };
      const owned = await ownedBatch(input.batchId, g.schoolId);
      if (!owned) return { ok: false as const, error: "not_found" as const };
      const student = await db.query.tmbBatchStudents.findFirst({
        where: and(eq(tmbBatchStudents.id, input.participantId), eq(tmbBatchStudents.batchId, input.batchId)),
      });
      if (!student) return { ok: false as const, error: "not_found" as const };
      if (!student.resultId) {
        return {
          ok: true as const,
          participant: {
            id: student.id,
            name: student.name,
            email: student.email,
            nis: student.nis,
            status: student.status,
          },
          result: null,
          majors: [] as any[],
          careers: [] as any[],
        };
      }
      const resultId = student.resultId;
      const [result, recos] = await Promise.all([
        db.query.tmbAssessmentResults.findFirst({ where: eq(tmbAssessmentResults.id, resultId) }),
        db.query.tmbRecommendations.findMany({
          where: eq(tmbRecommendations.resultId, resultId),
          orderBy: asc(tmbRecommendations.rank),
        }),
      ]);
      return {
        ok: true as const,
        participant: {
          id: student.id,
          name: student.name,
          email: student.email,
          nis: student.nis,
          status: student.status,
        },
        result: result
          ? {
              hollandCode: result.hollandCode,
              hollandScores: result.hollandScores,
              abilityScores: result.abilityScores,
              confidenceScore: result.confidenceScore,
              differentiation: result.differentiation,
              dimStats: result.dimStats,
              completedAt: result.createdAt,
            }
          : null,
        majors: recos
          .filter((r) => r.type === "major")
          .map((r) => ({ rank: r.rank, name: r.itemName, confidence: r.confidence })),
        careers: recos
          .filter((r) => r.type === "career")
          .map((r) => ({ rank: r.rank, name: r.itemName, confidence: r.confidence })),
      };
    }),

  /**
   * (M3.1) Insight satu kelas: distribusi Holland, jurusan/karier teratas,
   * kemampuan per dimensi, dan daftar peserta yang perlu perhatian.
   */
  cohortInsight: protectedProcedure
    .input(z.object({ batchId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const g = await activeSchool(context.session.user.id);
      if ("error" in g) return { ok: false as const, ...g };
      const owned = await ownedBatch(input.batchId, g.schoolId);
      if (!owned) return { ok: false as const, error: "not_found" as const };
      const data = await computeCohortInsight(input.batchId, g.org?.name ?? null, {
        id: owned.id,
        name: owned.name,
        className: owned.className,
        major: owned.major,
      });
      return { ok: true as const, ...data };
    }),

  /**
   * (M3.3) Simpan snapshot laporan insight kelas (angka "dibekukan").
   */
  saveReport: protectedProcedure
    .input(z.object({ batchId: z.string().min(1), note: z.string().max(300).optional() }))
    .handler(async ({ input, context }) => {
      const g = await activeSchool(context.session.user.id);
      if ("error" in g) return { ok: false as const, ...g };
      const owned = await ownedBatch(input.batchId, g.schoolId);
      if (!owned) return { ok: false as const, error: "not_found" as const };
      const schoolId = g.schoolId;
      if (!schoolId) return { ok: false as const, error: "belum_aktif" as const };

      const data = await computeCohortInsight(input.batchId, g.org?.name ?? null, {
        id: owned.id,
        name: owned.name,
        className: owned.className,
        major: owned.major,
      });
      if (!data.counts.completed) return { ok: false as const, error: "belum_ada_hasil" as const };

      const id = randomUUID();
      await db.insert(assessmentCohortReports).values({
        id,
        batchId: input.batchId,
        orgId: schoolId,
        createdBy: context.session.user.id,
        periodStart: data.range.first ? new Date(data.range.first) : null,
        periodEnd: data.range.last ? new Date(data.range.last) : null,
        snapshot: data,
        note: input.note?.trim() || null,
      });
      return { ok: true as const, id };
    }),

  /** Riwayat snapshot laporan satu kelas (terbaru dulu). */
  reports: protectedProcedure.input(z.object({ batchId: z.string().min(1) })).handler(async ({ input, context }) => {
    const g = await activeSchool(context.session.user.id);
    if ("error" in g) return { ok: false as const, ...g };
    const owned = await ownedBatch(input.batchId, g.schoolId);
    if (!owned) return { ok: false as const, error: "not_found" as const };
    const schoolId = g.schoolId;
    if (!schoolId) return { ok: false as const, error: "belum_aktif" as const };
    const rows = await db.query.assessmentCohortReports.findMany({
      where: and(eq(assessmentCohortReports.batchId, input.batchId), eq(assessmentCohortReports.orgId, schoolId)),
      orderBy: desc(assessmentCohortReports.createdAt),
      limit: 30,
    });
    return {
      ok: true as const,
      items: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        note: r.note,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        completed: (r.snapshot as any)?.counts?.completed ?? 0,
        total: (r.snapshot as any)?.counts?.total ?? 0,
      })),
    };
  }),

  /** Ambil satu snapshot (untuk cetak ulang PDF-nya). */
  report: protectedProcedure.input(z.object({ id: z.string().min(1) })).handler(async ({ input, context }) => {
    const g = await activeSchool(context.session.user.id);
    if ("error" in g) return { ok: false as const, ...g };
    const schoolId = g.schoolId;
    if (!schoolId) return { ok: false as const, error: "belum_aktif" as const };
    const row = await db.query.assessmentCohortReports.findFirst({
      where: and(eq(assessmentCohortReports.id, input.id), eq(assessmentCohortReports.orgId, schoolId)),
    });
    if (!row) return { ok: false as const, error: "not_found" as const };
    return { ok: true as const, snapshot: row.snapshot, note: row.note, createdAt: row.createdAt };
  }),

  /** (M2.5) Rekap kelas untuk export Excel — hanya kelas milik sekolah pemanggil. */
  exportRekap: protectedProcedure
    .input(z.object({ batchId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const g = await activeSchool(context.session.user.id);
      if ("error" in g) return { ok: false as const, ...g };
      const owned = await ownedBatch(input.batchId, g.schoolId);
      if (!owned) return { ok: false as const, error: "not_found" as const };
      const { rows, batch } = await buildBatchRekap(input.batchId);
      return { ok: true as const, rows, batch };
    }),

  /**
   * (M2.2) Link & teks undangan siap-bagikan (WA/email).
   * (M2.4) `participantId` opsional → teks dipersonalisasi dengan nama siswa
   * (dipakai tombol "Ingatkan" per peserta).
   */
  invite: protectedProcedure
    .input(z.object({ batchId: z.string().min(1), participantId: z.string().optional() }))
    .handler(async ({ input, context }) => {
      const g = await activeSchool(context.session.user.id);
      if ("error" in g) return { ok: false as const, ...g };
      const owned = await ownedBatch(input.batchId, g.schoolId);
      if (!owned) return { ok: false as const, error: "not_found" as const };

      let studentName: string | null = null;
      let personalCode: string | null = null;
      if (input.participantId) {
        const row = await db.query.tmbBatchStudents.findFirst({
          where: and(eq(tmbBatchStudents.id, input.participantId), eq(tmbBatchStudents.batchId, input.batchId)),
          columns: { name: true, email: true, claimCode: true },
        });
        if (!row) return { ok: false as const, error: "not_found" as const };
        studentName = row.name;
        // (M2.6) peserta tanpa email → sediakan kode akses personal sekali pakai
        if (!row.email) personalCode = row.claimCode ?? (await ensureClaimCode(input.participantId));
      }

      const base = (process.env.APP_URL || "http://localhost:3001").replace(/\/$/, "");
      const link = `${base}/assessment/invite/${personalCode ?? owned.inviteCode ?? ""}`;
      const school = g.org?.name ?? "sekolah";
      const sapaan = studentName ? `Halo ${studentName}!` : "Halo!";
      const akses = personalCode
        ? `Kode aksesmu: *${personalCode}* (pakai sekali). Buka link di bawah, daftar/masuk dengan email apa pun, lalu kode ini otomatis mengaitkan akunmu ke kelas.\n\n`
        : "Buka link ini lalu masuk/daftar dengan email yang terdaftar di sekolah:\n";
      const waText =
        `${sapaan} Kamu diundang mengerjakan Tes Minat & Bakat di MULAI+ untuk kelas *${owned.name}* (${school}).\n\n` +
        `${akses}${link}\n\n` +
        "Tes ±30–45 menit, hasilnya langsung muncul dan dipakai untuk bimbingan jurusan. Terima kasih!";
      return { ok: true as const, code: owned.inviteCode ?? null, link, waText, studentName, claimCode: personalCode };
    }),

  /** (M4.1) Daftar tim sekolah + undangan yang masih pending. */
  team: protectedProcedure.handler(async ({ context }) => {
    await consumeInvites(context.session.user.id);
    const g = await activeSchool(context.session.user.id);
    if ("error" in g) return { ok: false as const, ...g };
    const members = await db
      .select({
        userId: assessmentOrgMembers.userId,
        role: assessmentOrgMembers.role,
        status: assessmentOrgMembers.status,
        createdAt: assessmentOrgMembers.createdAt,
        name: user.name,
        email: user.email,
      })
      .from(assessmentOrgMembers)
      .leftJoin(user, eq(user.id, assessmentOrgMembers.userId))
      .where(eq(assessmentOrgMembers.orgId, g.org.id))
      .orderBy(asc(assessmentOrgMembers.createdAt));
    const invites = await db.query.assessmentOrgInvites.findMany({
      where: and(eq(assessmentOrgInvites.orgId, g.org.id), eq(assessmentOrgInvites.status, "pending")),
      orderBy: desc(assessmentOrgInvites.createdAt),
    });
    return {
      ok: true as const,
      me: { userId: context.session.user.id, role: g.member.role, canManage: isManager(g.member) },
      members: members.map((m) => ({
        userId: m.userId,
        name: m.name ?? "—",
        email: m.email ?? null,
        role: m.role,
        status: m.status,
        createdAt: m.createdAt,
      })),
      invites: invites.map((i) => ({ id: i.id, email: i.email, role: i.role, createdAt: i.createdAt })),
    };
  }),

  /** (M4.1) Undang rekan (guru BK) lewat email — hanya admin sekolah. */
  invitePeer: protectedProcedure
    .input(
      z.object({
        email: z.string().trim().toLowerCase().email(),
        role: z.enum(["school_admin", "school_viewer"]).default("school_viewer"),
      }),
    )
    .handler(async ({ input, context }) => {
      const g = await activeSchool(context.session.user.id);
      if ("error" in g) return { ok: false as const, ...g };
      if (!isManager(g.member)) return { ok: false as const, error: "hanya_admin" as const };

      const members = await db
        .select({ email: user.email })
        .from(assessmentOrgMembers)
        .leftJoin(user, eq(user.id, assessmentOrgMembers.userId))
        .where(eq(assessmentOrgMembers.orgId, g.org.id));
      if (members.some((m) => (m.email ?? "").trim().toLowerCase() === input.email)) {
        return { ok: false as const, error: "sudah_anggota" as const };
      }

      const pending = await db.query.assessmentOrgInvites.findFirst({
        where: and(
          eq(assessmentOrgInvites.orgId, g.org.id),
          eq(assessmentOrgInvites.email, input.email),
          eq(assessmentOrgInvites.status, "pending"),
        ),
      });
      if (pending) return { ok: false as const, error: "sudah_diundang" as const };

      const id = randomUUID();
      await db.insert(assessmentOrgInvites).values({
        id,
        orgId: g.org.id,
        email: input.email,
        role: input.role,
        invitedBy: context.session.user.id,
      });
      const base = (process.env.APP_URL || "http://localhost:3001").replace(/\/$/, "");
      return {
        ok: true as const,
        id,
        link: `${base}/sekolah`,
        note: "Rekan perlu punya akun MULAI+ dengan email tersebut, lalu membuka portal sekolah untuk mengaktifkan akses.",
      };
    }),

  /** (M4.1) Batalkan undangan yang belum diklaim — hanya admin sekolah. */
  revokeInvite: protectedProcedure.input(z.object({ id: z.string().min(1) })).handler(async ({ input, context }) => {
    const g = await activeSchool(context.session.user.id);
    if ("error" in g) return { ok: false as const, ...g };
    if (!isManager(g.member)) return { ok: false as const, error: "hanya_admin" as const };
    const inv = await db.query.assessmentOrgInvites.findFirst({
      where: and(eq(assessmentOrgInvites.id, input.id), eq(assessmentOrgInvites.orgId, g.org.id)),
    });
    if (!inv) return { ok: false as const, error: "not_found" as const };
    await db.update(assessmentOrgInvites).set({ status: "revoked" }).where(eq(assessmentOrgInvites.id, input.id));
    return { ok: true as const };
  }),

  overview: protectedProcedure.handler(async ({ context }) => {
    await consumeInvites(context.session.user.id);
    const { member, org } = await orgOfUser(context.session.user.id);
    if (!member || !org) return { ok: false as const, error: "belum_terdaftar" as const };
    if (member.status !== "aktif" || org.status !== "aktif") {
      return { ok: false as const, error: "belum_aktif" as const, status: org.status, memberStatus: member.status };
    }

    const batches = org.schoolId
      ? await db.query.tmbBatches.findMany({
          where: eq(tmbBatches.schoolId, org.schoolId),
          orderBy: desc(tmbBatches.createdAt),
        })
      : [];
    const batchIds = batches.map((b) => b.id);
    const students = batchIds.length
      ? await db.query.tmbBatchStudents.findMany({ where: inArray(tmbBatchStudents.batchId, batchIds) })
      : [];
    const resultIds = [...new Set(students.map((s) => s.resultId).filter(Boolean))] as string[];
    const results = resultIds.length
      ? await db.query.tmbAssessmentResults.findMany({
          where: inArray(tmbAssessmentResults.id, resultIds),
          columns: { id: true, hollandCode: true, createdAt: true },
        })
      : [];
    const hollandOf = new Map(results.map((r) => [r.id, r.hollandCode ?? ""]));

    const hollandDistribution: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    for (const s of students) {
      const code = s.resultId ? hollandOf.get(s.resultId) : "";
      const top = (code ?? "").slice(0, 1).toUpperCase();
      if (top && top in hollandDistribution) hollandDistribution[top] = (hollandDistribution[top] ?? 0) + 1;
    }

    const selesai = students.filter((s) => s.status === "completed").length;
    const mulai = students.filter((s) => s.status === "in_progress").length;

    return {
      ok: true as const,
      org: { id: org.id, name: org.name, type: org.type, city: org.city, schoolId: org.schoolId ?? null },
      member: { role: member.role, status: member.status },
      totals: {
        peserta: students.length,
        selesai,
        mulai,
        belum: students.length - selesai - mulai,
      },
      batches: batches.map((b) => {
        const rows = students.filter((s) => s.batchId === b.id);
        return {
          id: b.id,
          name: b.name,
          className: b.className,
          major: b.major,
          total: rows.length,
          selesai: rows.filter((s) => s.status === "completed").length,
        };
      }),
      hollandDistribution,
    };
  }),
};

export const schoolAdminRouter = {
  /** Daftar pendaftaran sekolah per status (default: menunggu persetujuan). */
  registrations: adminProcedure
    .input(
      z.object({ status: z.enum(["pending", "aktif", "ditolak", "nonaktif", "semua"]).default("pending") }).optional(),
    )
    .handler(async ({ input }) => {
      const status = input?.status ?? "pending";
      const orgs = await db.query.assessmentOrgs.findMany({
        where: status === "semua" ? undefined : eq(assessmentOrgs.status, status),
        orderBy: desc(assessmentOrgs.createdAt),
      });
      if (!orgs.length) return { items: [] as any[] };

      const members = await db.query.assessmentOrgMembers.findMany({
        where: inArray(
          assessmentOrgMembers.orgId,
          orgs.map((o) => o.id),
        ),
      });
      const userIds = [...new Set(members.map((m) => m.userId))];
      const users = userIds.length
        ? await db.query.user.findMany({
            where: inArray(user.id, userIds),
            columns: { id: true, name: true, email: true, role: true },
          })
        : [];
      const userById = new Map(users.map((u) => [u.id, u]));

      return {
        items: orgs.map((o) => {
          const m = members.find((x) => x.orgId === o.id) ?? null;
          return {
            ...o,
            member: m ? { id: m.id, role: m.role, status: m.status, userId: m.userId } : null,
            user: m ? (userById.get(m.userId) ?? null) : null,
          };
        }),
      };
    }),

  /**
   * Setujui pendaftaran: organisasi + anggota jadi `aktif`, akun naik ke role
   * `school_admin` (kecuali admin/program manager MULAI+), dan sekolah disambungkan
   * ke `tmb_schools` (dibuatkan bila belum ada) supaya data batch/roster-nya terlihat.
   */
  approve: adminProcedure
    .input(z.object({ orgId: z.string().min(1), note: z.string().trim().max(300).optional() }))
    .handler(async ({ input, context }) => {
      const org = await db.query.assessmentOrgs.findFirst({ where: eq(assessmentOrgs.id, input.orgId) });
      if (!org) notFound("Pendaftaran sekolah tidak ditemukan");
      const member = await db.query.assessmentOrgMembers.findFirst({
        where: eq(assessmentOrgMembers.orgId, org.id),
      });
      if (!member) preconditionFailed("Pendaftaran tidak punya anggota");

      // 1) sambungkan ke sekolah legacy (pakai yang sudah ada kalau namanya sama)
      let schoolId = org.schoolId;
      let schoolCreated = false;
      if (!schoolId) {
        const found = await findLegacySchoolByName(org.name);
        if (found) {
          schoolId = found.id;
        } else {
          schoolId = randomUUID();
          await db.insert(tmbSchools).values({
            id: schoolId,
            name: org.name,
            city: org.city ?? null,
            address: org.address ?? null,
            email: org.picEmail ?? null,
            phone: org.picPhone ?? null,
            status: "aktif",
            notes: `Dibuat otomatis dari pendaftaran B2B ${new Date().toISOString().slice(0, 10)}`,
          });
          schoolCreated = true;
        }
      }

      // 2) aktifkan organisasi + anggota
      await db
        .update(assessmentOrgs)
        .set({
          status: "aktif",
          schoolId,
          note: input.note ?? null,
          approvedBy: context.session.user.id,
          approvedAt: new Date(),
        })
        .where(eq(assessmentOrgs.id, org.id));
      await db.update(assessmentOrgMembers).set({ status: "aktif" }).where(eq(assessmentOrgMembers.id, member.id));

      // 3) naikkan role akun (kecuali role platform MULAI+)
      const target = await db.query.user.findFirst({
        where: eq(user.id, member.userId),
        columns: { id: true, role: true, name: true, email: true },
      });
      let roleChanged = false;
      if (target && !["school_admin", "admin", "program_manager"].includes(target.role)) {
        await db.update(user).set({ role: "school_admin" }).where(eq(user.id, target.id));
        roleChanged = true;
      }

      notifyDiscord({
        webhookUrl: (context.env as { DISCORD_WEBHOOK_URL?: string } | undefined)?.DISCORD_WEBHOOK_URL,
        event: "school.approved",
        title: "✅ Sekolah disetujui",
        description: `${org.name} sekarang aktif sebagai mitra B2B.`,
        fields: [
          { name: "Sekolah", value: org.name, inline: true },
          { name: "Akun", value: `${target?.name ?? "-"} · ${target?.email ?? "-"}`, inline: true },
          { name: "Role dinaikkan", value: roleChanged ? "ya" : "tidak (sudah role lain)", inline: true },
          { name: "Sekolah legacy", value: schoolCreated ? "dibuat baru" : `ditautkan (${schoolId})`, inline: false },
        ],
        throttleMs: 0,
        waitUntil: context.executionCtx?.waitUntil,
      });

      return { ok: true as const, orgId: org.id, schoolId, schoolCreated, roleChanged };
    }),

  /** Tolak pendaftaran (akun tidak jadi admin sekolah; role tidak diubah). */
  reject: adminProcedure
    .input(z.object({ orgId: z.string().min(1), note: z.string().trim().max(300).optional() }))
    .handler(async ({ input }) => {
      const org = await db.query.assessmentOrgs.findFirst({ where: eq(assessmentOrgs.id, input.orgId) });
      if (!org) notFound("Pendaftaran sekolah tidak ditemukan");
      await db
        .update(assessmentOrgs)
        .set({ status: "ditolak", note: input.note ?? null })
        .where(eq(assessmentOrgs.id, org.id));
      await db.update(assessmentOrgMembers).set({ status: "ditolak" }).where(eq(assessmentOrgMembers.orgId, org.id));
      return { ok: true as const, orgId: org.id };
    }),

  /** Ubah status sekolah aktif/nonaktif (nonaktif = akses data sekolah ditutup). */
  setStatus: adminProcedure
    .input(z.object({ orgId: z.string().min(1), status: z.enum(["aktif", "nonaktif"]) }))
    .handler(async ({ input }) => {
      const org = await db.query.assessmentOrgs.findFirst({ where: eq(assessmentOrgs.id, input.orgId) });
      if (!org) notFound("Sekolah tidak ditemukan");
      await db.update(assessmentOrgs).set({ status: input.status }).where(eq(assessmentOrgs.id, org.id));
      return { ok: true as const, orgId: org.id, status: input.status };
    }),
};
