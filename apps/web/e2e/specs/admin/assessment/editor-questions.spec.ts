// E2E ADMIN — semua tipe soal di panel editor: pilihan ganda, skala (likert), isian (free text),
// preset, mode tampilan, dan notasi LaTeX.
import { expect, test } from "@playwright/test";
import { contentOf, createAssessment } from "../../../fixtures/assessment";
import { addDimensionUI, addQuestionUI, loginAdmin, openEditor } from "../../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EQ";
const codes: string[] = [];

async function setup(page: import("@playwright/test").Page, label: string, dims = 1) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `${label} ${code}` });
  await openEditor(page, code);
  for (let i = 0; i < dims; i++) await addDimensionUI(page, `D${i + 1}`, `Dimensi ${i + 1}`);
  return { code, versionId };
}

test.describe("Admin · Editor — tipe soal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("soal pilihan ganda: opsi + bobot manual tersimpan", async ({ page }) => {
    test.setTimeout(120000);
    const { versionId } = await setup(page, "MC");
    await addQuestionUI(page, {
      text: "Kamu lebih suka bekerja dengan…",
      options: ["Data dan eksperimen", "Ide kreatif"],
      scores: [3, 0],
    });

    await expect(page.getByText("Kamu lebih suka bekerja dengan…")).toBeVisible();
    await expect(page.getByText(/2 pilihan/).first()).toBeVisible();
    // guard: tidak ada atribut yang bocor menjadi teks di UI
    await expect(page.locator("#aturan")).not.toContainText("data-testid");

    const c = await contentOf(page, versionId);
    expect(c.questions).toHaveLength(1);
    expect(c.questions[0]?.questionType).toBe("multiple_choice");
    const opts = c.options.filter((o) => o.questionId === c.questions[0]?.id);
    expect(opts).toHaveLength(2);
    expect(opts[0]?.label).toBe("Data dan eksperimen");
    expect(opts[0]?.score).toBe(3);
  });

  test("soal skala (likert): preset angka 1–5 mengisi 5 titik skala", async ({ page }) => {
    test.setTimeout(120000);
    const { versionId } = await setup(page, "Likert");
    await addQuestionUI(page, { text: "Seberapa nyaman bekerja dalam tim?", type: "likert", preset: "likert" });

    const c = await contentOf(page, versionId);
    const q = c.questions.find((x) => x.questionType === "likert");
    expect(q, "soal likert tersimpan").toBeTruthy();
    const opts = c.options.filter((o) => o.questionId === q?.id);
    expect(opts).toHaveLength(5);
    expect(opts.map((o) => o.score)).toEqual([1, 2, 3, 4, 5]);
    expect(opts.map((o) => o.label)).toEqual(["1", "2", "3", "4", "5"]);
  });

  test("soal skala (likert): preset emoticon mengisi ikon + label skala", async ({ page }) => {
    test.setTimeout(120000);
    const { versionId } = await setup(page, "Emoji");
    await addQuestionUI(page, { text: "Bagaimana perasaanmu hari ini?", type: "likert", preset: "emoji" });

    const c = await contentOf(page, versionId);
    const q = c.questions[0]!;
    const opts = c.options.filter((o) => o.questionId === q.id);
    expect(opts.map((o) => o.icon)).toEqual(["😡", "🙁", "😐", "🙂", "😍"]);
    expect(opts.map((o) => o.imageCaption)).toEqual([
      "Sangat tidak suka",
      "Tidak suka",
      "Netral",
      "Suka",
      "Sangat suka",
    ]);
  });

  test("soal isian (free text): kunci + toleransi numerik tersimpan", async ({ page }) => {
    test.setTimeout(120000);
    const { versionId } = await setup(page, "Text");
    await addQuestionUI(page, {
      text: "Hasil dari 3/4 adalah…",
      type: "text_input",
      evalType: "numeric_tolerance",
      answerKey: "0.75",
      tolerance: "0.02",
    });
    await expect(page.getByText(/Isian \(numeric_tolerance\)/).first()).toBeVisible();

    const c = await contentOf(page, versionId);
    const tc = c.textConfigs.find((t) => t.questionId === c.questions[0]?.id);
    expect(tc, "text config tersimpan").toBeTruthy();
    expect(tc?.answerKey).toBe("0.75");
    expect(tc?.evaluationType).toBe("numeric_tolerance");
    expect(tc?.numericTolerance).toBe("0.02");
  });

  test("soal isian: semua mode evaluasi bisa dipilih dari UI", async ({ page }) => {
    test.setTimeout(180000);
    const { versionId } = await setup(page, "Eval");
    const cases = [
      { evalType: "exact_match" as const, key: "jakarta" },
      { evalType: "keyword_match" as const, key: "jakarta|bandung" },
      { evalType: "pattern_match" as const, key: "^[0-9]{3}$" },
    ];
    for (const { evalType, key } of cases) {
      await addQuestionUI(page, { text: `Isian ${evalType}`, type: "text_input", evalType, answerKey: key });
    }

    const c = await contentOf(page, versionId);
    expect(c.questions).toHaveLength(3);
    const byQ = (t: string) =>
      c.textConfigs.find((x) => x.questionId === c.questions.find((q) => q.questionText === `Isian ${t}`)?.id);
    expect(byQ("exact_match")?.evaluationType).toBe("exact_match");
    expect(byQ("keyword_match")?.answerKey).toBe("jakarta|bandung");
    expect(byQ("pattern_match")?.answerKey).toBe("^[0-9]{3}$");
  });

  test("mode tampilan opsi menambah kontrol ikon/gambar sesuai pilihan", async ({ page }) => {
    test.setTimeout(120000);
    await setup(page, "Presentasi");
    await page.locator('[data-testid="q-add"]').click();
    await expect(page.locator('[data-testid="q-text"]')).toBeVisible({ timeout: 15000 });

    await page.locator('[data-testid="q-presentation"]').selectOption("emoji_option");
    await expect(page.locator('#q-panel input[placeholder="😀"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /gambar jawaban/i }).first()).toBeVisible();

    await page.locator('[data-testid="q-presentation"]').selectOption("visual_comparison");
    await expect(page.getByText(/Gambar JAWABAN/).first()).toBeVisible();

    await page.locator('[data-testid="q-presentation"]').selectOption("standard_option_card");
    await expect(page.locator('#q-panel input[placeholder="😀"]')).toHaveCount(0);
  });

  test("soal berisi rumus menampilkan pratinjau LaTeX", async ({ page }) => {
    test.setTimeout(120000);
    await setup(page, "Latex");
    await page.locator('[data-testid="q-add"]').click();
    await expect(page.locator('[data-testid="q-text"]')).toBeVisible({ timeout: 15000 });

    await page.locator('[data-testid="q-text"]').fill("Hitung $\\frac{3}{4} + \\frac{1}{4}$");
    await page.getByLabel(/Soal berisi rumus matematika/).check();
    await expect(page.getByText("Pratinjau LaTeX").first()).toBeVisible({ timeout: 10000 });
  });
});
