import { and, asc, db, desc, eq, inArray, schema } from "@mulai-plus/db/db";
import { tmbAssessmentResults, tmbBatches, tmbBatchStudents, tmbRecommendations } from "@mulai-plus/db/schema/tmb";
import {
  deleteFromR2,
  extractKeyFromUrl,
  getPublicUrl,
  listR2ObjectsDetailed,
  uploadToR2,
} from "@mulai-plus/r2/server";
import { z } from "zod";
import { adminProcedure, publicProcedure } from "../index";
import { publishVersion, validatePublish } from "../lib/assessment-gate";
import { notifyBatchComplete, notifyResultReady } from "../lib/assessment-notify";
import { evaluateTextInput } from "../lib/evaluate-input";
import { recommendForResult } from "../lib/recommend";
import { computeRecommendations, getProdiList } from "./tmb";

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

/**
 * (security) Identitas pengerja tes.
 *
 * Endpoint discovery tetap `publicProcedure` (dipakai mode preview & e2e tanpa
 * cookie), tetapi identitas TIDAK boleh ditentukan bebas oleh klien:
 *  • user login  → `studentId` dipaksa dari sesi (kecuali id `preview-*`),
 *  • tanpa login → hanya bila `ASSESSMENT_ALLOW_ANON=1` (staging/e2e) atau preview.
 */
function actorOf(context: any): { id: string | null; role: string | null } {
  const u = context?.session?.user;
  return { id: u?.id ?? null, role: (u as any)?.role ?? null };
}

function allowAnonAssessment(): boolean {
  return process.env.ASSESSMENT_ALLOW_ANON === "1";
}

/** Tentukan studentId efektif; `error` diisi bila identitas tidak sah. */
function resolveStudentId(
  context: any,
  requested: string,
): { studentId?: string; error?: "identity_mismatch" | "login_required" } {
  const actor = actorOf(context);
  const isPreview = requested.startsWith("preview-");
  if (isPreview) return { studentId: requested };
  if (actor.id) {
    if (requested !== actor.id) return { error: "identity_mismatch" };
    return { studentId: actor.id };
  }
  if (allowAnonAssessment()) return { studentId: requested };
  return { error: "login_required" };
}

/** Boleh membaca/mengubah sesi ini? (pemilik, sesi preview, atau mode anon e2e) */
function canAccessSession(sess: { studentId: string }, context: any): boolean {
  if (sess.studentId.startsWith("preview-")) return true;
  const actor = actorOf(context);
  if (actor.id) return sess.studentId === actor.id;
  return allowAnonAssessment();
}

