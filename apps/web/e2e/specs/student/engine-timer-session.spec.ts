// E2E USER — timer (per soal & per bagian), pembagian bagian, jeda/lanjut, dan resume sesi.
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, publish, saveQuestion } from "../../fixtures/assessment";
import { createAdminPage } from "../../helpers/admin-ui";
import { rpc } from "../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { runTag } from "../../helpers/env";

const PREFIX = "E2ETM";
const codes: string[] = [];
let admin: Page;
const studentId = () => `e2e-tm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function configOf(code: string, versionId: string) {
  return rpc<{ questions: any[]; runSections: any[] }>("discover/config", { code, versionId });
}

/** Tes 1 dimensi dengan n soal; durasi soal & konfigurasi bisa diatur. */
async function buildTimedTest(
  label: string,
  opts: { config: Record<string, unknown>; questions?: number; perQuestionSeconds?: number; dimensionSeconds?: number },
) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(admin, { code, name: `${label} ${code}` });
  const d1 = await addDimension(admin, versionId, "D1", "Dim", opts.dimensionSeconds);
  const n = opts.questions ?? 4;
  await configUpdate(admin, versionId, { total_dim: 1, result_dim_count: 1, min_q_per_dim: 1, ...opts.config });
  for (let i = 0; i < n; i++) {
    await saveQuestion(admin, versionId, {
      dimensionId: d1,
      questionText: `q${i}`,
      questionType: "multiple_choice",
      durationSeconds: opts.perQuestionSeconds ?? null,
      options: [
        { optionValue: "A", label: "A", score: 1 },
        { optionValue: "B", label: "B", score: 0 },
      ],
    });
  }
  expect((await publish(admin, versionId)).ok).toBe(true);
  return { code, versionId, d1 };
}

test.describe("Engine · timer & sesi", () => {
  test.beforeAll(async ({ browser }) => {
    admin = await createAdminPage(browser);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("timer per soal: deadline tiap soal & submit setelah batas ditolak", async () => {
    test.setTimeout(180000);
    const fx = await buildTimedTest("TimerQ", {
      config: { timer_enabled: true, timer_scope: "question", time_per_question: 5 },
      perQuestionSeconds: 1,
    });
    const cfg = await configOf(fx.code, fx.versionId);
    const st = await rpc<any>("discover/start", { code: fx.code, studentId: studentId(), versionId: fx.versionId });

    expect(st.serverTimer?.scope).toBe("question");
    expect(st.serverTimer?.qEnds).toHaveLength(cfg.questions.length);
    expect(st.serverTimer?.totalSeconds, "durasi custom per soal (1s) dipakai").toBe(cfg.questions.length);

    const ts = await rpc<any>("discover/timerState", { sessionId: st.sessionId });
    expect(ts.scope).toBe("question");
    expect(ts.qEnds).toHaveLength(cfg.questions.length);

    await new Promise((r) => setTimeout(r, 1600));
    const late = await rpc<any>("discover/submit", {
      sessionId: st.sessionId,
      questionId: cfg.questions[0]?.id,
      optionId: cfg.questions[0]?.opts[0]?.id,
    });
    expect(late.ok).toBe(false);
    expect(late.error).toBe("question_timed_out");
  });

  test("timer per bagian: deadline tiap dimensi & submit setelah batas ditolak", async () => {
    test.setTimeout(180000);
    const fx = await buildTimedTest("TimerD", {
      config: { timer_enabled: true, timer_scope: "dimension" },
      dimensionSeconds: 1,
      questions: 2,
    });
    const cfg = await configOf(fx.code, fx.versionId);
    const st = await rpc<any>("discover/start", { code: fx.code, studentId: studentId(), versionId: fx.versionId });

    expect(st.serverTimer?.scope).toBe("dimension");
    expect(st.serverTimer?.dims?.[0]?.durationSeconds).toBe(1);
    const ts = await rpc<any>("discover/timerState", { sessionId: st.sessionId });
    expect(ts.dims?.[0]?.endISO).toBeTruthy();

    await new Promise((r) => setTimeout(r, 1600));
    const late = await rpc<any>("discover/submit", {
      sessionId: st.sessionId,
      questionId: cfg.questions[0]?.id,
      optionId: cfg.questions[0]?.opts[0]?.id,
    });
    expect(late.error).toBe("dimension_timed_out");
  });

  for (const [mode, expected] of [
    ["none", 1],
    ["by_dimension", 2],
    ["chunk:10", 1],
  ] as const) {
    test(`section_mode ${mode} → ${expected} bagian`, async () => {
      test.setTimeout(180000);
      const { code } = runTag(PREFIX);
      codes.push(code);
      const { versionId } = await createAssessment(admin, { code, name: `Sec ${mode} ${code}` });
      const d1 = await addDimension(admin, versionId, "D1", "Dim Satu");
      const d2 = await addDimension(admin, versionId, "D2", "Dim Dua");
      await configUpdate(admin, versionId, { total_dim: 2, result_dim_count: 2, min_q_per_dim: 1, section_mode: mode });
      for (const [i, dim] of [d1, d2].entries()) {
        await saveQuestion(admin, versionId, {
          dimensionId: dim,
          questionText: `q${i}`,
          questionType: "multiple_choice",
          options: [
            { optionValue: "A", label: "A", score: 1 },
            { optionValue: "B", label: "B", score: 0 },
          ],
        });
      }
      expect((await publish(admin, versionId)).ok).toBe(true);

      const cfg = await configOf(code, versionId);
      expect(cfg.runSections.length, `section_mode=${mode}`).toBe(expected);
      if (mode === "by_dimension") expect(cfg.runSections.map((s: any) => s.title)).toEqual(["Dim Satu", "Dim Dua"]);
    });
  }

  test("jeda (pause) lalu start lagi mengembalikan sesi yang sama & bisa dilanjutkan", async () => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(admin, { code, name: `Pause ${code}` });
    const d1 = await addDimension(admin, versionId, "D1", "Dim Pause");
    await configUpdate(admin, versionId, { total_dim: 1, result_dim_count: 1, min_q_per_dim: 2, allow_pause: true });
    for (const i of [0, 1]) {
      await saveQuestion(admin, versionId, {
        dimensionId: d1,
        questionText: `p${i}`,
        questionType: "multiple_choice",
        options: [
          { optionValue: "A", label: "A", score: 1 },
          { optionValue: "B", label: "B", score: 0 },
        ],
      });
    }
    expect((await publish(admin, versionId)).ok).toBe(true);

    const sid = studentId();
    const cfg = await configOf(code, versionId);
    const st = await rpc<any>("discover/start", { code, studentId: sid, versionId });
    await rpc("discover/submit", {
      sessionId: st.sessionId,
      questionId: cfg.questions[0]?.id,
      optionId: cfg.questions[0]?.opts[0]?.id,
    });
    expect((await rpc<any>("discover/pause", { sessionId: st.sessionId })).ok).toBe(true);

    // sesi paused tetap terlihat & bisa dilanjutkan
    const mine = await rpc<any>("discover/mySessions", { studentId: sid, code });
    const act = mine.items?.find((s: any) => s.id === st.sessionId);
    expect(act, "sesi paused harus muncul di mySessions").toBeTruthy();
    expect(act.status).toBe("paused");

    const st2 = await rpc<any>("discover/start", { code, studentId: sid, versionId });
    expect(st2.sessionId, "start harus melanjutkan sesi yang di-pause").toBe(st.sessionId);
    expect(st2.resume).toBe(true);

    // jawaban tetap ada dan bisa ditambah setelah resume
    const sess = await rpc<any>("discover/session", { sessionId: st.sessionId });
    expect(sess.answers?.length).toBe(1);
    const r2 = await rpc<any>("discover/submit", {
      sessionId: st.sessionId,
      questionId: cfg.questions[1]?.id,
      optionId: cfg.questions[1]?.opts[0]?.id,
    });
    expect(r2.ok, "jawaban diterima setelah dilanjutkan").toBe(true);
    expect((await rpc<any>("discover/session", { sessionId: st.sessionId })).answers?.length).toBe(2);
  });

  test("pause ditolak saat allow_pause dimatikan", async () => {
    test.setTimeout(180000);
    const fx = await buildTimedTest("NoPause", { config: { allow_pause: false }, questions: 1 });
    const st = await rpc<any>("discover/start", { code: fx.code, studentId: studentId(), versionId: fx.versionId });
    const paused = await rpc<any>("discover/pause", { sessionId: st.sessionId });
    expect(paused.ok).toBe(false);
    expect(paused.error).toBe("pause_not_allowed");
  });
});
