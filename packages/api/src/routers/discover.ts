import { db, eq, inArray, and, asc, desc } from "@mulai-plus/db/db";
import { schema } from "@mulai-plus/db/db";
import { z } from "zod";
import { adminProcedure, publicProcedure } from "../index";

/**
 * Discover™ — Assessment Engine (Fase 0).
 * Alur minimal: config → start(lock versi) → submit(sum) → finish(top-N + profile).
 * Admin: list versions, create draft vN (snapshot), publish (gatekeeper v1).
 * TIDAK mengubah alur tmb_* existing.
 */

function uid(len = 24): string {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

interface VersionRow {
  id: string;
  versionNumber: number;
  status: string;
  configJson: any;
}
interface QuestionRow {
  id: string;
  dimensionId: string;
  scaleId: string | null;
  questionCode: string | null;
  questionText: string;
  hasMathNotation: boolean;
  mediaUrl: string | null;
  mediaCaption: string | null;
  mediaPosition: string | null;
  altText: string | null;
  questionType: string;
  presentationMode: string;
  displayOrder: number;
  isActive: boolean;
  opts?: any[];
}

async function getLiveVersion(code: string): Promise<VersionRow | null> {
  const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, code) });
  if (!a) return null;
  return (await db.query.assessmentVersions.findFirst({
    where: and(eq(schema.assessmentVersions.assessmentId, a.id), eq(schema.assessmentVersions.status, "live")),
    orderBy: (t) => [desc(t.versionNumber)],
  })) as VersionRow | null;
}

async function questionsOf(versionId: string): Promise<QuestionRow[]> {
  const qs = await db.query.questions.findMany({
    where: eq(schema.questions.versionId, versionId),
    orderBy: asc(schema.questions.displayOrder),
  });
  const ids = qs.map((q) => q.id);
  const opts = ids.length
    ? await db.query.questionOptions.findMany({
        where: inArray(schema.questionOptions.questionId, ids),
        orderBy: asc(schema.questionOptions.displayOrder),
      })
    : [];
  const byQ = new Map<string, any[]>();
  for (const o of opts) {
    const arr = byQ.get(o.questionId) ?? [];
    arr.push(o);
    byQ.set(o.questionId, arr);
  }
  return qs.map((q) => ({ ...q, opts: byQ.get(q.id) ?? [] }));
}

// ─── Publik ─────────────────────────────────────────────