export const discoverRouter = {
  /** Konten asesmen versi LIVE (config + dims + soals). */
  /** Tes B2C yang sedang LIVE (famil, minat|bakat) utk halaman 'Pilih Test' v2. */
  liveTests: publicProcedure.handler(async () => {
    const fam = ["minat", "bakat"];
    const asses = await db.query.assessments.findMany({
      where: inArray(schema.assessments.family, fam),
      orderBy: asc(schema.assessments.code),
    });
    const items: { code: string; name: string; family: string; questions: number; sections: number; xp: number }[] = [];
    for (const a of asses) {
      const live = await db.query.assessmentVersions.findFirst({
        where: and(eq(schema.assessmentVersions.assessmentId, a.id), eq(schema.assessmentVersions.status, "live")),
      });
      if (!live) continue;
      const qs = await db.query.questions.findMany({
        where: eq(schema.questions.versionId, live.id),
        orderBy: asc(schema.questions.displayOrder),
      });
      const dims = await db.query.assessmentDimensions.findMany({
        where: eq(schema.assessmentDimensions.versionId, live.id),
        orderBy: asc(schema.assessmentDimensions.displayOrder),
      });
      const secs = computeRunSections((live.configJson ?? {}) as any, qs as any, dims as any);
      const n = qs.filter((q) => q.isActive).length;
      items.push({
        code: a.code,
        name: a.name,
        family: a.family ?? "bakat",
        questions: n,
        sections: secs.length,
        xp: secs.length * 10 + n,
      });
    }
    return { items };
  }),

  config: publicProcedure
    .input(z.object({ code: z.string().optional().default("DISCOVER"), versionId: z.string().optional() }))
    .handler(async ({ input }) => {
      // Load versi spesifik (utk resume sesi lama / preview per versi) atau versi LIVE (rilis)
      const v = input.versionId
        ? ((await db.query.assessmentVersions.findFirst({
            where: eq(schema.assessmentVersions.id, input.versionId),
          })) as VersionRow | null)
        : await getLiveVersion(input.code);
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
        ? (
            await db.query.dimensionInstructions.findMany({
              where: inArray(schema.dimensionInstructions.dimensionId, dimIds),
            })
          ).sort((a, b) => dimIds.indexOf(a.dimensionId) - dimIds.indexOf(b.dimensionId)) // ikut urutan dimensi
        : [];
      const cfgRun = (v.configJson ?? {}) as any;
      const activeQ = questions;
      const activeDim = dimensions;
      // Rentang bagian dihitung dari urutan soal yang sebenarnya (lihat computeRunSections).
      const runSections = computeRunSections(cfgRun, activeQ as any, activeDim as any);
      // ── Payload khusus SISWA ────────────────────────────────────────────────
      // 1) sertakan tipe evaluasi jawaban isian (angka vs kata) supaya UI tahu keyboard mana
      //    yang dipakai — TANPA kunci jawabannya;
      // 2) buang skor & dimensi target tiap opsi: keduanya bisa dibaca dari devtools dan
      //    membocorkan kunci jawaban pilihan ganda.
      const textCfgs = activeQ.length
        ? await db.query.textInputConfigs.findMany({
            where: inArray(
              schema.textInputConfigs.questionId,
              activeQ.map((q) => q.id),
            ),
            columns: { questionId: true, evaluationType: true, answerKey: true },
          })
        : [];
      // Keyboard yang dipakai UI siswa: "numeric" bila penilaiannya angka ATAU kuncinya memang
      // angka (mis. "Berapa jumlah huruf i pada INISIATIF?" → 4). Yang dikirim hanya MODE-nya,
      // bukan kunci jawabannya.
      const isNumericKey = (k: unknown) => /^[\d.,/\s-]+$/.test(String(k ?? "").trim());
      const textEvalOf = new Map(
        textCfgs.map((t) => [
          t.questionId,
          {
            evaluationType: t.evaluationType,
            inputMode: t.evaluationType === "numeric_tolerance" || isNumericKey(t.answerKey) ? "numeric" : "text",
          },
        ]),
      );
      const publicQuestions = activeQ.map((q) => ({
        ...q,
        textEval: q.questionType === "text_input" ? (textEvalOf.get(q.id) ?? null) : null,
        opts: ((q as any).opts ?? []).map((o: any) => ({
          id: o.id,
          optionValue: o.optionValue,
          label: o.label,
          icon: o.icon,
          imageUrl: o.imageUrl,
          imageCaption: o.imageCaption,
          displayOrder: o.displayOrder,
        })),
      }));
      return {
        ok: true,
        version: { id: v.id, number: v.versionNumber, status: v.status },
        config: v.configJson,
        dimensions,
        sections,
        instructions,
        questions: publicQuestions,
        runSections,
      };
    }),

  /** Mulai sesi — lock versi live terbaru. */
  start: publicProcedure
    .input(
      z.object({
        code: z.string().default("DISCOVER"),
        studentId: z.string().min(1),
        versionId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const who = resolveStudentId(context, input.studentId);
      if (who.error) return { ok: false, error: who.error } as const;
      const studentId = who.studentId as string;

      const v = input.versionId
        ? ((await db.query.assessmentVersions.findFirst({
            where: eq(schema.assessmentVersions.id, input.versionId),
          })) as VersionRow | null)
        : await getLiveVersion(input.code);
      if (!v) return { ok: false, error: "assessment_not_found" } as const;
      const c = (v.configJson ?? {}) as any;

      // (M2.3) WINDOW JADWAL KELAS (B2B): siswa hanya boleh MEMULAI di dalam rentang
      // jadwal kelasnya. Jika kelas punya jadwal dan semuanya sedang tutup → tolak dengan
      // kode yang jelas (UI menampilkan waktu bukanya). Yang sudah mulai tetap boleh
      // menyelesaikan (grace) karena pemeriksaan hanya di titik mulai.
      try {
        const roster = await db.query.tmbBatchStudents.findMany({
          where: eq(tmbBatchStudents.userId, studentId),
          columns: { batchId: true },
        });
        if (roster.length) {
          const batches = await db.query.tmbBatches.findMany({
            where: inArray(
              tmbBatches.id,
              roster.map((r) => r.batchId),
            ),
            columns: { id: true, name: true, scheduleMode: true, windowStart: true, windowEnd: true },
          });
          const nowMs = Date.now();
          const winStart = (b: any) => (b.windowStart ? new Date(b.windowStart).getTime() : null);
          const winEnd = (b: any) => (b.windowEnd ? new Date(b.windowEnd).getTime() : null);
          const withWindow = batches.filter((b) => winStart(b) !== null || winEnd(b) !== null);
          if (withWindow.length) {
            const open = withWindow.find((b) => {
              const ws = winStart(b);
              const we = winEnd(b);
              return (ws === null || nowMs >= ws) && (we === null || nowMs <= we);
            });
            if (!open) {
              const b = withWindow[0];
              if (!b) return null;
              const startMs = winStart(b);
              return {
                ok: false,
                error: startMs !== null && nowMs < startMs ? "window_not_started" : "window_ended",
                className: b.name,
                windowStart: b.windowStart,
                windowEnd: b.windowEnd,
              } as const;
            }
          }
        }
      } catch (e: any) {
        console.error("[engine][b2b] gagal cek window kelas:", e?.message ?? e);
      }

      // B2B: siswa undangan yang mulai mengerjakan → status roster jadi "in_progress" (guru bisa pantau)
      try {
        await markRosterStarted(studentId);
      } catch (e: any) {
        console.error("[engine][b2b] gagal menandai roster mulai:", e?.message ?? e);
      }

      // ── Urutan soal sesi ini ────────────────────────────────────────────────
      // randomize_q = true → urutan diacak SEKALI lalu disimpan di sesi (resume tetap sama).
      const baseQs = await db.query.questions.findMany({
        where: and(eq(schema.questions.versionId, v.id), eq(schema.questions.isActive, true)),
        columns: { id: true, durationSeconds: true, dimensionId: true, displayOrder: true },
        orderBy: asc(schema.questions.displayOrder),
      });
      // section_mode = by_dimension → soal DIKELOMPOKKAN per dimensi, mengikuti URUTAN BLOK SOAL
      // (displayOrder soal pertama tiap dimensi), BUKAN urutan baris dimensi. Dengan begitu urutan
      // yang disusun penulis tetap dihormati (mis. RIASEC: R→I→A→S→E→C) walau baris dimensinya
      // tidak sengaja urut alfabet/E,C,R,…
      let seqQs: typeof baseQs = baseQs;
      if ((c?.section_mode ?? "none") === "by_dimension") {
        const dimFirst = new Map<string, number>();
        for (const q of baseQs) if (!dimFirst.has(q.dimensionId)) dimFirst.set(q.dimensionId, q.displayOrder);
        const rank = (id: string) => dimFirst.get(id) ?? Number.MAX_SAFE_INTEGER;
        seqQs = [...baseQs].sort(
          (a, b) => rank(a.dimensionId) - rank(b.dimensionId) || a.displayOrder - b.displayOrder,
        );
      }
      const orderedQs = c?.randomize_q === true ? shuffle(seqQs) : seqQs;
      const orderIds = orderedQs.map((q) => q.id);

      // ── Urutan opsi per soal ────────────────────────────────────────────────
      // randomize_a = true → acak opsi tiap soal, disimpan di sesi agar konsisten.
      const buildOptionOrder = async (): Promise<Record<string, string[]> | undefined> => {
        if (c?.randomize_a !== true || orderIds.length === 0) return undefined;
        // Soal SKALA (likert) tidak boleh diacak: urutan opsinya adalah tangga yang bermakna
        // (mis. 😡🙁😐🙂😍 / 1–5). Hanya opsi pilihan ganda yang diacak.
        const typeRows = await db.query.questions.findMany({
          where: inArray(schema.questions.id, orderIds),
          columns: { id: true, questionType: true },
        });
        const noShuffle = new Set(typeRows.filter((q) => q.questionType !== "multiple_choice").map((q) => q.id));
        const opts = await db.query.questionOptions.findMany({
          where: inArray(schema.questionOptions.questionId, orderIds),
          columns: { id: true, questionId: true, displayOrder: true },
          orderBy: asc(schema.questionOptions.displayOrder),
        });
        const out: Record<string, string[]> = {};
        for (const qid of orderIds) {
          if (noShuffle.has(qid)) continue;
          const ids = opts.filter((o) => o.questionId === qid).map((o) => o.id);
          if (ids.length > 1) out[qid] = shuffle(ids);
        }
        return Object.keys(out).length ? out : undefined;
      };

      const buildTimer = async (): Promise<Record<string, unknown> | undefined> => {
        if (c?.timer_enabled !== true) return undefined;
        // (#7) Scope timer bisa DIATUR PER DIMENSI: kolom `assessment_dimensions.timer_scope`
        // (null = ikut config global). Dimensi ber-scope "dimension" memakai durasi
        // `durationSeconds`; dimensi ber-scope "question" memakai `questions.durationSeconds`
        // (fallback `time_per_question`).
        const globalScope = (c?.timer_scope ?? "none") as "none" | "dimension" | "question";
        const now = Date.now();
        const dimsR = await db.query.assessmentDimensions.findMany({
          where: eq(schema.assessmentDimensions.versionId, v.id),
          columns: { id: true, durationSeconds: true, timerScope: true },
          orderBy: asc(schema.assessmentDimensions.displayOrder),
        });
        const qsR = orderedQs;
        const perQ = Number(c?.time_per_question ?? 30);
        const eff = new Map<string, "none" | "dimension" | "question">();
        for (const d of dimsR) {
          const raw = (d.timerScope ?? "").trim();
          const sc = raw === "none" || raw === "dimension" || raw === "question" ? raw : globalScope;
          eff.set(d.id, sc === "dimension" || sc === "question" ? sc : "none");
        }

        const dims: { id: string; startISO: string; endISO: string; durationSeconds: number }[] = [];
        let cursor = now;
        for (const d of dimsR) {
          const dur = eff.get(d.id) === "dimension" ? Number(d.durationSeconds ?? 0) : 0;
          if (dur > 0) {
            dims.push({
              id: d.id,
              startISO: new Date(cursor).toISOString(),
              endISO: new Date(cursor + dur * 1000).toISOString(),
              durationSeconds: dur,
            });
            cursor += dur * 1000;
          }
        }

        // qEnds sejajar dengan urutan sesi; string kosong = soal itu tidak ber-scope soal.
        const qEnds: string[] = [];
        let qCursor = now;
        let qSeconds = 0;
        let hasQuestionScope = false;
        for (const qq of qsR) {
          if (eff.get(qq.dimensionId) === "question") {
            hasQuestionScope = true;
            const secs = Number(qq.durationSeconds ?? 0) > 0 ? Number(qq.durationSeconds) : perQ;
            qCursor += secs * 1000;
            qSeconds += secs;
            qEnds.push(new Date(qCursor).toISOString());
          } else {
            qEnds.push("");
          }
        }

        const dimSeconds = dims.reduce((a, d) => a + d.durationSeconds, 0);
        const totalSeconds = dimSeconds + qSeconds;
        const activeScopes = new Set([...eff.values()].filter((x) => x !== "none"));
        return {
          scope: globalScope, // kompatibilitas klien lama
          dimScopes: Object.fromEntries(eff), // scope efektif per dimensi
          mixed: activeScopes.size > 1,
          totalSeconds,
          serverNowISO: new Date(now).toISOString(),
          expectedEndISO: new Date(now + totalSeconds * 1000).toISOString(),
          dims,
          qEnds: hasQuestionScope ? qEnds : [],
          qPerMs: perQ * 1000,
        };
      };
      const serverTimer = await buildTimer();
      const optionOrder = await buildOptionOrder();
      // RESUME: pakai lagi sesi yg masih berjalan (in_progress) ATAU yg dijeda (paused).
      // "Berhenti & lanjutkan nanti" harus bisa dilanjutkan, bukan bikin sesi baru.
      const existingSess = await db.query.assessmentSessions.findFirst({
        where: and(
          eq(schema.assessmentSessions.studentId, studentId),
          eq(schema.assessmentSessions.versionId, v.id),
          inArray(schema.assessmentSessions.status, ["in_progress", "paused"] as any),
        ),
        orderBy: (t: any) => [desc(t.startedAt)],
      });
      if (existingSess) {
        const sessCfg = ((existingSess as any).configJson ?? {}) as any;
        let t = sessCfg?.timer ?? null;
        if (!t && c?.timer_enabled === true) {
          // Sesi lama (dibuat sebelum timer aktif) → lampirkan deadline dari SEKARANG (server-authoritative)
          t = await buildTimer();
        }
        // ── Sesi BASI ───────────────────────────────────────────────────────────
        // Kalau bank soal pernah diganti (seeder/impor ulang), questionOrderIds sesi lama
        // menunjuk soal yang sudah tidak ada. Dulu urutan itu tetap dipakai → soal/bagian jadi
        // campur atau kosong saat dilanjutkan. Sekarang urutannya dibangun ulang dari versi live.
        const storedOrder: string[] = Array.isArray(sessCfg?.questionOrderIds) ? sessCfg.questionOrderIds : [];
        const alive = new Set(orderIds);
        const stale =
          storedOrder.length === 0 ||
          storedOrder.some((id) => !alive.has(id)) ||
          storedOrder.length !== orderIds.length;
        let sessOrder = storedOrder;
        let sessOptionOrder = sessCfg?.optionOrder;
        if (stale) {
          sessOrder = orderIds;
          sessOptionOrder = optionOrder;
          // deadline per-soal indeksnya mengikuti urutan → wajib dihitung ulang
          if (c?.timer_enabled === true && t?.scope === "question") t = await buildTimer();
        }
        if (stale || (t && !sessCfg?.timer)) {
          await db
            .update(schema.assessmentSessions)
            .set({
              configJson: {
                ...sessCfg,
                questionOrderIds: sessOrder,
                ...(sessOptionOrder ? { optionOrder: sessOptionOrder } : {}),
                ...(t ? { timer: t } : {}),
              },
            })
            .where(eq(schema.assessmentSessions.id, existingSess.id));
        }
        // Sesi yang dijeda dilanjutkan → kembalikan statusnya agar jawaban bisa masuk lagi.
        if ((existingSess as any).status === "paused") {
          await db
            .update(schema.assessmentSessions)
            .set({ status: "in_progress" })
            .where(eq(schema.assessmentSessions.id, existingSess.id));
        }
        return {
          ok: true,
          sessionId: existingSess.id,
          versionId: v.id,
          serverTimer: t,
          resume: true,
          repaired: stale,
          orderIds: sessOrder.length ? sessOrder : orderIds,
          optionOrder: sessOptionOrder,
        } as const;
      }
      const session = {
        id: uid(),
        studentId: studentId,
        versionId: v.id,
        status: "in_progress",
        configJson: { ...v.configJson, timer: serverTimer, questionOrderIds: orderIds, optionOrder },
      };
      await db.insert(schema.assessmentSessions).values(session as any);
      return { ok: true, sessionId: session.id, versionId: v.id, serverTimer, orderIds, optionOrder };
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
    .handler(async ({ input, context }) => {
      const sess = await db.query.assessmentSessions.findFirst({
        where: eq(schema.assessmentSessions.id, input.sessionId),
      });
      if (!sess) return { ok: false, error: "session_not_found" } as const;
      if (!canAccessSession(sess, context)) return { ok: false, error: "forbidden" } as const;
      if (sess.status !== "in_progress") return { ok: false, error: "session_closed" } as const;
      // ANTI-TAMPER: tolak submit bila deadline (per SOAL atau per DIMENSI) sudah lewat.
      // Timer bisa beda scope per dimensi (#7), jadi tidak lagi bergantung `timer.scope` global.
      const timerS = ((sess.configJson as any)?.timer ?? null) as any;
      if (timerS) {
        const order: string[] = (timerS.questionOrderIds ??
          (sess.configJson as any)?.questionOrderIds ??
          []) as string[];
        const qi = order.indexOf(input.questionId);
        const qEnd = qi >= 0 ? (timerS.qEnds as string[])[qi] : undefined;
        if (qEnd && Date.now() >= new Date(qEnd).getTime()) {
          return { ok: false, error: "question_timed_out" } as const;
        }
        if (!qEnd && (timerS.dims ?? []).length) {
          const qFor = await db.query.questions.findFirst({
            where: eq(schema.questions.id, input.questionId),
            columns: { id: true, dimensionId: true },
          });
          const dEnd = (timerS.dims as any[]).find((d: any) => d.id === qFor?.dimensionId)?.endISO;
          if (dEnd && Date.now() >= new Date(dEnd).getTime()) {
            return { ok: false, error: "dimension_timed_out" } as const;
          }
        }
      }
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
    .handler(async ({ input, context }) => {
      const sess = await db.query.assessmentSessions.findFirst({
        where: eq(schema.assessmentSessions.id, input.sessionId),
      });
      if (!sess || sess.status !== "in_progress") return { ok: false, error: "session_not_found" } as const;
      if (!canAccessSession(sess, context)) return { ok: false, error: "forbidden" } as const;
      const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, input.questionId) });
      if (!q) return { ok: false, error: "question_not_found" } as const;
      const cfg = await db.query.textInputConfigs.findFirst({
        where: eq(schema.textInputConfigs.questionId, input.questionId),
      });
      const evalRes = cfg
        ? evaluateTextInput(cfg.evaluationType as any, cfg.answerKey, input.textAnswer, cfg.numericTolerance ?? "0.01")
        : { correct: true, normalized: input.textAnswer.trim() };
      const existing = await db.query.assessmentAnswers.findFirst({
        where: and(
          eq(schema.assessmentAnswers.sessionId, input.sessionId),
          eq(schema.assessmentAnswers.questionId, input.questionId),
        ),
      });
      const scoreEarned = evalRes.correct ? 1 : 0;
      if (existing) {
        await db
          .update(schema.assessmentAnswers)
          .set({ textAnswer: input.textAnswer, scoreEarned, answeredAt: new Date() })
          .where(eq(schema.assessmentAnswers.id, existing.id));
      } else {
        await db.insert(schema.assessmentAnswers).values({
          id: uid(),
          sessionId: input.sessionId,
          questionId: input.questionId,
          textAnswer: input.textAnswer,
          scoreEarned,
        });
      }
      return { ok: true, correct: evalRes.correct, normalized: evalRes.normalized };
    }),

  /** Selesaikan → skor per method (SUM/AVG/WEIGHTED) → top-N → profile (tie: waktu→abjad). */
  finish: publicProcedure
    .input(z.object({ sessionId: z.string().min(1), durations: z.record(z.string(), z.number()).optional() }))
    .handler(async ({ input, context }) => {
      const sess = await db.query.assessmentSessions.findFirst({
        where: eq(schema.assessmentSessions.id, input.sessionId),
      });
      if (!sess) return { ok: false, error: "session_not_found" } as const;
      if (!canAccessSession(sess, context)) return { ok: false, error: "forbidden" } as const;
      if (sess.status === "completed") {
        const r = await db.query.assessmentResults.findFirst({
          where: eq(schema.assessmentResults.sessionId, input.sessionId),
        });
        return { ok: true, already_completed: true, result: r };
      }
      const cfg = (sess.configJson ?? {}) as any;
      const method: string = cfg?.scoring_method ?? "sum";
      // Timer server-side: lewat deadline → sesi ditandai TIMEOUT (auto-submit klien tetap valid)
      const timerCfg = (sess.configJson as any)?.timer;
      const timedOut = !!timerCfg?.expectedEndISO && Date.now() > new Date(timerCfg.expectedEndISO).getTime();
      // XP/streak: 10 XP per bagian tuntas + 1 XP per jawaban; streak = banyak bagian tuntas
      const qsAll = await db.query.questions.findMany({
        where: eq(schema.questions.versionId, sess.versionId),
        orderBy: asc(schema.questions.displayOrder),
      });
      const dimsAll = await db.query.assessmentDimensions.findMany({
        where: eq(schema.assessmentDimensions.versionId, sess.versionId),
      });
      const runSecs = computeRunSections(sess.configJson as any, qsAll, dimsAll);
      const purse = await db.query.assessmentAnswers.findMany({
        where: eq(schema.assessmentAnswers.sessionId, input.sessionId),
      });
      const answeredSet = new Set(purse.map((a) => a.questionId));
      let sectionsDone = 0;
      const activeQs = qsAll.filter((q) => q.isActive);
      for (const sc of runSecs) {
        const slice = activeQs.slice(sc.from, sc.to + 1);
        if (slice.length && slice.every((q) => answeredSet.has(q.id))) sectionsDone++;
      }
      const xpEarned = sectionsDone * 10 + answeredSet.size;
      const optIds = purse.map((a) => a.selectedOptionId).filter(Boolean) as string[];
      const opts = optIds.length
        ? await db.query.questionOptions.findMany({ where: inArray(schema.questionOptions.id, optIds) })
        : [];
      const qIds = purse.map((a) => a.questionId).filter(Boolean) as string[];
      const qs = qIds.length
        ? await db.query.questions.findMany({
            where: inArray(schema.questions.id, qIds),
            columns: { id: true, dimensionId: true, weight: true },
          })
        : [];
      const qBy = new Map(qs.map((q) => [q.id, q]));
      const optBy = new Map(opts.map((o) => [o.id, o]));

      // scoring_mode "likert": poin naik LINIER mengikuti urutan opsi (mengabaikan skor manual
      // per opsi). Nilai diambil dari urutan displayOrder opsi pada soal tersebut (1..n).
      const likertMode = cfg?.scoring_mode === "likert";
      const likertScoreByOpt = new Map<string, number>();
      if (likertMode && qIds.length) {
        const allOpts = await db.query.questionOptions.findMany({
          where: inArray(schema.questionOptions.questionId, qIds),
          columns: { id: true, questionId: true, displayOrder: true },
          orderBy: asc(schema.questionOptions.displayOrder),
        });
        for (const qid of qIds) {
          allOpts
            .filter((o) => o.questionId === qid)
            .forEach((o, i) => {
              likertScoreByOpt.set(o.id, i + 1);
            });
        }
      }

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
          score = likertMode ? (likertScoreByOpt.get(a.selectedOptionId) ?? o?.score ?? score) : (o?.score ?? score);
        } else {
          dimId = q?.dimensionId ?? "";
        }
        if (!dimId) continue;
        if (method === "weighted") score = score * (q?.weight ?? 1);
        scores.set(dimId, (scores.get(dimId) ?? 0) + score);
        counts.set(dimId, (counts.get(dimId) ?? 0) + 1);
      }
      if (method === "average") {
        for (const [k, v] of scores)
          scores.set(k, counts.get(k) ? Math.round((v / (counts.get(k) ?? 1)) * 1000) / 1000 : 0);
      }
      const dims = await db.query.assessmentDimensions.findMany({
        where: eq(schema.assessmentDimensions.versionId, sess.versionId),
      });
      const dimByCode = new Map(dims.map((d) => [d.id, d.code]));
      // Fallback: targetDimension opsi bisa menunjuk dimensi VERSI LAMA (salinan draft tidak selalu remap)
      // → cari code-nya di semua versi agar skor/profil tetap benar.
      const missingDimIds = [...scores.keys()].filter((x) => !dimByCode.has(x));
      if (missingDimIds.length > 0) {
        const extra = await db.query.assessmentDimensions.findMany({
          where: inArray(schema.assessmentDimensions.id, missingDimIds),
          columns: { id: true, code: true },
        });
        for (const d of extra) if (d.code && !dimByCode.has(d.id)) dimByCode.set(d.id, d.code);
      }
      const durations = input.durations ?? {};
      // completion_time_seconds bertipe INTEGER → bulatkan (durasi dari klien berupa desimal).
      const rows = [...scores.entries()].map(([dimId, total]) => ({
        dimId,
        total,
        time: durations[dimId] != null ? Math.max(0, Math.round(Number(durations[dimId]))) : Number.MAX_SAFE_INTEGER,
      }));
      rows.sort(
        (a, b) =>
          b.total - a.total ||
          a.time - b.time ||
          (dimByCode.get(a.dimId) ?? "").localeCompare(dimByCode.get(b.dimId) ?? ""),
      );
      const topN = Number(cfg?.result_dim_count ?? 3);
      const top = rows.slice(0, topN).map((r) => dimByCode.get(r.dimId) ?? r.dimId);
      const profileCode = top.join("-").slice(0, 40); // varchar(40) di tmb_assessment_results
      // Rekomendasi: ability DINORMALISASI per dim (0–100) agar jumlah soal tak bias,
      // + confidence digeser oleh gap skor teratas (differentiation).
      const abilityCodeScores: Record<string, number> = {};
      for (const [dimId, tt] of scores) {
        const cnt = counts.get(dimId) ?? 0;
        const pct = cnt > 0 ? Math.min(100, (tt / cnt) * 100) : 0;
        const code = (dimByCode.get(dimId) ?? "").toLowerCase();
        if (code) abilityCodeScores[code] = Math.round(pct);
      }
      const r0 = rows[0];
      const r1 = rows[1];
      const diffFactor = r0 && r1 && r0.total > 0 ? Math.max(0, Math.min(1, (r0.total - r1.total) / r0.total)) : 1;
      const recos = await recommendForResult({ topCodes: top, abilityScores: abilityCodeScores, diffFactor });

      await db
        .delete(schema.assessmentDimensionScores)
        .where(eq(schema.assessmentDimensionScores.sessionId, input.sessionId));
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
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
        xpEarned,
        streak: sectionsDone,
        timedOut,
        profileCode,
        topDimensionsJson: top,
        rawScoresJson: Object.fromEntries([...scores.entries()]),
        recommendationsJson: recos,
      };
      await db.insert(schema.assessmentResults).values(result);
      // B2B: id hasil pada pipeline lama — dipakai untuk menautkan hasil ke roster sekolah
      let b2bResultId: string | null = null;
      // ⚙ Backwrite: hasil engine → pipeline hasil LAMA (kontrak tmb) agar page/template hasil yg ada tetap menampilkan
      try {
        const ver0 = await db.query.assessmentVersions.findFirst({
          where: eq(schema.assessmentVersions.id, sess.versionId),
        });
        const ass0 = ver0
          ? await db.query.assessments.findFirst({ where: eq(schema.assessments.id, ver0.assessmentId) })
          : null;
        const fam = ass0?.family ?? null;
        if (fam && (fam === "minat" || fam === "bakat")) {
          const existing = await db.query.tmbAssessmentResults.findFirst({
            where: eq(tmbAssessmentResults.userId, sess.studentId),
            orderBy: (t: any) => [desc(t.createdAt)],
          });
          // baris jatuh tempo lengkap (minat+bakat) => ini adalah RETEST → attempt baru (baris baru),
          // sehingga duet lama tetap tersimpan di history dan yang baru mulai dari bagian ini saja.
          // 📊 Statistik per dimensi (utk catatan hasil: waktu habis / paling lama)
          const dimStats = await (async () => {
            const dimsAll2 = await db.query.assessmentDimensions.findMany({
              where: eq(schema.assessmentDimensions.versionId, sess.versionId),
              orderBy: asc(schema.assessmentDimensions.displayOrder),
            });
            const qsAll2 = await db.query.questions.findMany({
              where: and(eq(schema.questions.versionId, sess.versionId), eq(schema.questions.isActive, true)),
              columns: { id: true, dimensionId: true },
            });
            const ansAll = await db.query.assessmentAnswers.findMany({
              where: eq(schema.assessmentAnswers.sessionId, input.sessionId),
            });
            const ansByQ = new Map(ansAll.map((a) => [a.questionId, a]));
            const timerCfg = ((sess.configJson as any)?.timer ?? null) as any;
            return dimsAll2.map((d) => {
              const qs = qsAll2.filter((q) => q.dimensionId === d.id);
              const times = qs
                .map((q) => ansByQ.get(q.id)?.answeredAt)
                .filter(Boolean)
                .map((t) => new Date(t as any).getTime())
                .sort((a, b) => a - b);
              const first = times[0];
              const last = times[times.length - 1];
              const seconds =
                times.length >= 2 && first !== undefined && last !== undefined ? Math.round((last - first) / 1000) : 0;
              const answered = qs.filter((q) => ansByQ.has(q.id)).length;
              const dEnd = (timerCfg?.dims ?? []).find((x: any) => x.id === d.id)?.endISO;
              const timedOut = !!dEnd && Date.now() >= new Date(dEnd).getTime() && answered < qs.length;
              return { dimId: d.id, code: d.code, name: d.name, total: qs.length, answered, seconds, timedOut };
            });
          })();

          const hReal = !!existing && (existing.hollandCode ?? "").length > 0;
          const aReal = !!existing && Object.keys((existing as any).abilityScores ?? {}).length > 0;
          // Kawin hanya bila row punya TEPAT SATU sisi nyata (minat✓/bakat kosong → lanjut).
          // Junk (kode kosong / {}), row lengkap, atau kosong total → ATTEMPT BARU.
          const existingForAttempt = hReal !== aReal ? existing : null;
          const rid = existingForAttempt?.id ?? uid();
          const base = existingForAttempt ? {} : { id: rid, userId: sess.studentId };
          const hollandScores: Record<string, number> = {};
          const abilityScores: Record<string, { correct: number; total: number }> = {};
          for (const [dimId, total] of scores) {
            const code = (dimByCode.get(dimId) ?? "").toLowerCase();
            const cnt = counts.get(dimId) ?? 0;
            if (fam === "minat" && /^[riasec]$/.test(code)) hollandScores[code.toUpperCase()] = Math.round(total);
            if (fam === "bakat" && code) abilityScores[code] = { correct: Math.round(total), total: cnt };
          }
          // ability disimpan dgn bentuk KONTRAK legacy: { levels, scores } (page hasil baca .levels & .scores)
          const abilityStore =
            fam === "bakat"
              ? {
                  levels: Object.fromEntries(
                    Object.entries(abilityScores as Record<string, { correct: number; total: number }>).map(
                      ([k, v]) => {
                        const pct = v.total ? v.correct / v.total : 0;
                        return [k, pct >= 0.7 ? "high" : pct >= 0.4 ? "medium" : "low"];
                      },
                    ),
                  ),
                  scores: abilityScores,
                }
              : undefined;
          const gap = r0 && r1 && r0.total > 0 ? (r0.total - r1.total) / r0.total : 0;
          const diff = gap > 0.4 ? "strong" : gap > 0.15 ? "moderate" : "weak";
          const confScore = String(Math.max(0, Math.min(100, Math.round(50 + (diffFactor ?? 0.5) * 40))));
          if (existingForAttempt) {
            await db
              .update(tmbAssessmentResults)
              .set({
                ...(fam === "minat" ? { hollandCode: profileCode, hollandScores } : { abilityScores: abilityStore }),
                differentiation: diff,
                confidenceScore: confScore,
                dimStats: dimStats as any,
              })
              .where(eq(tmbAssessmentResults.id, rid));
            await db.delete(tmbRecommendations).where(eq(tmbRecommendations.resultId, rid));
          } else {
            await db.insert(tmbAssessmentResults).values({
              ...(base as any),
              ...(fam === "minat" ? { hollandCode: profileCode, hollandScores } : { abilityScores: abilityStore }),
              differentiation: diff,
              confidenceScore: confScore,
              dimStats: dimStats as any,
            });
          }
          b2bResultId = rid;
          // Rekomendasi LENGKAP (jurusan+kampus+karir) — selalu dihitung dari sisi yg tersedia;
          // sisi yg belum dikerjakan diberi level netral ("medium") agar rekomendasi tetap tampil (sepakat dgn v1)
          if (existingForAttempt) {
            const mergedH = {
              ...((existingForAttempt as any)?.hollandScores ?? {}),
              ...(fam === "minat" ? hollandScores : {}),
            };
            const prevAb = (existingForAttempt as any)?.abilityScores ?? {};
            const prevScores = prevAb?.scores ?? prevAb ?? {};
            const mergedA = { ...prevScores, ...(fam === "bakat" ? abilityScores : {}) };
            const [prodiList, patterns, careersList] = await Promise.all([
              getProdiList(),
              db.query.tmbMajorPatterns.findMany({ where: eq(schema.tmbMajorPatterns.isActive, true) }),
              db.query.tmbCareerMappings.findMany(),
            ]);
            const abilityKeys = [
              ...new Set((patterns as any[]).flatMap((p: any) => Object.keys((p as any)?.abilityWeights ?? {}))),
            ];
            const lux = Object.fromEntries(
              abilityKeys.map((k) => {
                const v = (mergedA as Record<string, { correct: number; total: number }>)[k];
                const pct = v?.total ? v.correct / v.total : 0.5; // netral bila belum dikerjakan
                return [k, pct >= 0.7 ? "high" : pct >= 0.4 ? "medium" : "low"];
              }),
            );
            const recoCalc = computeRecommendations(
              { code: existingForAttempt?.hollandCode ?? profileCode ?? "", scores: mergedH as any },
              { levels: lux as any },
              prodiList as any,
              patterns as any,
              careersList as any,
            );
            for (let i = 0; i < recoCalc.majors.length; i++) {
              const m = recoCalc.majors[i];
              if (!m) continue;
              await db.insert(tmbRecommendations).values({
                id: uid(),
                resultId: rid,
                type: "major",
                rank: i + 1,
                itemName: m.itemName,
                categoryKey: m.categoryKey ?? null,
                confidence: String(m.confidence ?? 0),
                prodiRefs: m.prodiRefs ?? [],
              });
            }
            for (let i = 0; i < recoCalc.careers.length; i++) {
              const c = recoCalc.careers[i];
              if (!c) continue;
              await db.insert(tmbRecommendations).values({
                id: uid(),
                resultId: rid,
                type: "career",
                rank: recoCalc.majors.length + i + 1,
                itemName: c.itemName,
                categoryKey: c.categoryKey ?? null,
                confidence: (c as any).confidence ?? null,
                prodiRefs: [] as any,
              });
            }
          }
        }
      } catch (e: any) {
        // backwrite legacy gagal → jangan jatuhkan hasil engine, TAPI tampilkan biar bisa dilacak
        console.error("[engine][backwrite] gagal:", e?.message ?? e);
      }
      // ── B2B: tautkan hasil ke roster sekolah (kalau siswa ini peserta undangan) ──
      if (b2bResultId) {
        try {
          const n = await linkRosterResult(sess.studentId, b2bResultId);
          if (n > 0) console.log(`[engine][b2b] hasil ${b2bResultId} ditautkan ke ${n} baris roster sekolah`);
          // (M5.1) kelas penuh selesai → beri tahu admin sekolah & guru BK
          const roster = await db.query.tmbBatchStudents.findMany({
            where: eq(tmbBatchStudents.userId, sess.studentId),
            columns: { batchId: true },
          });
          for (const r of roster) await notifyBatchComplete(r.batchId);
        } catch (e: any) {
          console.error("[engine][b2b] gagal menautkan hasil ke roster:", e?.message ?? e);
        }
      }
      // (M5.1) beri tahu siswa bahwa hasilnya siap
      await notifyResultReady(sess.studentId, profileCode).catch((e: any) =>
        console.error("[notify] hasil siap gagal:", e?.message ?? e),
      );
      await db
        .update(schema.assessmentSessions)
        .set({ status: timedOut ? "timeout" : "completed", completedAt: new Date() })
        .where(eq(schema.assessmentSessions.id, input.sessionId));

      return {
        ok: true,
        profileCode,
        topDimensions: top,
        rawScores: result.rawScoresJson,
        xpEarned,
        streak: sectionsDone,
        timedOut,
        recommendations: recos,
        resultId: result.id,
      };
    }),

  /** Jeda (pause) → lanjutkan nanti. */
  pause: publicProcedure
    .input(z.object({ sessionId: z.string().min(1), currentDimensionId: z.string().optional() }))
    .handler(async ({ input, context }) => {
      const sess = await db.query.assessmentSessions.findFirst({
        where: eq(schema.assessmentSessions.id, input.sessionId),
      });
      if (!sess) return { ok: false, error: "session_not_found" } as const;
      if (!canAccessSession(sess, context)) return { ok: false, error: "forbidden" } as const;
      if (sess.status !== "in_progress") return { ok: false, error: "session_closed" } as const;
      // Hormati setting "Izinkan lanjut kemudian" dari panel Aturan tes.
      if ((sess.configJson as any)?.allow_pause === false) return { ok: false, error: "pause_not_allowed" } as const;
      await db
        .update(schema.assessmentSessions)
        .set({ status: "paused", currentDimensionId: input.currentDimensionId ?? sess.currentDimensionId })
        .where(eq(schema.assessmentSessions.id, input.sessionId));
      return { ok: true };
    }),

  /** Sesi aktif milik siswa (resume). */
  mySessions: publicProcedure
    .input(z.object({ studentId: z.string().min(1), code: z.string().default("DISCOVER") }))
    .handler(async ({ input, context }) => {
      const who = resolveStudentId(context, input.studentId);
      if (who.error) return { ok: false, error: who.error } as const;
      const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, input.code) });
      const vs = a
        ? await db.query.assessmentVersions.findMany({ where: eq(schema.assessmentVersions.assessmentId, a.id) })
        : [];
      const ids = vs.map((v) => v.id);
      const items = ids.length
        ? await db.query.assessmentSessions.findMany({
            where: and(
              inArray(schema.assessmentSessions.versionId, ids),
              eq(schema.assessmentSessions.studentId, who.studentId as string),
              inArray(schema.assessmentSessions.status, ["in_progress", "paused"] as any),
            ),
            orderBy: (t) => [desc(t.startedAt)],
          })
        : [];
      return { ok: true, items };
    }),

  /** Hasil terakhir engine utk satu tes (report). */
  resultsFor: publicProcedure
    .input(z.object({ code: z.string().min(1), studentId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const who = resolveStudentId(context, input.studentId);
      if (who.error) return { ok: false, error: who.error } as const;
      const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, input.code) });
      if (!a) return { ok: false, error: "assessment_not_found" } as const;
      // Model ATTEMPT: 1 baris tmb_assessment_results = 1 duet minat+bakat.
      // "Selesai <X>" = baris attempt TERAKHIR user punya bagian <X> terisi (holland utk DISCOVER,
      // ability utk TALENT). Retest => attempt baru => baris baru => status bagian lain kosong →
      // CTA selalu 'lanjut' sampai attempt lengkap.
      const isMinat = String(input.code).toUpperCase() === "DISCOVER";
      const row = await db.query.tmbAssessmentResults.findFirst({
        where: eq(tmbAssessmentResults.userId, who.studentId as string),
        orderBy: (t: any) => [desc(t.createdAt)],
      });
      const present =
        !!row &&
        (isMinat ? (row.hollandCode ?? "").length > 0 : Object.keys((row as any).abilityScores ?? {}).length > 0);
      if (!present) return { ok: true, code: a.code, present: false } as const;
      return {
        ok: true,
        code: a.code,
        name: a.name,
        present: true,
        profileCode: row?.hollandCode,
        completedAt: row?.createdAt,
      } as const;
    }),

  /** Daftar ATTEMPT (duet minat+bakat) per user, kronologis — utk history & nomor percobaan. */
  attempts: publicProcedure.input(z.object({ studentId: z.string().min(1) })).handler(async ({ input, context }) => {
    const who = resolveStudentId(context, input.studentId);
    if (who.error) return { ok: false, error: who.error } as const;
    const rows = await db.query.tmbAssessmentResults.findMany({
      where: eq(tmbAssessmentResults.userId, who.studentId as string),
      orderBy: (t: any) => [asc(t.createdAt)],
    });
    // Junk (kedua sisi kosong) dari era sesi rusak tidak boleh muncul — cuma attempt nyata yg tampil
    const nyata = rows.filter(
      (r) => (r.hollandCode ?? "").length > 0 || Object.keys((r as any).abilityScores ?? {}).length > 0,
    );
    return {
      ok: true,
      attempts: nyata.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        hollandCode: r.hollandCode,
        hollandMap: (r.hollandScores ?? {}) as Record<string, number>,
        hasAbility: !!(r as any).abilityScores,
        differentiation: r.differentiation,
        confidenceScore: r.confidenceScore,
        complete: !!r.hollandCode && !!(r as any).abilityScores,
      })),
    } as const;
  }),

  /** Buang partial sesi in_progress TERBARU user utk tes (abas 'Mulai ulang' di kartu). */
  abandon: publicProcedure
    .input(z.object({ studentId: z.string().min(1), code: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const who = resolveStudentId(context, input.studentId);
      if (who.error) return { ok: false, error: who.error } as const;
      const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, input.code) });
      if (!a) return { ok: true, dropped: 0 } as const;
      const vs = await db.query.assessmentVersions.findMany({
        where: eq(schema.assessmentVersions.assessmentId, a.id),
      });
      const sess = await db.query.assessmentSessions.findFirst({
        where: and(
          inArray(
            schema.assessmentSessions.versionId,
            vs.map((v) => v.id),
          ),
          eq(schema.assessmentSessions.studentId, who.studentId as string),
          eq(schema.assessmentSessions.status, "in_progress"),
        ),
        orderBy: (t: any) => [desc(t.startedAt)],
      });
      if (!sess) return { ok: true, dropped: 0 } as const;
      await db.delete(schema.assessmentAnswers).where(eq(schema.assessmentAnswers.sessionId, sess.id));
      await db.delete(schema.assessmentDimensionScores).where(eq(schema.assessmentDimensionScores.sessionId, sess.id));
      await db.delete(schema.assessmentResults).where(eq(schema.assessmentResults.sessionId, sess.id));
      await db.delete(schema.assessmentSessions).where(eq(schema.assessmentSessions.id, sess.id));
      return { ok: true, dropped: 1, sessionId: sess.id } as const;
    }),

  /** Heartbeat timer — otoritas SERVER: current_time + deadline aktif + status timeout/lock. */
  timerState: publicProcedure.input(z.object({ sessionId: z.string().min(1) })).handler(async ({ input, context }) => {
    const sess = await db.query.assessmentSessions.findFirst({
      where: eq(schema.assessmentSessions.id, input.sessionId),
    });
    if (!sess) return { ok: false, error: "session_not_found" } as const;
    if (!canAccessSession(sess, context)) return { ok: false, error: "forbidden" } as const;
    const timer = ((sess.configJson as any)?.timer ?? null) as any;
    if (!timer) return { ok: true, scope: "none", serverNow: Date.now() } as const;
    const now = Date.now();
    // (#7) Timer bisa beda scope antar dimensi → kirim keduanya; klien menentukan
    // deadline efektif per soal (qEnds[i] bila ada, kalau tidak deadline dimensinya).
    const dims: { id: string; endISO: string; durationSeconds: number; expired: boolean }[] = (timer.dims ?? []).map(
      (d: any) => ({
        id: d.id,
        endISO: d.endISO,
        durationSeconds: Number(d.durationSeconds ?? 0),
        expired: now >= new Date(d.endISO).getTime(),
      }),
    );
    const qEnds: string[] = (timer.qEnds ?? []) as string[];
    const hasQ = qEnds.some((iso) => !!iso);
    const activeIndex = qEnds.findIndex((iso) => !!iso && now < new Date(iso).getTime());
    const anyActive =
      dims.some((d) => !d.expired) ||
      qEnds.some((iso) => !!iso && now < new Date(iso).getTime()) ||
      (!dims.length && !hasQ);
    return {
      ok: true,
      scope: timer.mixed ? "mixed" : (timer.scope ?? "none"),
      dimScopes: timer.dimScopes ?? {},
      serverNow: now,
      dims,
      qEnds,
      qPerMs: Math.max(1000, Number(timer.qPerMs ?? 30000)),
      activeIndex: activeIndex === -1 ? qEnds.length : activeIndex,
      activeDimId: dims.find((d) => !d.expired)?.id ?? null,
      timedOut: !anyActive,
    } as const;
  }),

  /** Status sesi SEMESTI (in_progress + sudah ada jawaban) — utk CTA 'Lanjutkan' di kartu test. */
  pending: publicProcedure
    .input(z.object({ studentId: z.string().min(1), code: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const who = resolveStudentId(context, input.studentId);
      if (who.error) return { ok: false, error: who.error } as const;
      const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, input.code) });
      if (!a) return { ok: true, present: false } as const;
      const vs = await db.query.assessmentVersions.findMany({
        where: eq(schema.assessmentVersions.assessmentId, a.id),
      });
      // Hanya sesi TERBARU yg menentukan: kalau terbaru masih in_progress + sudah ada jawaban → lanjutkan;
      // kalau terbaru sudah selesai (atau kosong) → TIDAK ada progres yg harus dilanjutkan (sesi yg lebih lama superseded).
      const sess = await db.query.assessmentSessions.findFirst({
        where: and(
          inArray(
            schema.assessmentSessions.versionId,
            vs.map((v) => v.id),
          ),
          eq(schema.assessmentSessions.studentId, who.studentId as string),
        ),
        orderBy: (t: any) => [desc(t.startedAt)],
      });
      if (!sess || sess.status !== "in_progress") return { ok: true, present: false } as const;
      const answered = await db.query.assessmentAnswers.findMany({
        where: eq(schema.assessmentAnswers.sessionId, sess.id),
        columns: { id: true },
      });
      if (answered.length === 0) return { ok: true, present: false } as const;
      const total = await db.query.questions.findMany({
        where: and(eq(schema.questions.versionId, sess.versionId), eq(schema.questions.isActive, true)),
        columns: { id: true },
      });
      return {
        ok: true,
        present: true,
        sessionId: sess.id,
        answered: answered.length,
        total: total.length,
        fullyAnswered: answered.length >= total.length,
      } as const;
    }),

  /** Bersihkan row attempt yang TIDAK lengkap (junk/abandon) utk user — dipanggil saat 'Tes Baru'. */
  purgeIncomplete: publicProcedure
    .input(z.object({ studentId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const who = resolveStudentId(context, input.studentId);
      if (who.error) return { ok: false, error: who.error } as const;
      const rows = await db.query.tmbAssessmentResults.findMany({
        where: eq(tmbAssessmentResults.userId, who.studentId as string),
      });
      let purged = 0;
      for (const r of rows) {
        const hReal = (r.hollandCode ?? "").length > 0;
        const aReal = Object.keys((r as any).abilityScores ?? {}).length > 0;
        if (hReal && aReal) continue; // attempt lengkap disimpan
        await db.delete(tmbRecommendations).where(eq(tmbRecommendations.resultId, r.id));
        await db.delete(tmbAssessmentResults).where(eq(tmbAssessmentResults.id, r.id));
        purged++;
      }
      // sesi engine yang terkatung-katung (in_progress / selesai tanpa 0 jawaban) dibuang juga
      const stray = await db.query.assessmentSessions.findMany({
        where: eq(schema.assessmentSessions.studentId, who.studentId as string),
      });
      const ghost = [] as string[];
      for (const ss of stray) {
        const an = await db.query.assessmentAnswers.findMany({
          where: eq(schema.assessmentAnswers.sessionId, ss.id),
          columns: { id: true },
        });
        // 'Tes Baru' = mulai bersih: partial in_progress (sensi sengaja/pause) JUG S dibuang
        if (ss.status === "in_progress") ghost.push(ss.id);
        else if (an.length === 0) ghost.push(ss.id);
      }
      for (const gid of ghost) {
        await db.delete(schema.assessmentAnswers).where(eq(schema.assessmentAnswers.sessionId, gid));
        await db.delete(schema.assessmentDimensionScores).where(eq(schema.assessmentDimensionScores.sessionId, gid));
        await db.delete(schema.assessmentResults).where(eq(schema.assessmentResults.sessionId, gid));
        await db.delete(schema.assessmentSessions).where(eq(schema.assessmentSessions.id, gid));
        purged++;
      }
      return { ok: true, purged } as const;
    }),

  /** Detail sesi + jawaban (utk resume/restore posisi). */
  session: publicProcedure.input(z.object({ sessionId: z.string().min(1) })).handler(async ({ input, context }) => {
    const sess = await db.query.assessmentSessions.findFirst({
      where: eq(schema.assessmentSessions.id, input.sessionId),
    });
    if (!sess) return { ok: false, error: "session_not_found" } as const;
    if (!canAccessSession(sess, context)) return { ok: false, error: "forbidden" } as const;
    const answered = await db.query.assessmentAnswers.findMany({
      where: eq(schema.assessmentAnswers.sessionId, input.sessionId),
    });
    const byQ = answered.map((a) => ({ questionId: a.questionId, optionId: a.selectedOptionId, text: a.textAnswer }));
    const sessCfg = ((sess.configJson ?? {}) as any) ?? {};
    const orderIds = (sessCfg?.questionOrderIds ?? null) as string[] | null;
    return {
      ok: true,
      session: sess,
      status: sess.status,
      answers: byQ,
      orderIds,
      optionOrder: sessCfg?.optionOrder ?? null,
    };
  }),
};

