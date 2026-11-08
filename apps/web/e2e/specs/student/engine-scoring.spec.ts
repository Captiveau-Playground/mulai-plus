// E2E USER — skoring: metode (jumlah/rata-rata/bobot), top-N, dan mode likert.
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, publish, saveQuestion } from "../../fixtures/assessment";
import { createAdminPage } from "../../helpers/admin-ui";
import { rpc } from "../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { runTag } from "../../helpers/env";

const PREFIX = "E2ESC";
const codes: string[] = [];
let admin: Page;
const studentId = () => `e2e-sc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function configOf(code: string, versionId: string) {
  return rpc<{ questions: any[] }>("discover/config", { code, versionId });
}

/** Jawab semua soal dengan opsi pertama lalu finish. */
async function runFirstOption(code: string, versionId: string) {
  const cfg = await configOf(code, versionId);
  const st = await rpc<any>("discover/start", { code, studentId: studentId(), versionId });
  for (const q of cfg.questions) {
    await rpc("discover/submit", { sessionId: st.sessionId, questionId: q.id, optionId: q.opts[0].id });
  }
  return rpc<any>("discover/finish", { sessionId: st.sessionId });
}

test.describe("Engine · skoring", () => {
  test.beforeAll(async ({ browser }) => {
    admin = await createAdminPage(browser);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  for (const [method, expected] of [
    ["sum", 12],
    ["average", 6],
    ["weighted", 24],
  ] as const) {
    test(`scoring_method ${method} → skor ${expected}`, async () => {
      test.setTimeout(180000);
      const { code } = runTag(PREFIX);
      codes.push(code);
      const { versionId } = await createAssessment(admin, { code, name: `Score ${method} ${code}` });
      const d1 = await addDimension(admin, versionId, "D1", `Dim ${method}`);
      await configUpdate(admin, versionId, {
        total_dim: 1,
        result_dim_count: 1,
        min_q_per_dim: 2,
        scoring_method: method,
      });
      for (const [i, score] of [10, 2].entries()) {
        await saveQuestion(admin, versionId, {
          dimensionId: d1,
          questionText: `S${i}`,
          questionType: "multiple_choice",
          weight: 2,
          options: [
            { optionValue: "A", label: "A", score },
            { optionValue: "B", label: "B", score: 0 },
          ],
        });
      }
      expect((await publish(admin, versionId)).ok).toBe(true);

      const fin = await runFirstOption(code, versionId);
      expect(fin.ok).toBe(true);
      expect(fin.rawScores[d1], `metode ${method}`).toBe(expected);
    });
  }

  test("result_dim_count menentukan jumlah kode teratas pada profil", async () => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(admin, { code, name: `TopN ${code}` });
    const d1 = await addDimension(admin, versionId, "AA", "Dim AA");
    const d2 = await addDimension(admin, versionId, "BB", "Dim BB");
    await configUpdate(admin, versionId, {
      total_dim: 2,
      result_dim_count: 1,
      min_q_per_dim: 1,
      scoring_method: "sum",
    });
    await saveQuestion(admin, versionId, {
      dimensionId: d1,
      questionText: "q1",
      questionType: "multiple_choice",
      options: [
        { optionValue: "A", label: "A", score: 1 },
        { optionValue: "B", label: "B", score: 0 },
      ],
    });
    await saveQuestion(admin, versionId, {
      dimensionId: d2,
      questionText: "q2",
      questionType: "multiple_choice",
      options: [
        { optionValue: "A", label: "A", score: 9 },
        { optionValue: "B", label: "B", score: 0 },
      ],
    });
    expect((await publish(admin, versionId)).ok).toBe(true);

    const fin = await runFirstOption(code, versionId);
    expect(fin.profileCode, "top-1 = BB (9 poin > 1 poin)").toBe("BB");
  });

  test("top-N = 2 mengembalikan dua kode teratas berurutan", async () => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(admin, { code, name: `TopN2 ${code}` });
    const d1 = await addDimension(admin, versionId, "AA", "Dim AA");
    const d2 = await addDimension(admin, versionId, "BB", "Dim BB");
    await configUpdate(admin, versionId, {
      total_dim: 2,
      result_dim_count: 2,
      min_q_per_dim: 1,
      scoring_method: "sum",
    });
    for (const [dim, score] of [
      [d1, 1],
      [d2, 9],
    ] as const) {
      await saveQuestion(admin, versionId, {
        dimensionId: dim,
        questionText: `q-${score}`,
        questionType: "multiple_choice",
        options: [
          { optionValue: "A", label: "A", score },
          { optionValue: "B", label: "B", score: 0 },
        ],
      });
    }
    expect((await publish(admin, versionId)).ok).toBe(true);

    const fin = await runFirstOption(code, versionId);
    expect(fin.profileCode).toBe("BB-AA");
  });

  test("scoring_mode likert memakai poin linier (skor manual diabaikan)", async () => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(admin, { code, name: `LikertScore ${code}` });
    const d1 = await addDimension(admin, versionId, "D1", "Dim");
    await configUpdate(admin, versionId, {
      total_dim: 1,
      result_dim_count: 1,
      min_q_per_dim: 1,
      scoring_mode: "likert",
    });
    await saveQuestion(admin, versionId, {
      dimensionId: d1,
      questionText: "q",
      questionType: "likert",
      options: [
        { optionValue: "A", label: "1", score: 100 },
        { optionValue: "B", label: "2", score: 100 },
        { optionValue: "C", label: "3", score: 100 },
      ],
    });
    expect((await publish(admin, versionId)).ok).toBe(true);

    const fin = await runFirstOption(code, versionId);
    expect(fin.rawScores[d1], "opsi pertama = 1 poin linier").toBe(1);
  });
});