export const discoverRouter = {
  /** Konten asesmen versi LIVE (config + dims + soals). */
  config: publicProcedure
    .input(z.object({ code: z.string().default("DISCOVER") }))
    .handler(async ({ input }) => {
      const v = await getLiveVersion(input.code);
      if (!v) return { ok: false, error: "assessment_not_found" } as const;
      const dimensions = await db.query.assessmentDimensions.findMany({
        where: eq(schema.assessmentDimensions.versionId, v.id),
        orderBy: asc(schema.assessmentDimensions.displayOrder),
      });
      const sections = await db.query.assessmentSections.findMany({
        where: eq(schema.assessmentSections.versionId, v.id),
        orderBy: asc(schema.assessmentSections.displayOrder),
      });
      const questions = await questionsOf(v.id);
      return {
        ok: true,
        version: { id: v.id, number: v.versionNumber, status: v.status },
        config: v.configJson,
        dimensions,
        sections,
        questions,
      };
    }),

  /** Mulai sesi — lock versi live terbaru. */
  start: publicProcedure
    .input(z.object({ code: z.string().default("DISCOVER"), studentId: z.string().min(1) }))
    .handler(async ({ input }) => {
      const v = await getLiveVersion(input.code);
      if (!v) return { ok: false, error: "assessment_not_found" } as const;
      const session = {
        id: uid(),
        studentId: input.studentId,
        versionId: v.id,
        status: "in_progress",
        configJson: v.configJson,
      };
      await db.insert(schema.assessmentSessions).values(session as any);
      return { ok: true, sessionId: session.id, versionId: v.id };
    }),

  /** Simpan satu jawaban (upsert). */
  submit: publicProcedure
    .input(
      z.object({
        sessionId: z.string().min(1),
        questionId: z.string().min(1),
        optionId: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const sess = await db.query.assessmentSessions.findFirst({
        where: eq(schema.assessmentSessions.id, input.sessionId),
      });
      if (!sess) return { ok: false, error: "session_not_found" } as const;
      if (sess.status !== "in_progress") return { ok: false, error: "session_closed" } as const;
      const opt = await db.query.questionOptions.findFirst({
        where: eq(schema.questionOptions.id, input.optionId),
      });
      if (!opt || opt.questionId !== input.questionId) return { ok: false, error: "option_mismatch" } as const;

      const existing = await db.query.assessmentAnswers.findFirst({
        where: and(
          eq(schema.assessmentAnswers.sessionId, input.sessionId),
          eq(schema.assessmentAnswers.questionId, input.questionId),
        ),
      });
      if (existing) {
        await db
          .update(schema.assessmentAnswers)
          .set({ selectedOptionId: input.optionId, scoreEarned: opt.score, answeredAt: new Date() })
          .where(eq(schema.assessmentAnswers.id, existing.id));
      } else {
        await db.insert(schema.assessmentAnswers).values({
          id: uid(),
          sessionId: input.sessionId,
          questionId: input.questionId,
          selectedOptionId: input.optionId,
          scoreEarned: opt.score,
        });
      }
      return { ok: true };
    }),

  /** Selesaikan → skor SUM per dimensi (target_dimension) → top-N → profile (tie: abjad). */
  finish: publicProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .handler(async ({ input }) => {
      const sess = await db.query.assessmentSessions.findFirst({
        where: eq(schema.assessmentSessions.id, input.sessionId),
      });
      if (!sess) return { ok: false, error: "session_not_found" } as const;
      if (sess.status === "completed") {
        const r = await db.query.assessmentResults.findFirst({
          where: eq(schema.assessmentResults.sessionId, input.sessionId),
        });
        return { ok: true, already_completed: true, result: r };
      }
      const purse = await db.query.assessmentAnswers.findMany({
        where: and(
          eq(schema.assessmentAnswers.sessionId, input.sessionId),
        ),
      });
      const optIds = purse.map((a) => a.selectedOptionId).filter(Boolean) as string[];
      const opts = optIds.length
        ? await db.query.questionOptions.findMany({ where: inArray(schema.questionOptions.id, optIds) })
        : [];

      const scores = new Map<string, number>();
      const timeStart = Date.now();
      for (const o of opts) {
        const key = o.targetDimension ?? "";
        if (!key) continue;
        scores.set(key, (scores.get(key) ?? 0) + (o.score ?? 0));
      }
      const dims = await db.query.assessmentDimensions.findMany({
        where: eq(schema.assessmentDimensions.versionId, sess.versionId),
      });
      const dimByCode = new Map(dims.map((d) => [d.id, d.code]));
      const rows = [...scores.entries()].map(([dimId, total]) => ({ dimId, total }));
      rows.sort(
        (a, b) =>
          b.total - a.total ||
          (dimByCode.get(a.dimId) ?? "").localeCompare(dimByCode.get(b.dimId) ?? ""),
      );
      const topN = Number((sess.configJson as any)?.result_dim_count ?? 3);
      const top = rows.slice(0, topN).map((r) => dimByCode.get(r.dimId) ?? r.dimId);
      const profileCode = top.join("-");

      await db.delete(schema.assessmentDimensionScores).where(eq(schema.assessmentDimensionScores.sessionId, input.sessionId));
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        await db.insert(schema.assessmentDimensionScores).values({
          id: uid(),
          sessionId: input.sessionId,
          dimensionId: row.dimId,
          totalScore: row.total,
          rank: i + 1,
          completionTimeSeconds: Math.round((Date.now() - timeStart) / 1000),
        });
      }
      const result = {
        id: uid(),
        sessionId: input.sessionId,
        profileCode,
        topDimensionsJson: top,
        rawScoresJson: Object.fromEntries([...scores.entries()]),
      };
      await db.insert(schema.assessmentResults).values(result);
      await db
        .update(schema.assessmentSessions)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(schema.assessmentSessions.id, input.sessionId));

      return { ok: true, profileCode, topDimensions: top, rawScores: result.rawScoresJson, resultId: result.id };
    }),

  /** Status sesi (utk resume Fase-1; minimal sekarang). */
  session: publicProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .handler(async ({ input }) => {
      const sess = await db.query.assessmentSessions.findFirst({
        where: eq(schema.assessmentSessions.id, input.sessionId),
      });
      if (!sess) return { ok: false, error: "session_not_found" } as const;
      const answered = await db.query.assessmentAnswers.findMany({
        where: eq(schema.assessmentAnswers.sessionId, input.sessionId),
      });
      return { ok: true, session: sess, answeredCount: answered.length };
    }),
};

