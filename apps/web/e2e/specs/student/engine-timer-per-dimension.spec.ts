// E2E ENGINE — #7 (Opsi B): timer diatur PER DIMENSI.
//
// Fixture 2 dimensi dengan scope berbeda:
//   · dimensi A → scope "question": tiap soal punya durasi sendiri (2 detik)
//   · dimensi B → scope "dimension": satu deadline per bagian (60 detik)
// Config global `timer_scope: "none"` supaya yang berlaku hanya override per dimensi.
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, saveQuestion } from "../../fixtures/assessment";
import { createAdminPage } from "../../helpers/admin-ui";
import { adminRpc, rpc } from "../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { runTag } from "../../helpers/env";

const PREFIX = "E2ETD";
const codes: string[] = [];
let admin: Page;

async function build() {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(admin, { code, name: `Timer ${code}` });
  const dimA = await addDimension(admin, versionId, "A", "Dim A");
  const dimB = await addDimension(admin, versionId, "B", "Dim B");
  await configUpdate(admin, versionId, {
    total_dim: 2,
    result_dim_count: 2,
    min_q_per_dim: 1,
    section_mode: "none",
    timer_enabled: true,
    timer_scope: "none", // global none → hanya override per dimensi yang berlaku
    time_per_question: 60,
    scoring_method: "sum",
  });
  // (#7) scope timer per dimensi
  await adminRpc(admin, "discoverAdmin/versions/dimsUpdate", { dimensionId: dimA, timerScope: "question" });
  await adminRpc(admin, "discoverAdmin/versions/dimsUpdate", {
    dimensionId: dimB,
    timerScope: "dimension",
    durationSeconds: 60,
  });

  const mc = (dimensionId: string, text: string, displayOrder: number, durationSeconds?: number) =>
    saveQuestion(admin, versionId, {
      dimensionId,
      questionText: text,
      questionType: "multiple_choice",
      displayOrder,
      ...(durationSeconds ? { durationSeconds } : {}),
      options: [
        { optionValue: "A", label: `${text} — A`, score: 1 },
        { optionValue: "B", label: `${text} — B`, score: 0 },
      ],
    });
  await mc(dimA, "A1", 0, 2); // scope soal, 2 detik
  await mc(dimA, "A2", 1, 2);
  await mc(dimB, "B1", 2); // scope dimensi (60 detik)

  return { code, versionId, dimA, dimB };
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
  await closeDb();
  await admin.context().close();
});

test.describe("Engine · timer per dimensi (#7)", () => {
  test("serverTimer memuat deadline per SOAL dan per BAGIAN sekaligus (mixed)", async () => {
    test.setTimeout(180000);
    const fx = await build();
    const cfg = await rpc<{ questions: any[] }>("discover/config", { code: fx.code, versionId: fx.versionId });
    const dimOf = new Map(cfg.questions.map((q) => [q.id, q.dimensionId]));
    const st = await rpc<any>("discover/start", {
      code: fx.code,
      studentId: `e2e-td-${Date.now()}`,
      versionId: fx.versionId,
    });
    const t = st.serverTimer;
    expect(t, "timer harus terbentuk").toBeTruthy();
    expect(t.mixed, "dua scope berbeda → mixed").toBe(true);
    // scope per bagian hanya untuk dimensi B
    expect((t.dims ?? []).map((d: any) => d.id)).toEqual([fx.dimB]);
    expect(Number(t.dims[0].durationSeconds)).toBe(60);
    // qEnds sejajar urutan sesi: terisi utk soal dimensi A, kosong utk soal dimensi B
    const idxA = st.orderIds
      .map((id: string, i: number) => ({ i, dim: dimOf.get(id) }))
      .filter((x: any) => x.dim === fx.dimA)
      .map((x: any) => x.i);
    const idxB = st.orderIds
      .map((id: string, i: number) => ({ i, dim: dimOf.get(id) }))
      .filter((x: any) => x.dim === fx.dimB)
      .map((x: any) => x.i);
    expect(idxA.length).toBe(2);
    expect(idxB.length).toBe(1);
    for (const i of idxA) expect(t.qEnds[i], `qEnds[${i}] harus terisi`).toBeTruthy();
    for (const i of idxB) expect(t.qEnds[i], `qEnds[${i}] harus kosong`).toBe("");
    // total = 2 + 2 (per soal) + 60 (per bagian)
    expect(t.totalSeconds).toBe(64);

    // timerState ikut melaporkan bentuk gabungan
    const ts = await rpc<any>("discover/timerState", { sessionId: st.sessionId });
    expect(ts.scope).toBe("mixed");
    expect((ts.dims ?? []).length).toBe(1);
    expect((ts.qEnds ?? []).filter((x: string) => !!x).length).toBe(2);
    expect(ts.timedOut).toBe(false);
  });

  test("anti-tamper server: soal ber-scope SOAL ditolak setelah deadline, soal per BAGIAN tetap boleh", async () => {
    test.setTimeout(180000);
    const fx = await build();
    const cfg = await rpc<{ questions: any[] }>("discover/config", { code: fx.code, versionId: fx.versionId });
    const st = await rpc<any>("discover/start", {
      code: fx.code,
      studentId: `e2e-td-${Date.now()}`,
      versionId: fx.versionId,
    });
    const qA = cfg.questions.find((q) => q.questionText === "A1")!;
    const qB = cfg.questions.find((q) => q.questionText === "B1")!;

    // Soal B (scope bagian, 60s) → boleh langsung
    const okB = await rpc<any>("discover/submit", {
      sessionId: st.sessionId,
      questionId: qB.id,
      optionId: qB.opts[0].id,
    });
    expect(okB.ok, `submit B harus ok: ${JSON.stringify(okB)}`).toBe(true);

    // Soal A (scope soal, 2s) → tunggu lewat deadline, lalu submit harus ditolak
    await new Promise((r) => setTimeout(r, 2600));
    const lateA = await rpc<any>("discover/submit", {
      sessionId: st.sessionId,
      questionId: qA.id,
      optionId: qA.opts[0].id,
    });
    expect(lateA.ok).toBe(false);
    expect(lateA.error).toBe("question_timed_out");
  });
});