// ─── Admin ─────────────────────────────────────────────

/** ── Konten builder (admin) ── */
/** Normalisasi jenis evaluasi isian: exact(persis) default; angka; kata; pola. */
function normalizeEval(v?: string): string {
  const t = (v ?? "").trim().toLowerCase();
  if (!t) return "exact_match";
  if (t.includes("kata") || t.includes("keyword")) return "keyword_match";
  if (t.includes("pola") || t.includes("regex") || t.includes("pattern")) return "pattern_match";
  if (t.includes("angka") || t.includes("numeric") || t.includes("toler")) return "numeric_tolerance";
  if (t.includes("persis") || t.includes("exact")) return "exact_match";
  return "exact_match";
}

/** Acak array (Fisher–Yates) tanpa memutasi input. Dipakai randomize_q / randomize_a. */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** Skala emoji bawaan untuk soal bertipe `likert` (dipakai impor & fallback UI). */
const DEFAULT_LIKERT = [
  { emoji: "😡", caption: "Sangat tidak suka" },
  { emoji: "🙁", caption: "Tidak suka" },
  { emoji: "😐", caption: "Netral" },
  { emoji: "🙂", caption: "Suka" },
  { emoji: "😍", caption: "Sangat suka" },
];

function computeRunSections(
  cfg: any,
  qs: { id: string; dimensionId: string; displayOrder: number; isActive: boolean }[],
  dims: { id: string; name: string }[],
) {
  const sm = cfg?.section_mode ?? "none";
  if (sm === "by_dimension") {
    const nameOf = new Map(dims.map((d) => [d.id, d.name]));
    // Rentang dari URUTAN SOAL YANG SEBENARNYA (blok kontigu per dimensi), bukan asumsi
    // "soal satu dimensi pasti berurutan". Bila urutan berselang (impor/manual), asumsi lama
    // membuat bagian berlabel salah (mis. "Bagian Numerik" isinya soal verbal).
    const runs: { key: string; title: string; from: number; to: number }[] = [];
    for (const [i, q] of qs.entries()) {
      const last = runs[runs.length - 1];
      if (last && last.key === q.dimensionId) last.to = i;
      else runs.push({ key: q.dimensionId, title: nameOf.get(q.dimensionId) ?? "Bagian", from: i, to: i });
    }
    const uniq = new Set(qs.map((q) => q.dimensionId)).size;
    if (runs.length === uniq) return runs;
    // Berselang → sisi runtime (discover.start) mengelompokkan ulang per dimensi.
    let pos = 0;
    const arr: { key: string; title: string; from: number; to: number }[] = [];
    for (const d of dims) {
      const cnt = qs.filter((q) => q.dimensionId === d.id).length;
      if (cnt > 0) {
        arr.push({ key: d.id, title: d.name, from: pos, to: pos + cnt - 1 });
        pos += cnt;
      }
    }
    return arr;
  }
  if (sm?.startsWith("chunk")) {
    const size = Number(sm.split(":")[1] ?? 10) || 10;
    const arr: { key: string; title: string; from: number; to: number }[] = [];
    for (let f = 0; f < qs.length; f += size)
      arr.push({
        key: `chunk${f}`,
        title: `Bagian ${arr.length + 1}`,
        from: f,
        to: Math.min(f + size - 1, qs.length - 1),
      });
    return arr;
  }
  return qs.length ? [{ key: "all", title: "Satu Bagian", from: 0, to: qs.length - 1 }] : [];
}