// ─── Admin ─────────────────────────────────────────────

/** Gatekeeper v1 — daftar error actionable; publish ditolak bila ada error. */
export async function validatePublish(versionId: string): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const v = await db.query.assessmentVersions.findFirst({
    where: eq(schema.assessmentVersions.id, versionId),
  });
  if (!v) return { ok: false, errors: ["version_not_found"] };
  const a = await db.query.assessments.findFirst({
    where: eq(schema.assessments.id, v.assessmentId),
  });
  if (!a || !a.name || !a.code) errors.push("Assessment wajib punya nama & kode.");
  const cfg = (v.configJson ?? {}) as any;
  const totalDim = Number(cfg.total_dim ?? 0);
  const resultCount = Number(cfg.result_dim_count ?? 0);
  const minQ = Number(cfg.min_q_per_dim ?? 0);
  if (!totalDim) errors.push("total_dim tidak valid.");
  if (!resultCount || resultCount > totalDim) errors.push(`result_dim_count (${resultCount}) harus ≤ total_dim (${totalDim}).`);

  const dims = await db.query.assessmentDimensions.findMany({ where: eq(schema.assessmentDimensions.versionId, versionId) });
  const activeDims = dims.filter((d) => d.isActive);
  if (activeDims.length !== totalDim)
    errors.push(`Dimensi aktif (${activeDims.length}) harus sesuai total_dim (${totalDim}).`);

  const questions = await db.query.questions.findMany({ where: eq(schema.questions.versionId, versionId) });
  const activeQs = questions.filter((q) => q.isActive);
  const qIds = activeQs.map((q) => q.id);
  const opts = qIds.length
    ? await db.query.questionOptions.findMany({ where: inArray(schema.questionOptions.questionId, qIds) })
    : [];
  const orderSeen = new Set<string>();
  for (const q of activeQs) {
    if (!q.dimensionId) errors.push(`Soal ${q.questionCode ?? q.id} belum punya dimensi.`);
    if (!q.scaleId && q.questionType === "multiple_choice") errors.push(`Soal ${q.questionCode ?? q.id} belum punya answer scale.`);
    const o = opts.filter((x) => x.questionId === q.id);
    if (o.length < 2) errors.push(`Soal "${q.questionCode ?? q.id}" butuh minimal 2 opsi aktif (kini ${o.length}).`);
    for (const oo of o) if (!oo.label) errors.push(`Opsi pada soal ${q.questionCode ?? q.id} harus punya label.`);
    const key = `${q.dimensionId}:${q.displayOrder}`;
    if (orderSeen.has(key)) errors.push(`Display order konflik pada dimensi soal ${q.questionCode ?? q.id}.`);
    orderSeen.add(key);
  }
  if (minQ > 0) {
    const perDim = new Map<string, number>();
    for (const q of activeQs) perDim.set(q.dimensionId, (perDim.get(q.dimensionId) ?? 0) + 1);
    for (const d of activeDims) {
      const n = perDim.get(d.id) ?? 0;
      if (n < minQ) errors.push(`Dimensi ${d.name} (${d.code}) butuh minimal ${minQ} soal aktif (kini ${n}).`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export const discoverAdminRouter = {
  list: adminProcedure.handler(async () => {
    const assessments = await db.query.assessments.findMany({ orderBy: asc(schema.assessments.code) });
    const versions = await db.query.assessmentVersions.findMany({ orderBy: asc(schema.assessmentVersions.versionNumber) });
    return { assessments, versions };
  }),
  versions: {
    list: adminProcedure
      .input(z.object({ assessmentId: z.string().min(1) }).or(z.object({ code: z.string().min(1) })))
      .handler(async ({ input }) => {
        const aid =
          "assessmentId" in input
            ? input.assessmentId
            : (await db.query.assessments.findFirst({ where: eq(schema.assessments.code, input.code) }))?.id;
        if (!aid) return { items: [] };
        const items = await db.query.assessmentVersions.findMany({
          where: eq(schema.assessmentVersions.assessmentId, aid),
          orderBy: (t) => [desc(t.versionNumber)],
        });
        return { items };
      }),
    /** Snapshot struktural versi live → draft vN (copy dims/questions/options/sections). */
    createDraft: adminProcedure
      .input(z.object({ code: z.string().min(1) }))
      .handler(async ({ input }) => {
        const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, input.code) });
        if (!a) return { ok: false, error: "assessment_not_found" } as const;
        const live = await getLiveVersion(input.code);
        if (!live) return { ok: false, error: "no_live_version" } as const;
        const newVerId = uid();
        await db.insert(schema.assessmentVersions).values({
          id: newVerId,
          assessmentId: a.id,
          versionNumber: live.versionNumber + 1,
          status: "draft",
          configJson: live.configJson,
        });
        // copy dims
        const dims = await db.query.assessmentDimensions.findMany({ where: eq(schema.assessmentDimensions.versionId, live.id) });
        const dimMap = new Map<string, string>();
        for (const d of dims) {
          const nd = uid();
          dimMap.set(d.id, nd);
          await db.insert(schema.assessmentDimensions).values({ ...d, id: nd, versionId: newVerId });
        }
        // copy questions + options
        const qs = await questionsOf(live.id);
        for (const q of qs) {
          const nq = uid();
          await db.insert(schema.questions).values({
            id: nq,
            versionId: newVerId,
            dimensionId: dimMap.get(q.dimensionId) ?? q.dimensionId,
            scaleId: q.scaleId,
            questionCode: q.questionCode,
            questionText: q.questionText,
            hasMathNotation: q.hasMathNotation,
            mediaUrl: q.mediaUrl,
            mediaCaption: q.mediaCaption,
            altText: q.altText,
            questionType: q.questionType as any,
            presentationMode: q.presentationMode as any,
            mediaPosition: (q.mediaPosition ?? null) as any,
            displayOrder: q.displayOrder,
            isActive: q.isActive,
          });
          for (const o of q.opts ?? []) {
            await db.insert(schema.questionOptions).values({
              id: uid(),
              questionId: nq,
              optionValue: o.optionValue,
              targetDimension: o.targetDimension,
              label: o.label,
              hasMathNotation: o.hasMathNotation,
              imageUrl: o.imageUrl,
              score: o.score,
              displayOrder: o.displayOrder,
            });
          }
        }
        return { ok: true, versionId: newVerId, versionNumber: live.versionNumber + 1 };
      }),
    /** Publish draft → live; versi live sebelumnya → archived. Gatekeeper v1. */
    publish: adminProcedure
      .input(z.object({ versionId: z.string().min(1) }))
      .handler(async ({ input }) => {
        const v = await db.query.assessmentVersions.findFirst({ where: eq(schema.assessmentVersions.id, input.versionId) });
        if (!v) return { ok: false, error: "version_not_found" } as const;
        const check = await validatePublish(input.versionId);
        if (!check.ok) return { ok: false, errors: check.errors } as const;
        await db
          .update(schema.assessmentVersions)
          .set({ status: "archived" })
          .where(and(eq(schema.assessmentVersions.assessmentId, v.assessmentId), eq(schema.assessmentVersions.status, "live")));
        await db
          .update(schema.assessmentVersions)
          .set({ status: "live", publishedAt: new Date() })
          .where(eq(schema.assessmentVersions.id, input.versionId));
        return { ok: true, versionId: input.versionId };
      }),
  },
};