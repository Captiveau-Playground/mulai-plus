import { db, eq, inArray, and, asc, desc } from "@mulai-plus/db/db";
import { schema } from "@mulai-plus/db/db";
import { z } from "zod";
import { adminProcedure, publicProcedure } from "../index";
import { publishVersion } from "../lib/assessment-gate";
import { evaluateTextInput } from "../lib/evaluate-input";

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
      const dimIds = dimensions.map((d) => d.id);
      const instructions = dimIds.length
        ? await db.query.dimensionInstructions.findMany({ where: inArray(schema.dimensionInstructions.dimensionId, dimIds) })
        : [];
      return {
        ok: true,
        version: { id: v.id, number: v.versionNumber, status: v.status },
        config: v.configJson,
        dimensions,
        sections,
        instructions,
        questions,
      };
    }),

  /** Mulai sesi — lock versi live terbaru. */
  start: publicProcedure
    .input(z.object({ code: z.string().default("DISCOVER"), studentId: z.string().min(1) }))
    .handler(async ({ input }) => {
      const v = await getLiveVersion(input.code);
      if (!v) return { ok: false, error: "assessment_not_found" } as const;
      const c = (v.configJson ?? {}) as any;
      let serverTimer: Record<string, unknown> | undefined;
      if (c?.timer_enabled === true) {
        const scope = c?.timer_scope ?? "none";
        let totalSeconds = 0;
        if (scope === "dimension") {
          const dims = await db.query.assessmentDimensions.findMany({
            where: eq(schema.assessmentDimensions.versionId, v.id),
            columns: { durationSeconds: true },
          });
          totalSeconds = dims.reduce((s, d) => s + (d.durationSeconds ?? 0), 0);
        } else if (scope === "question") {
          const qs = await db.query.questions.findMany({
            where: eq(schema.questions.versionId, v.id),
            columns: { id: true },
          });
          const perQ = Number(c?.time_per_question ?? 30);
          totalSeconds = qs.length * perQ;
        }
        serverTimer = {
          scope,
          totalSeconds,
          serverNowISO: new Date().toISOString(),
          expectedEndISO: new Date(Date.now() + totalSeconds * 1000).toISOString(),
        };
      }
      const session = {
        id: uid(),
        studentId: input.studentId,
        versionId: v.id,
        status: "in_progress",
        configJson: { ...v.configJson, timer: serverTimer },
      };
      await db.insert(schema.assessmentSessions).values(session as any);
      return { ok: true, sessionId: session.id, versionId: v.id, serverTimer };
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

  /** Jawaban isian (TEXT_INPUT) — Tennessee evaluasi via lib/evaluate-input. */
  submitText: publicProcedure
    .input(z.object({ sessionId: z.string().min(1), questionId: z.string().min(1), textAnswer: z.string().min(1) }))
    .handler(async ({ input }) => {
      const sess = await db.query.assessmentSessions.findFirst({ where: eq(schema.assessmentSessions.id, input.sessionId) });
      if (!sess || sess.status !== "in_progress") return { ok: false, error: "session_not_found" } as const;
      const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, input.questionId) });
      if (!q) return { ok: false, error: "question_not_found" } as const;
      const cfg = await db.query.textInputConfigs.findFirst({ where: eq(schema.textInputConfigs.questionId, input.questionId) });
      const evalRes = cfg
        ? evaluateTextInput(
            cfg.evaluationType as any,
            cfg.answerKey,
            input.textAnswer,
            cfg.numericTolerance ?? "0.01",
          )
        : { correct: true, normalized: input.textAnswer.trim() };
      const existing = await db.query.assessmentAnswers.findFirst({
        where: and(eq(schema.assessmentAnswers.sessionId, input.sessionId), eq(schema.assessmentAnswers.questionId, input.questionId)),
      });
      const scoreEarned = evalRes.correct ? 1 : 0;
      if (existing) {
        await db.update(schema.assessmentAnswers).set({ textAnswer: input.textAnswer, scoreEarned, answeredAt: new Date() }).where(eq(schema.assessmentAnswers.id, existing.id));
      } else {
        await db.insert(schema.assessmentAnswers).values({ id: uid(), sessionId: input.sessionId, questionId: input.questionId, textAnswer: input.textAnswer, scoreEarned });
      }
      return { ok: true, correct: evalRes.correct, normalized: evalRes.normalized };
    }),

  /** Selesaikan → skor per method (SUM/AVG/WEIGHTED) → top-N → profile (tie: waktu→abjad). */
  finish: publicProcedure
    .input(z.object({ sessionId: z.string().min(1), durations: z.record(z.string(), z.number()).optional() }))
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
      const cfg = (sess.configJson ?? {}) as any;
      const method: string = cfg?.scoring_method ?? "sum";
      const purse = await db.query.assessmentAnswers.findMany({
        where: eq(schema.assessmentAnswers.sessionId, input.sessionId),
      });
      const optIds = purse.map((a) => a.selectedOptionId).filter(Boolean) as string[];
      const opts = optIds.length
        ? await db.query.questionOptions.findMany({ where: inArray(schema.questionOptions.id, optIds) })
        : [];
      const qIds = purse.map((a) => a.questionId).filter(Boolean) as string[];
      const qs = qIds.length
        ? await db.query.questions.findMany({ where: inArray(schema.questions.id, qIds), columns: { id: true, dimensionId: true, weight: true } })
        : [];
      const qBy = new Map(qs.map((q) => [q.id, q]));
      const optBy = new Map(opts.map((o) => [o.id, o]));

      // Akumulasi per dimensi: rawscore + count (utk average) + weighted
      const scores = new Map<string, number>();
      const counts = new Map<string, number>();
      for (const a of purse) {
        let dimId = "";
        let score = a.scoreEarned ?? 0;
        const q = qBy.get(a.questionId);
        if (a.selectedOptionId) {
          const o = optBy.get(a.selectedOptionId);
          dimId = o?.targetDimension ?? q?.dimensionId ?? "";
          score = o?.score ?? score;
        } else {
          dimId = q?.dimensionId ?? "";
        }
        if (!dimId) continue;
        if (method === "weighted") score = score * (q?.weight ?? 1);
        scores.set(dimId, (scores.get(dimId) ?? 0) + score);
        counts.set(dimId, (counts.get(dimId) ?? 0) + 1);
      }
      if (method === "average") {
        for (const [k, v] of scores) scores.set(k, counts.get(k) ? Math.round((v / counts.get(k)!) * 1000) / 1000 : 0);
      }
      const dims = await db.query.assessmentDimensions.findMany({
        where: eq(schema.assessmentDimensions.versionId, sess.versionId),
      });
      const dimByCode = new Map(dims.map((d) => [d.id, d.code]));
      const durations = input.durations ?? {};
      const rows = [...scores.entries()].map(([dimId, total]) => ({ dimId, total, time: durations[dimId] ?? Number.MAX_SAFE_INTEGER }));
      rows.sort(
        (a, b) =>
          b.total - a.total ||
          a.time - b.time ||
          (dimByCode.get(a.dimId) ?? "").localeCompare(dimByCode.get(b.dimId) ?? ""),
      );
      const topN = Number(cfg?.result_dim_count ?? 3);
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
          completionTimeSeconds: row.time === Number.MAX_SAFE_INTEGER ? null : row.time,
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

  /** Jeda (pause) → lanjutkan nanti. */
  pause: publicProcedure
    .input(z.object({ sessionId: z.string().min(1), currentDimensionId: z.string().optional() }))
    .handler(async ({ input }) => {
      const sess = await db.query.assessmentSessions.findFirst({ where: eq(schema.assessmentSessions.id, input.sessionId) });
      if (!sess) return { ok: false, error: "session_not_found" } as const;
      if (sess.status !== "in_progress") return { ok: false, error: "session_closed" } as const;
      await db.update(schema.assessmentSessions).set({ status: "paused", currentDimensionId: input.currentDimensionId ?? sess.currentDimensionId }).where(eq(schema.assessmentSessions.id, input.sessionId));
      return { ok: true };
    }),

  /** Sesi aktif milik siswa (resume). */
  mySessions: publicProcedure
    .input(z.object({ studentId: z.string().min(1), code: z.string().default("DISCOVER") }))
    .handler(async ({ input }) => {
      const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, input.code) });
      const vs = a ? await db.query.assessmentVersions.findMany({ where: eq(schema.assessmentVersions.assessmentId, a.id) }) : [];
      const ids = vs.map((v) => v.id);
      const items = ids.length
        ? await db.query.assessmentSessions.findMany({
            where: and(inArray(schema.assessmentSessions.versionId, ids), eq(schema.assessmentSessions.studentId, input.studentId), inArray(schema.assessmentSessions.status, ["in_progress", "paused"] as any)),
            orderBy: (t) => [desc(t.startedAt)],
          })
        : [];
      return { ok: true, items };
    }),

  /** Detail sesi + jawaban (utk resume/restore posisi). */
  session: publicProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .handler(async ({ input }) => {
      const sess = await db.query.assessmentSessions.findFirst({ where: eq(schema.assessmentSessions.id, input.sessionId) });
      if (!sess) return { ok: false, error: "session_not_found" } as const;
      const answered = await db.query.assessmentAnswers.findMany({ where: eq(schema.assessmentAnswers.sessionId, input.sessionId) });
      const byQ = answered.map((a) => ({ questionId: a.questionId, optionId: a.selectedOptionId, text: a.textAnswer }));
      return { ok: true, session: sess, status: sess.status, answers: byQ };
    }),
};