/**
 * B2B (sekolah): tandai peserta roster yang sudah mulai mengerjakan tes.
 * Roster = `tmb_batch_students` (diisi admin sekolah / import CSV, lalu diklaim siswa).
 * Aman dipanggil untuk id preview (`preview-…`) — query-nya tidak menemukan apa pun.
 */
async function markRosterStarted(userId: string) {
  if (!userId || userId.startsWith("preview-")) return;
  await db
    .update(tmbBatchStudents)
    .set({ status: "in_progress" })
    .where(and(eq(tmbBatchStudents.userId, userId), eq(tmbBatchStudents.status, "invited")));
}

/**
 * B2B (sekolah): tautkan hasil TERBARU ke roster sekolah milik siswa ini.
 *
 * Dulu tautan hanya ditulis engine lama (`tmb.assessment.finish`) yang tidak lagi dipakai
 * Discover/Talent → rekap sekolah selalu kosong. Sekarang ditulis di engine baru, dan
 * selalu menunjuk hasil terbaru (retake boleh berkali-kali).
 */
async function linkRosterResult(userId: string, resultId: string) {
  if (!userId || userId.startsWith("preview-")) return 0;
  const rows = await db.query.tmbBatchStudents.findMany({
    where: eq(tmbBatchStudents.userId, userId),
    columns: { id: true },
  });
  if (!rows.length) return 0;
  await db.update(tmbBatchStudents).set({ resultId, status: "completed" }).where(eq(tmbBatchStudents.userId, userId));
  return rows.length;
}

