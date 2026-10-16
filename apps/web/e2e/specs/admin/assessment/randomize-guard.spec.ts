// E2E ADMIN — guard "Acak urutan pilihan" × soal skala (likert).
//
// Mengacak opsi soal skala akan merusak makna skalanya (mis. 😡→😍 atau 1–5).
// Karena itu: server tidak mengacak opsi likert, gate memberi peringatan, dan panel
// admin menonaktifkan/memperingatkan setting-nya.
import { expect, type Page, test } from "@playwright/test";
import {
  addDimension,
  configUpdate,
  createAssessment,
  publish,
  saveQuestion,
  validate,
} from "../../../fixtures/assessment";
import { createAdminPage, loginAdmin, openEditor, openGroup } from "../../../helpers/admin-ui";
import { rpc } from "../../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2ERZ";
const codes: string[] = [];
let admin: Page;
const studentId = () => `e2e-rz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Tes campuran: 4 pilihan ganda + 5 soal skala, 1 dimensi. */
async function buildMixed(name: string) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(admin, { code, name: `${name} ${code}` });
  const d1 = await addDimension(admin, versionId, "D1", "Dimensi Satu");
  await configUpdate(admin, versionId, { total_dim: 1, result_dim_count: 1, min_q_per_dim: 1, randomize_a: true });
  for (let i = 0; i < 4; i++) {
    await saveQuestion(admin, versionId, {
      dimensionId: d1,
      questionText: `MC ${i + 1}`,
      questionType: "multiple_choice",
      options: [
        { optionValue: "A", label: "Opsi A", score: 1 },
        { optionValue: "B", label: "Opsi B", score: 0 },
        { optionValue: "C", label: "Opsi C", score: 0 },
        { optionValue: "D", label: "Opsi D", score: 0 },
      ],
    });
  }
  for (let i = 0; i < 5; i++) {
    await saveQuestion(admin, versionId, {
      dimensionId: d1,
      questionText: `SKALA ${i + 1}`,
      questionType: "likert",
      options: [1, 2, 3, 4, 5].map((v) => ({ optionValue: "ABCDE"[v - 1], label: String(v), score: v })),
    });
  }
  expect((await publish(admin, versionId)).ok, "fixture harus bisa dirilis").toBe(true);
  return { code, versionId, d1 };
}

async function configOf(code: string, versionId: string) {
  return rpc<{ questions: any[] }>("discover/config", { code, versionId });
}

test.describe("Admin · Acak opsi × soal skala", () => {
  test.beforeAll(async ({ browser }) => {
    admin = await createAdminPage(browser);
  });

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("SERVER: opsi soal skala tidak diacak, opsi pilihan ganda tetap diacak", async () => {
    test.setTimeout(180000);
    const fx = await buildMixed("RZ Mixed");
    const cfg = await configOf(fx.code, fx.versionId);
    const likertIds = cfg.questions.filter((q) => q.questionType === "likert").map((q) => q.id as string);
    const mcIds = cfg.questions.filter((q) => q.questionType === "multiple_choice").map((q) => q.id as string);

    const st = await rpc<any>("discover/start", { code: fx.code, studentId: studentId(), versionId: fx.versionId });
    expect(st.optionOrder, "randomize_a aktif → ada optionOrder").toBeTruthy();
    const shuffled = Object.keys(st.optionOrder);
    expect(
      shuffled.filter((id) => likertIds.includes(id)),
      "soal skala TIDAK boleh ikut diacak",
    ).toEqual([]);
    expect(
      shuffled.some((id) => mcIds.includes(id)),
      "soal pilihan ganda harus ikut diacak",
    ).toBe(true);
    // urutan opsi skala tetap 1..5
    expect(st.optionOrder[likertIds[0]!]).toBeUndefined();
  });

  test("SERVER: urutan opsi soal skala di engine tetap sesuai (1..5)", async () => {
    test.setTimeout(180000);
    const fx = await buildMixed("RZ Order");
    const cfg = await configOf(fx.code, fx.versionId);
    const likert = cfg.questions.find((q) => q.questionType === "likert")!;
    expect(likert.opts.map((o: any) => o.label)).toEqual(["1", "2", "3", "4", "5"]);
    expect(likert.opts.map((o: any) => o.score)).toEqual([1, 2, 3, 4, 5]);
  });

  test("GATE: memberi peringatan 'acak opsi' saat ada soal skala (tidak memblok rilis)", async () => {
    test.setTimeout(180000);
    const fx = await buildMixed("RZ Gate");
    const gate = await validate(admin, fx.versionId);
    expect(gate.ok, "peringatan tidak memblok rilis").toBe(true);
    expect(gate.warnings.join(" ")).toMatch(/Acak urutan pilihan.*soal skala/i);
  });

  test("UI: switch 'Acak urutan pilihan' nonaktif + ada catatan saat versi punya soal skala", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildMixed("RZ UI Off");
    // pastikan setting off → switch harus disabled
    await configUpdate(admin, fx.versionId, { randomize_a: false });
    await openEditor(page, fx.code);
    await openGroup(page, "pengalaman");

    const sw = page.locator('[data-testid="rule-randomize_a"]');
    await expect(sw).toHaveAttribute("aria-disabled", "true", { timeout: 15000 });
    await expect(page.locator('[data-testid="note-randomize_a"]')).toContainText(/soal skala/i);
  });

  test("UI: saat setting menyala, muncul peringatan + tombol 'Matikan acak opsi' & checklist merah", async ({
    page,
  }) => {
    test.setTimeout(180000);
    const fx = await buildMixed("RZ UI On");
    await configUpdate(admin, fx.versionId, { randomize_a: true });
    await openEditor(page, fx.code);

    // checklist item khusus gagal
    await expect(page.locator('[data-testid="validation-checklist"]')).toContainText(/Acak opsi aman/i);

    await openGroup(page, "pengalaman");
    const note = page.locator('[data-testid="note-randomize_a"]');
    await expect(note).toContainText(/soal skala/i, { timeout: 15000 });

    // tombol perbaikan mematikan setting
    await page.locator('[data-testid="fix-randomize_a"]').click();
    const cfg = await rpc<{ config: any }>("discover/config", { code: fx.code, versionId: fx.versionId });
    await expect
      .poll(
        async () => (await rpc<any>("discover/config", { code: fx.code, versionId: fx.versionId })).config.randomize_a,
        { timeout: 15000 },
      )
      .toBe(false);
    void cfg;
  });

  test("GATE: 'acak soal' + pembagian bagian juga diberi peringatan", async () => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(admin, { code, name: `RZ Section ${code}` });
    const d1 = await addDimension(admin, versionId, "D1", "Dim");
    await configUpdate(admin, versionId, {
      total_dim: 1,
      result_dim_count: 1,
      min_q_per_dim: 1,
      randomize_q: true,
      section_mode: "by_dimension",
    });
    await saveQuestion(admin, versionId, {
      dimensionId: d1,
      questionText: "q",
      questionType: "multiple_choice",
      options: [
        { optionValue: "A", label: "A", score: 1 },
        { optionValue: "B", label: "B", score: 0 },
      ],
    });
    expect((await publish(admin, versionId)).ok).toBe(true);

    const gate = await validate(admin, versionId);
    expect(gate.warnings.join(" ")).toMatch(/Acak urutan soal.*pembagian bagian/i);
  });
});