// ─── Admin ─────────────────────────────────────────────

/** ── Konten builder (admin) ── */
async function contentOfVersion(versionId: string) {
  const questions = await db.query.questions.findMany({
    where: eq(schema.questions.versionId, versionId),
    orderBy: asc(schema.questions.displayOrder),
  });
  const qIds = questions.map((q) => q.id);
  const opts = qIds.length
    ? await db.query.questionOptions.findMany({ where: inArray(schema.questionOptions.questionId, qIds), orderBy: asc(schema.questionOptions.displayOrder) })
    : [];
  const cfg = qIds.length
    ? await db.query.textInputConfigs.findMany({ where: inArray(schema.textInputConfigs.questionId, qIds) })
    : [];
  const dims = await db.query.assessmentDimensions.findMany({
    where: eq(schema.assessmentDimensions.versionId, versionId),
    orderBy: asc(schema.assessmentDimensions.displayOrder),
  });
  const scales = await db.query.answerScales.findMany({ orderBy: asc(schema.answerScales.name) });
  return { questions, options: opts, textConfigs: cfg, dimensions: dims, scales };
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
        const r = await publishVersion(input.versionId);
        if (!r.ok) return { ok: false, errors: r.errors ?? ["publish_failed"] } as const;
        return { ok: true, versionId: r.versionId };
      }),

    /** Daftar konten versi (soal+opsi+config+scales) utk builder. */
    contentList: adminProcedure
      .input(z.object({ versionId: z.string().min(1) }))
      .handler(async ({ input }) => contentOfVersion(input.versionId)),

    /** Simpan/create soal + opsi-opsi + text-input-config (upsert utk edit). */
    contentSave: adminProcedure
      .input(
        z.object({
          versionId: z.string().min(1),
          questionData: z.object({
            id: z.string().optional(),
            dimensionId: z.string().min(1),
            scaleId: z.string().optional().nullable(),
            questionText: z.string().min(1),
            questionType: z.enum(["multiple_choice", "text_input"]).default("multiple_choice"),
            hasMathNotation: z.boolean().default(false),
            mediaUrl: z.string().optional().nullable(),
            mediaCaption: z.string().optional().nullable(),
            weight: z.number().optional().default(1),
            displayOrder: z.number().optional().default(0),
            isActive: z.boolean().optional().default(true),
            options: z
              .array(
                z.object({
                  id: z.string().optional(),
                  optionValue: z.string().min(1),
                  label: z.string().min(1),
                  score: z.number().optional().default(0),
                  targetDimension: z.string().optional().nullable(),
                  displayOrder: z.number().optional().default(0),
                }),
              )
              .max(6),
            textEval: z
              .object({ evaluationType: z.string(), answerKey: z.string(), numericTolerance: z.string().optional() })
              .optional()
              .nullable(),
          }),
        }),
      )
      .handler(async ({ input }) => {
        const { versionId, questionData: q } = input;
        const qid = q.id ?? uid();
        if (!q.id) {
          await db.insert(schema.questions).values({
            id: qid,
            versionId,
            dimensionId: q.dimensionId,
            scaleId: q.scaleId ?? null,
            questionText: q.questionText,
            questionType: q.questionType as any,
            hasMathNotation: q.hasMathNotation,
            mediaUrl: q.mediaUrl ?? null,
            mediaCaption: q.mediaCaption ?? null,
            weight: q.weight,
            displayOrder: q.displayOrder,
            isActive: q.isActive,
          });
        } else {
          await db
            .update(schema.questions)
            .set({
              dimensionId: q.dimensionId,
              scaleId: q.scaleId ?? null,
              questionText: q.questionText,
              questionType: q.questionType as any,
              hasMathNotation: q.hasMathNotation,
              mediaUrl: q.mediaUrl ?? null,
              mediaCaption: q.mediaCaption ?? null,
              weight: q.weight,
              displayOrder: q.displayOrder,
              isActive: q.isActive,
            })
            .where(eq(schema.questions.id, qid));
        }
        await db.delete(schema.questionOptions).where(eq(schema.questionOptions.questionId, qid));
        for (const o of q.options) {
          await db.insert(schema.questionOptions).values({
            id: o.id ?? uid(),
            questionId: qid,
            optionValue: o.optionValue,
            targetDimension: o.targetDimension ?? q.dimensionId,
            label: o.label,
            score: o.score,
            displayOrder: o.displayOrder,
          });
        }
        await db.delete(schema.textInputConfigs).where(eq(schema.textInputConfigs.questionId, qid));
        if (q.questionType === "text_input" && q.textEval) {
          await db.insert(schema.textInputConfigs).values({
            id: uid(),
            questionId: qid,
            evaluationType: q.textEval.evaluationType as any,
            answerKey: q.textEval.answerKey,
            numericTolerance: q.textEval.numericTolerance ?? null,
          });
        }
        return { ok: true, questionId: qid };
      }),

    contentDelete: adminProcedure
      .input(z.object({ questionId: z.string().min(1) }))
      .handler(async ({ input }) => {
        await db.delete(schema.questions).where(eq(schema.questions.id, input.questionId));
        return { ok: true };
      }),

    /** Update config versi (opsional: total_dim, result_dim_count, min_q, scoring, timer, dll). */
    configUpdate: adminProcedure
      .input(
        z.object({
          versionId: z.string().min(1),
          config: z.record(z.string(), z.any()),
        }),
      )
      .handler(async ({ input }) => {
        const v = await db.query.assessmentVersions.findFirst({ where: eq(schema.assessmentVersions.id, input.versionId) });
        if (!v) return { ok: false, error: "version_not_found" } as const;
        const merged = { ...(v.configJson ?? {}), ...input.config };
        await db.update(schema.assessmentVersions).set({ configJson: merged }).where(eq(schema.assessmentVersions.id, input.versionId));
        return { ok: true, config: merged };
      }),
  },
};