async function contentOfVersion(versionId: string) {
  const questions = await db.query.questions.findMany({
    where: eq(schema.questions.versionId, versionId),
    orderBy: asc(schema.questions.displayOrder),
  });
  const qIds = questions.map((q) => q.id);
  const opts = qIds.length
    ? await db.query.questionOptions.findMany({
        where: inArray(schema.questionOptions.questionId, qIds),
        orderBy: asc(schema.questionOptions.displayOrder),
      })
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

/**
 * Hapus tes beserta seluruh turunannya.
 *
 * Cukup SATU query: `assessment_versions` → `assessment_dimensions` / `questions` /
 * `assessment_sections` / `assessment_sessions` semuanya ON DELETE CASCADE, dan
 * jawaban/hasil/skor ikut cascade dari sesi. Versi lama (hapus per baris) menembus
 * batas subrequest/CPU Worker untuk tes besar (120 soal) sehingga gagal.
 */
async function removeAssessment(assessmentId: string) {
  await db.delete(schema.assessments).where(eq(schema.assessments.id, assessmentId));
}

export const discoverAdminRouter = {
  media: {
    // kind: "question" = gambar utk teks soal · "option" = gambar utk pilihan/jawaban (folder R2 terpisah)
    list: adminProcedure
      .input(z.object({ code: z.string().optional(), kind: z.enum(["question", "option"]).optional() }))
      .handler(async ({ input }) => {
        // rapi per test: assessment-media/{CODE}/question|option/
        const prefix = input.code
          ? `assessment-media/${input.code}/${input.kind ?? ""}`
          : input.kind
            ? `assessment-media/${input.kind}/`
            : "assessment-media/";
        const items = await listR2ObjectsDetailed(prefix);
        return {
          items: items.map((o) => ({
            key: o.key,
            url: getPublicUrl(o.key),
            size: o.size,
            uploadedAt: o.lastModified ?? null,
            name: o.key.split("/").pop() ?? o.key,
          })),
        };
      }),
    upload: adminProcedure
      .input(
        z.object({
          dataB64: z.string().min(10),
          mime: z.string().max(80).optional().default("image/png"),
          filename: z.string().max(120).optional(),
          kind: z.enum(["question", "option"]).optional().default("question"),
          code: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const buf = Buffer.from(input.dataB64, "base64");
        const ext = (input.mime.split("/")[1] ?? "png").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "png";
        const path = input.code ? `assessment-media/${input.code}/${input.kind}` : `assessment-media/${input.kind}`;
        const res = await uploadToR2(buf, {
          filename: input.filename ?? `media.${ext}`,
          mimeType: input.mime || "image/png",
          path,
        });
        return { ok: true, key: res.key, url: res.url, size: res.size };
      }),
    delete: adminProcedure.input(z.object({ key: z.string().min(1) })).handler(async ({ input }) => {
      const raw = input.key.startsWith("assessment-media/") ? input.key : (extractKeyFromUrl(input.key) ?? "");
      if (!raw.startsWith("assessment-media/")) return { ok: false, error: "key_tidak_valid" } as const;
      await deleteFromR2(raw);
      return { ok: true };
    }),
  },

  list: adminProcedure.handler(async () => {
    const assessments = await db.query.assessments.findMany({ orderBy: asc(schema.assessments.code) });
    const versions = await db.query.assessmentVersions.findMany({
      orderBy: asc(schema.assessmentVersions.versionNumber),
    });
    return { assessments, versions };
  }),

  /** Satu panggilan utk index (list + versi) — hemat round-trip. */
  summaries: adminProcedure.handler(async () => {
    const assessments = await db.query.assessments.findMany({ orderBy: asc(schema.assessments.code) });
    const versions = await db.query.assessmentVersions.findMany({ orderBy: (t: any) => [desc(t.versionNumber)] });
    const byAss = new Map<string, any[]>();
    for (const v of versions) {
      const arr = byAss.get(v.assessmentId) ?? [];
      arr.push(v);
      byAss.set(v.assessmentId, arr);
    }
    return {
      items: assessments.map((a) => ({
        ...a,
        versions: (byAss.get(a.id) ?? []).map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          status: v.status,
          publishedAt: v.publishedAt,
          configJson: v.configJson,
        })),
      })),
    };
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
    createDraft: adminProcedure.input(z.object({ code: z.string().min(1) })).handler(async ({ input }) => {
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
      const dims = await db.query.assessmentDimensions.findMany({
        where: eq(schema.assessmentDimensions.versionId, live.id),
      });
      const dimMap = new Map<string, string>();
      for (const d of dims) {
        const nd = uid();
        dimMap.set(d.id, nd);
        await db.insert(schema.assessmentDimensions).values({ ...d, id: nd, versionId: newVerId });
      }
      // copy pengantar (sections) — sebelumnya tidak ikut tersalin
      const sections = await db.query.assessmentSections.findMany({
        where: eq(schema.assessmentSections.versionId, live.id),
      });
      for (const sc of sections) {
        await db.insert(schema.assessmentSections).values({ ...sc, id: uid(), versionId: newVerId });
      }
      // copy instruksi per dimensi (dimensi di-remap ke salinannya)
      for (const d of dims) {
        const newDimId = dimMap.get(d.id);
        if (!newDimId) continue;
        const ins = await db.query.dimensionInstructions.findMany({
          where: eq(schema.dimensionInstructions.dimensionId, d.id),
        });
        for (const i of ins) {
          await db.insert(schema.dimensionInstructions).values({ ...i, id: uid(), dimensionId: newDimId });
        }
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
            targetDimension: dimMap.get(o.targetDimension) ?? o.targetDimension,
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
    publish: adminProcedure.input(z.object({ versionId: z.string().min(1) })).handler(async ({ input }) => {
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
            presentationMode: z.string().optional().nullable(),
            questionType: z.enum(["multiple_choice", "text_input", "likert"]).default("multiple_choice"),
            hasMathNotation: z.boolean().default(false),
            mediaUrl: z.string().optional().nullable(),
            mediaCaption: z.string().optional().nullable(),
            weight: z.number().optional().default(1),
            durationSeconds: z.number().int().min(0).max(3600).optional().nullable(),
            displayOrder: z.number().optional().default(0),
            isActive: z.boolean().optional().default(true),
            options: z
              .array(
                z.object({
                  id: z.string().optional(),
                  optionValue: z.string().optional(),
                  label: z.string().optional(), // boleh kosong — opsi gambar saja
                  score: z.number().optional().default(0),
                  targetDimension: z.string().optional().nullable(),
                  imageUrl: z.string().optional().nullable(),
                  imageCaption: z.string().optional().nullable(),
                  icon: z.string().optional().nullable(),
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
        // Answer scale bawaan bila tidak disebut — skala reusable (value terpisah dr skor)
        let scaleId = q.scaleId ?? null;
        if (!scaleId && q.questionType === "multiple_choice") {
          const def = await db.query.answerScales.findFirst({
            where: eq(schema.answerScales.name, "Skala Bawaan (A-F, 1 poin)"),
          });
          if (def) scaleId = def.id;
          else {
            scaleId = uid();
            await db.insert(schema.answerScales).values({
              id: scaleId,
              name: "Skala Bawaan (A-F, 1 poin)",
              description: "Skala default: 1 poin utk opsi ke dimensi, 0 utk lainnya.",
            });
            await db.insert(schema.answerScaleOptions).values([
              { id: uid(), scaleId, value: "A", score: 1, label: "A" },
              { id: uid(), scaleId, value: "B", score: 0, label: "B" },
              { id: uid(), scaleId, value: "C", score: 0, label: "C" },
              { id: uid(), scaleId, value: "D", score: 0, label: "D" },
              { id: uid(), scaleId, value: "E", score: 0, label: "E" },
              { id: uid(), scaleId, value: "F", score: 0, label: "F" },
            ]);
          }
        }
        const qid = q.id ?? uid();
        if (!q.id) {
          // Nomor urut WAJIB unik per dimensi (syarat gate). Klien bisa mengirim nilai yang
          // basi/duplikat, jadi server menormalkan di sini.
          const siblings = await db.query.questions.findMany({
            where: and(eq(schema.questions.versionId, versionId), eq(schema.questions.dimensionId, q.dimensionId)),
            columns: { displayOrder: true },
          });
          const taken = new Set(siblings.map((x) => x.displayOrder));
          let order = Number(q.displayOrder ?? 0);
          if (order < 0 || taken.has(order))
            order = siblings.reduce((m, x) => Math.max(m, (x.displayOrder ?? 0) + 1), 0);
          q.displayOrder = order;
          await db.insert(schema.questions).values({
            id: qid,
            versionId,
            dimensionId: q.dimensionId,
            scaleId,
            questionText: q.questionText,
            questionType: q.questionType as any,
            hasMathNotation: q.hasMathNotation,
            presentationMode: (q.presentationMode ?? "standard_option_card") as any,
            mediaUrl: q.mediaUrl ?? null,
            mediaCaption: q.mediaCaption ?? null,
            weight: q.weight,
            durationSeconds: q.durationSeconds ?? null,
            displayOrder: q.displayOrder,
            isActive: q.isActive,
          });
        } else {
          await db
            .update(schema.questions)
            .set({
              dimensionId: q.dimensionId,
              scaleId,
              questionText: q.questionText,
              questionType: q.questionType as any,
              hasMathNotation: q.hasMathNotation,
              presentationMode: (q.presentationMode ?? "standard_option_card") as any,
              mediaUrl: q.mediaUrl ?? null,
              mediaCaption: q.mediaCaption ?? null,
              weight: q.weight,
              durationSeconds: q.durationSeconds ?? null,
              displayOrder: q.displayOrder,
              isActive: q.isActive,
            })
            .where(eq(schema.questions.id, qid));
        }
        await db.delete(schema.questionOptions).where(eq(schema.questionOptions.questionId, qid));
        for (let oi = 0; oi < q.options.length; oi++) {
          const o = q.options[oi];
          if (!o) continue;
          await db.insert(schema.questionOptions).values({
            id: o.id ?? uid(),
            questionId: qid,
            optionValue: o.optionValue || String.fromCharCode(65 + oi),
            targetDimension: o.targetDimension ?? q.dimensionId,
            label: o.label ?? "",
            score: o.score,
            imageUrl: o.imageUrl ?? null,
            imageCaption: o.imageCaption ?? null,
            icon: o.icon ?? null,
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

    contentDelete: adminProcedure.input(z.object({ questionId: z.string().min(1) })).handler(async ({ input }) => {
      await db.delete(schema.questions).where(eq(schema.questions.id, input.questionId));
      return { ok: true };
    }),

    /** Urutkan ulang soal (daftar id berurutan). */
    contentReorder: adminProcedure
      .input(z.object({ versionId: z.string().min(1), orderedIds: z.array(z.string()).min(1) }))
      .handler(async ({ input }) => {
        for (let i = 0; i < input.orderedIds.length; i++) {
          const qid = input.orderedIds[i];
          if (!qid) continue;
          await db
            .update(schema.questions)
            .set({ displayOrder: i })
            .where(and(eq(schema.questions.id, qid), eq(schema.questions.versionId, input.versionId)));
        }
        return { ok: true };
      }),

    /** Salin soal berikut opsi/konfig urutan (utk duplikasi cepat). */
    contentDuplicate: adminProcedure.input(z.object({ questionId: z.string().min(1) })).handler(async ({ input }) => {
      const src = await db.query.questions.findFirst({ where: eq(schema.questions.id, input.questionId) });
      if (!src) return { ok: false, error: "question_not_found" } as const;
      const maxQ = await db.query.questions.findMany({
        where: eq(schema.questions.versionId, src.versionId),
        columns: { displayOrder: true },
      });
      const nq = uid();
      await db
        .insert(schema.questions)
        .values({ ...src, id: nq, displayOrder: maxQ.reduce((m, q) => Math.max(m, q.displayOrder ?? 0), 0) + 1 });
      const opts = await db.query.questionOptions.findMany({
        where: eq(schema.questionOptions.questionId, input.questionId),
      });
      for (const o of opts) await db.insert(schema.questionOptions).values({ ...o, id: uid(), questionId: nq });
      const tc = await db.query.textInputConfigs.findFirst({
        where: eq(schema.textInputConfigs.questionId, input.questionId),
      });
      if (tc) await db.insert(schema.textInputConfigs).values({ ...tc, id: uid(), questionId: nq });
      return { ok: true, questionId: nq };
    }),

    /** Import batch soal dari CSV/Excel (rows JSON hasil parse klien). */
    importQuestions: adminProcedure
      .input(
        z.object({
          versionId: z.string().min(1),
          rows: z
            .array(
              z.object({
                text: z.string().min(1),
                dimension: z.string().min(1), // kode atau nama dimensi
                type: z.enum(["multiple_choice", "text_input", "likert"]).optional(),
                options: z.array(z.string()).max(6).optional(),
                presentationMode: z.string().optional(),
                key: z.string().optional(), // huruf kunci utk MC (A-F)
                weight: z.number().optional(),
                answerKey: z.string().optional(),
                evalType: z.string().optional(),
                numericTolerance: z.string().optional(),
              }),
            )
            .max(500),
        }),
      )
      .handler(async ({ input }) => {
        const dims = await db.query.assessmentDimensions.findMany({
          where: eq(schema.assessmentDimensions.versionId, input.versionId),
        });
        const byCode = new Map(dims.map((d) => [d.code.toLowerCase(), d]));
        const byName = new Map(dims.map((d) => [d.name.toLowerCase(), d]));
        const createdDims: string[] = [];
        const maxDimOrder = dims.reduce((m, d) => Math.max(m, d.displayOrder ?? 0), 0);
        const ensureDim = async (raw: string): Promise<{ id: string } | null> => {
          const val = (raw ?? "").trim();
          if (!val) return null;
          const low = val.toLowerCase();
          const hit = byCode.get(low) ?? byName.get(low);
          if (hit) return { id: hit.id };
          // auto-create dimensi baru.
          // Kalau nilainya sudah "code-like" (mis. "verbal", "R", "D1") pakai APA ADANYA —
          // kode dimensi adalah kontrak lintas modul (Pola Jurusan memakai abilityWeights
          // dengan kunci lowercase), jadi jangan diubah jadi VERB/VERBA.
          const compact = val.replace(/\s+/g, "");
          const codeBase =
            (/^[A-Za-z0-9_-]{1,12}$/.test(compact) ? compact : compact.toUpperCase().slice(0, 4)) || "DIM";
          let code = codeBase;
          let n = 2;
          while (byCode.has(code.toLowerCase())) {
            code = codeBase.slice(0, 4) + n;
            n++;
          }
          const did = uid();
          await db.insert(schema.assessmentDimensions).values({
            id: did,
            versionId: input.versionId,
            code,
            name: val,
            shortName: code,
            displayOrder: maxDimOrder + byCode.size + 1,
            isActive: true,
          });
          byCode.set(code.toLowerCase(), { id: did } as any);
          byName.set(low, { id: did } as any);
          createdDims.push(`${val} → ${code}`);
          return { id: did };
        };
        const defaultScale = await db.query.answerScales.findFirst({
          where: eq(schema.answerScales.name, "Skala Bawaan (A-F, 1 poin)"),
        });
        let scaleId = defaultScale?.id ?? null;
        if (!scaleId) {
          scaleId = "defscale0a0b0c0d0e0f0010";
          await db
            .insert(schema.answerScales)
            .values({ id: scaleId, name: "Skala Bawaan (A-F, 1 poin)", description: "default" });
        }
        let created = 0;
        const fail: string[] = [];
        const maxOrder = (
          await db.query.questions.findMany({
            where: eq(schema.questions.versionId, input.versionId),
            columns: { displayOrder: true },
          })
        ).reduce((m, q) => Math.max(m, q.displayOrder ?? 0), 0);
        let order = maxOrder + 1;
        for (let ri = 0; ri < input.rows.length; ri++) {
          const r = input.rows[ri];
          if (!r) continue;
          const dim = await ensureDim(r.dimension ?? "");
          if (!dim) {
            fail.push(`Baris ${ri + 2}: kolom Dimensi kosong atau tidak dikenal "${r.dimension}".`);
            continue;
          }
          const typeR = r.type ?? (r.answerKey ? "text_input" : "multiple_choice");
          const qid = uid();
          await db.insert(schema.questions).values({
            id: qid,
            versionId: input.versionId,
            dimensionId: dim.id,
            scaleId: typeR === "multiple_choice" ? scaleId : null,
            questionText: r.text,
            questionType: typeR as any,
            presentationMode: (r.presentationMode ?? "standard_option_card") as any,
            weight: r.weight ?? 1,
            displayOrder: order++,
            isActive: true,
          });
          if (typeR === "likert") {
            // Skala: kalau opsi diberikan → dipakai sebagai caption (label bawah), emoji dari
            // skala bawaan; kalau tidak → skala emoji 5 titik penuh.
            const given = (r.options ?? []).filter((o) => o.trim().length > 0);
            const levels = given.length >= 2 ? given : DEFAULT_LIKERT.map((l) => l.caption);
            for (const [oi, caption] of levels.entries()) {
              const emoji = DEFAULT_LIKERT[oi]?.emoji ?? "•";
              await db.insert(schema.questionOptions).values({
                id: uid(),
                questionId: qid,
                optionValue: String.fromCharCode(65 + oi),
                targetDimension: dim.id,
                label: caption,
                icon: emoji,
                imageCaption: caption,
                score: oi + 1,
                displayOrder: oi,
              });
            }
          } else if (typeR === "multiple_choice") {
            const opts = r.options?.filter((o) => o.trim().length > 0) ?? [];
            if (opts.length === 0) {
              fail.push(`Baris ${ri + 2}: tidak ada opsi utk soal "${r.text.slice(0, 40)}".`);
              await db.delete(schema.questions).where(eq(schema.questions.id, qid));
              continue;
            }
            const keyIdx = r.key ? Math.max(0, r.key.toUpperCase().charCodeAt(0) - 65) : 0;
            for (let oi = 0; oi < opts.length; oi++) {
              await db.insert(schema.questionOptions).values({
                id: uid(),
                questionId: qid,
                optionValue: String.fromCharCode(65 + oi),
                targetDimension: dim.id,
                label: opts[oi] ?? "",
                score: oi === keyIdx ? 1 : 0,
                displayOrder: oi,
              });
            }
          } else {
            const ev = normalizeEval(r.evalType);
            await db.insert(schema.textInputConfigs).values({
              id: uid(),
              questionId: qid,
              evaluationType: ev as any,
              answerKey: r.answerKey ?? "",
              numericTolerance: ev === "numeric_tolerance" ? r.numericTolerance || "0.01" : null,
            });
          }
          created++;
        }
        // sesuaikan total_dim & clamp result_dim_count bila ada dimensi baru
        if (createdDims.length > 0) {
          const v = await db.query.assessmentVersions.findFirst({
            where: eq(schema.assessmentVersions.id, input.versionId),
          });
          const all = await db.query.assessmentDimensions.findMany({
            where: eq(schema.assessmentDimensions.versionId, input.versionId),
          });
          const cfg: any = { ...(v?.configJson ?? {}) };
          cfg.total_dim = all.length;
          if (Number(cfg.result_dim_count ?? 0) > cfg.total_dim) cfg.result_dim_count = Math.max(1, cfg.total_dim);
          if (v)
            await db
              .update(schema.assessmentVersions)
              .set({ configJson: cfg })
              .where(eq(schema.assessmentVersions.id, input.versionId));
        }
        return { ok: true, created, failed: fail, dimsCreated: createdDims };
      }),

    /** Media soal — R2 folder khusus (assessment-media/). */
    /** Kelola section pengantar (intro) utk versi ini. */
    sectionSave: adminProcedure
      .input(
        z.object({
          versionId: z.string().min(1),
          id: z.string().optional(),
          title: z.string().min(1).max(200),
          contentType: z.enum(["description", "bullet_list", "cards"]).default("description"),
          contentJson: z.any().optional(),
          displayOrder: z.number().optional(),
          visibility: z.boolean().optional().default(true),
        }),
      )
      .handler(async ({ input }) => {
        const cnt = (
          await db.query.assessmentSections.findMany({
            where: eq(schema.assessmentSections.versionId, input.versionId),
          })
        ).length;
        const data = {
          versionId: input.versionId,
          title: input.title,
          contentType: input.contentType as any,
          contentJson: input.contentJson ?? {},
          displayOrder: input.displayOrder ?? cnt,
          visibility: input.visibility ?? true,
        };
        if (input.id)
          await db.update(schema.assessmentSections).set(data).where(eq(schema.assessmentSections.id, input.id));
        else await db.insert(schema.assessmentSections).values({ id: uid(), ...(data as any) });
        return { ok: true };
      }),
    sectionDelete: adminProcedure.input(z.object({ id: z.string().min(1) })).handler(async ({ input }) => {
      await db.delete(schema.assessmentSections).where(eq(schema.assessmentSections.id, input.id));
      return { ok: true };
    }),
    instrSave: adminProcedure
      .input(
        z.object({
          dimensionId: z.string().min(1),
          id: z.string().optional(),
          header: z.string().min(1).max(200),
          contentType: z.enum(["description", "bullet_list"]).default("bullet_list"),
          contentJson: z.any().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const data = {
          dimensionId: input.dimensionId,
          header: input.header,
          contentType: input.contentType as any,
          contentJson: input.contentJson ?? {},
        };
        if (input.id)
          await db.update(schema.dimensionInstructions).set(data).where(eq(schema.dimensionInstructions.id, input.id));
        else await db.insert(schema.dimensionInstructions).values({ id: uid(), ...(data as any) });
        return { ok: true };
      }),

    /** Validasi live tanpa publish (gatekeeper). */
    validate: adminProcedure
      .input(z.object({ versionId: z.string().min(1) }))
      .handler(async ({ input }) => validatePublish(input.versionId)),

    /** Tambah dimensi ke versi (draf) + sesuaikan total_dim di config. */
    dimsAdd: adminProcedure
      .input(
        z.object({ versionId: z.string().min(1), code: z.string().min(1).max(20), name: z.string().min(1).max(80) }),
      )
      .handler(async ({ input }) => {
        const dims = await db.query.assessmentDimensions.findMany({
          where: eq(schema.assessmentDimensions.versionId, input.versionId),
        });
        const maxOrder = dims.reduce((m, d) => Math.max(m, d.displayOrder ?? 0), 0);
        const dup = dims.find((d) => d.code.toLowerCase() === input.code.toLowerCase());
        if (dup) return { ok: false, error: "kode_dimensi_sudah_ada" } as const;
        await db.insert(schema.assessmentDimensions).values({
          id: uid(),
          versionId: input.versionId,
          code: input.code.toUpperCase(),
          name: input.name,
          displayOrder: maxOrder + 1,
          isActive: true,
        });
        const v = await db.query.assessmentVersions.findFirst({
          where: eq(schema.assessmentVersions.id, input.versionId),
        });
        const cfg: any = { ...(v?.configJson ?? {}) };
        cfg.total_dim = dims.length + 1;
        if (Number(cfg.result_dim_count ?? 0) > cfg.total_dim) cfg.result_dim_count = cfg.total_dim;
        if (v)
          await db
            .update(schema.assessmentVersions)
            .set({ configJson: cfg })
            .where(eq(schema.assessmentVersions.id, input.versionId));
        return { ok: true };
      }),

    /** Update dimensi: nama/kode/durasi (durasi dipakai timer scope dimension). */
    dimsUpdate: adminProcedure
      .input(
        z.object({
          dimensionId: z.string().min(1),
          name: z.string().min(1).max(80).optional(),
          code: z.string().min(1).max(20).optional(),
          durationSeconds: z.number().int().min(0).max(3600).optional(),
          // (#7) scope timer per dimensi; null/"" = ikut config global
          timerScope: z.enum(["none", "dimension", "question", "inherit"]).optional(),
        }),
      )
      .handler(async ({ input }) => {
        const dim = await db.query.assessmentDimensions.findFirst({
          where: eq(schema.assessmentDimensions.id, input.dimensionId),
        });
        if (!dim) return { ok: false, error: "dimension_not_found" } as const;
        await db
          .update(schema.assessmentDimensions)
          .set({
            ...(input.name ? { name: input.name } : {}),
            ...(input.code ? { code: input.code.toUpperCase() } : {}),
            ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}),
            ...(input.timerScope !== undefined
              ? { timerScope: input.timerScope === "inherit" ? null : input.timerScope }
              : {}),
          })
          .where(eq(schema.assessmentDimensions.id, input.dimensionId));
        return { ok: true } as const;
      }),

    /** Hapus dimensi + seluruh soalnya dari versi (draf). */
    dimsDelete: adminProcedure.input(z.object({ dimensionId: z.string().min(1) })).handler(async ({ input }) => {
      const dim = await db.query.assessmentDimensions.findFirst({
        where: eq(schema.assessmentDimensions.id, input.dimensionId),
      });
      if (!dim) return { ok: false, error: "dimension_not_found" } as const;
      const qs = await db.query.questions.findMany({ where: eq(schema.questions.dimensionId, input.dimensionId) });
      for (const q of qs) {
        await db.delete(schema.questionOptions).where(eq(schema.questionOptions.questionId, q.id));
        await db.delete(schema.textInputConfigs).where(eq(schema.textInputConfigs.questionId, q.id));
      }
      await db.delete(schema.questions).where(eq(schema.questions.dimensionId, input.dimensionId));
      await db
        .delete(schema.dimensionInstructions)
        .where(eq(schema.dimensionInstructions.dimensionId, input.dimensionId));
      await db.delete(schema.assessmentDimensions).where(eq(schema.assessmentDimensions.id, input.dimensionId));
      const v = await db.query.assessmentVersions.findFirst({ where: eq(schema.assessmentVersions.id, dim.versionId) });
      const rem = await db.query.assessmentDimensions.findMany({
        where: eq(schema.assessmentDimensions.versionId, dim.versionId),
      });
      const cfg: any = { ...(v?.configJson ?? {}) };
      cfg.total_dim = rem.length;
      if (Number(cfg.result_dim_count ?? 0) > cfg.total_dim) cfg.result_dim_count = Math.max(1, cfg.total_dim);
      if (v)
        await db
          .update(schema.assessmentVersions)
          .set({ configJson: cfg })
          .where(eq(schema.assessmentVersions.id, v.id));
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
        const v = await db.query.assessmentVersions.findFirst({
          where: eq(schema.assessmentVersions.id, input.versionId),
        });
        if (!v) return { ok: false, error: "version_not_found" } as const;
        const merged = { ...(v.configJson ?? {}), ...input.config };
        await db
          .update(schema.assessmentVersions)
          .set({ configJson: merged })
          .where(eq(schema.assessmentVersions.id, input.versionId));
        return { ok: true, config: merged };
      }),
  },

  /** Buat tes baru + versi draf v1 (bahan kerjanyam). */
  create: adminProcedure
    .input(
      z.object({
        code: z.string().min(2).max(40),
        name: z.string().min(1).max(120),
        description: z.string().optional(),
        family: z.enum(["minat", "bakat"]).optional().nullable(),
      }),
    )
    .handler(async ({ input }) => {
      const dup = await db.query.assessments.findFirst({ where: eq(schema.assessments.code, input.code) });
      if (dup) return { ok: false, error: "code_sudah_dipakai" } as const;
      const aid = uid();
      const vid = uid();
      const cfg = {
        total_dim: 1,
        result_dim_count: 1,
        min_q_per_dim: 0,
        randomize_q: false,
        randomize_a: false,
        timer_enabled: false,
        timer_scope: "none",
        allow_pause: false,
        scoring_method: "sum",
      };
      await db.insert(schema.assessments).values({
        id: aid,
        code: input.code,
        family: input.family ?? null,
        name: input.name,
        description: input.description ?? null,
        defaultConfigJson: cfg,
      });
      await db
        .insert(schema.assessmentVersions)
        .values({ id: vid, assessmentId: aid, versionNumber: 1, status: "draft", configJson: cfg });
      return { ok: true, assessmentId: aid, versionId: vid };
    }),

  /** Ubah nama/deskripsi tes. */
  updateMeta: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(120),
        description: z.string().optional().nullable(),
        family: z.enum(["minat", "bakat"]).optional().nullable(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(schema.assessments)
        .set({ name: input.name, description: input.description ?? null, family: input.family ?? null })
        .where(eq(schema.assessments.id, input.id));
      return { ok: true };
    }),

  /** Ringkasan dampak sebelum menghapus (dipakai tangga konfirmasi di UI). */
  inspect: adminProcedure.input(z.object({ id: z.string().min(1) })).handler(async ({ input }) => {
    const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.id, input.id) });
    if (!a) return { ok: false, error: "not_found" } as const;
    const vs = await db.query.assessmentVersions.findMany({
      where: eq(schema.assessmentVersions.assessmentId, a.id),
      columns: { id: true, status: true, versionNumber: true },
    });
    const vIds = vs.map((v) => v.id);
    const qs = vIds.length
      ? await db.query.questions.findMany({ where: inArray(schema.questions.versionId, vIds), columns: { id: true } })
      : [];
    const sessions = vIds.length
      ? await db.query.assessmentSessions.findMany({
          where: inArray(schema.assessmentSessions.versionId, vIds),
          columns: { id: true },
        })
      : [];
    return {
      ok: true,
      assessment: { id: a.id, code: a.code, name: a.name, family: a.family },
      counts: {
        versions: vs.length,
        liveVersions: vs.filter((v) => v.status === "live").length,
        questions: qs.length,
        sessions: sessions.length,
      },
      // Tes minat/bakat resmi tidak boleh dihapus dari UI (dipakai kanal B2C/B2B).
      protectedFamily: a.family === "minat" || a.family === "bakat",
    } as const;
  }),

  /** Unduh backup JSON lengkap (WAJIB sebelum menghapus permanen). */
  exportAssessment: adminProcedure.input(z.object({ id: z.string().min(1) })).handler(async ({ input }) => {
    const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.id, input.id) });
    if (!a) return { ok: false, error: "not_found" } as const;
    const versions = await db.query.assessmentVersions.findMany({
      where: eq(schema.assessmentVersions.assessmentId, a.id),
    });
    const vIds = versions.map((v) => v.id);
    const dims = vIds.length
      ? await db.query.assessmentDimensions.findMany({ where: inArray(schema.assessmentDimensions.versionId, vIds) })
      : [];
    const sections = vIds.length
      ? await db.query.assessmentSections.findMany({ where: inArray(schema.assessmentSections.versionId, vIds) })
      : [];
    const questions = vIds.length
      ? await db.query.questions.findMany({ where: inArray(schema.questions.versionId, vIds) })
      : [];
    const qIds = questions.map((q) => q.id);
    const options = qIds.length
      ? await db.query.questionOptions.findMany({ where: inArray(schema.questionOptions.questionId, qIds) })
      : [];
    const textConfigs = qIds.length
      ? await db.query.textInputConfigs.findMany({ where: inArray(schema.textInputConfigs.questionId, qIds) })
      : [];
    const instructions = dims.length
      ? await db.query.dimensionInstructions.findMany({
          where: inArray(
            schema.dimensionInstructions.dimensionId,
            dims.map((d) => d.id),
          ),
        })
      : [];
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return {
      ok: true,
      filename: `${a.code}-backup-${stamp}.json`,
      json: {
        exportedAt: new Date().toISOString(),
        assessment: a,
        versions,
        dimensions: dims,
        sections,
        instructions,
        questions,
        options,
        textConfigs,
      },
    } as const;
  }),

  /**
   * Hapus PERMANEN. Tangga pengamanannya:
   *  1) UI menampilkan ringkasan dampak (`inspect`) + wajib unduh backup (`exportAssessment`).
   *  2) Admin wajib MENGETIK kode tes (`confirmCode`) — dicek di server.
   *  3) Tes minat/bakat resmi tidak bisa dihapus (`protected_assessment`).
   * Penghapusan sendiri = satu query dengan cascade (cepat, tidak kena limit Worker).
   */
  remove: adminProcedure
    .input(z.object({ id: z.string().min(1), confirmCode: z.string().min(1) }))
    .handler(async ({ input }) => {
      const a = await db.query.assessments.findFirst({ where: eq(schema.assessments.id, input.id) });
      if (!a) return { ok: false, error: "not_found" } as const;
      if (a.family === "minat" || a.family === "bakat") return { ok: false, error: "protected_assessment" } as const;
      if (input.confirmCode.trim().toUpperCase() !== a.code.toUpperCase()) {
        return { ok: false, error: "confirm_mismatch" } as const;
      }
      await removeAssessment(a.id);
      return { ok: true, deleted: { code: a.code, name: a.name } } as const;
    }),
};
