// E2E ADMIN — konten pendukung: pengantar (sections), instruksi per dimensi, dan import CSV.
import { expect, test } from "@playwright/test";
import { contentOf, createAssessment } from "../../../fixtures/assessment";
import { addDimensionUI, loginAdmin, openEditor, openGroup } from "../../../helpers/admin-ui";
import { rpc } from "../../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EC";
const codes: string[] = [];

async function setup(page: import("@playwright/test").Page, label: string, dims = 1) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `${label} ${code}` });
  await openEditor(page, code);
  for (let i = 0; i < dims; i++) await addDimensionUI(page, `D${i + 1}`, `Dimensi ${i + 1}`);
  return { code, versionId };
}

test.describe("Admin · Editor — konten & import", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("tambah pengantar, ubah judul & isi, lalu terhapus", async ({ page }) => {
    test.setTimeout(180000);
    const { code, versionId } = await setup(page, "Pengantar");
    await openGroup(page, "konten");

    await page.locator('[data-testid="section-add"]').click();
    await expect(page.locator('[data-testid="section-row-0"]')).toBeVisible({ timeout: 20000 });
    await page.locator('[data-testid="section-title-0"]').fill("Sebelum mulai");
    await page.locator('[data-testid="section-content-0"]').fill("Tes ini mengukur minatmu.");

    await expect
      .poll(
        async () => {
          const cfg = await rpc<{ sections: any[] }>("discover/config", { code, versionId });
          return cfg.sections?.[0]?.title;
        },
        { timeout: 25000 },
      )
      .toBe("Sebelum mulai");

    // hapus
    await page.locator('[data-testid="section-delete-0"]').click();
    await expect
      .poll(
        async () => {
          const cfg = await rpc<{ sections: any[] }>("discover/config", { code, versionId });
          return (cfg.sections ?? []).length;
        },
        { timeout: 25000 },
      )
      .toBe(0);
  });

  test("instruksi per dimensi tersimpan", async ({ page }) => {
    test.setTimeout(180000);
    const { code, versionId } = await setup(page, "Instruksi", 2);
    await openGroup(page, "konten");

    await page.locator('[data-testid="instr-0"]').fill("Bagian Dimensi 1");
    await expect
      .poll(
        async () => {
          const cfg = await rpc<{ instructions: any[] }>("discover/config", { code, versionId });
          return cfg.instructions?.find((i) => i.dimensionId)?.header;
        },
        { timeout: 25000 },
      )
      .toBe("Bagian Dimensi 1");
  });

  test("import CSV: baris terbaca, dimensi baru dibuat otomatis, soal ditambahkan", async ({ page }) => {
    test.setTimeout(180000);
    const { versionId } = await setup(page, "Import");
    const csv = [
      "Teks,Dimensi,Tipe,Opsi A,Opsi B,Opsi C,Kunci,Bobot,Kunci Isian,Cara nilai,Toleransi",
      "Soal impor pilihan,IMPD,pilihan,Kucing,Anjing,,A,1,,,",
      "Hitung 1/2,IMPD,isian,,,,B,1,0.5,angka,0.01",
    ].join("\n");

    await page.locator('[data-testid="q-import"]').click();
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "soal.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByText(/2 baris terbaca/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/dibuat otomatis/)).toBeVisible();

    await page.getByRole("button", { name: /Impor 2 soal/i }).click();
    await expect(page.getByText(/2 soal berhasil ditambahkan/)).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "Tutup", exact: true }).click();
    await page.waitForTimeout(2500);

    const c = await contentOf(page, versionId);
    expect(c.questions).toHaveLength(2);
    expect(c.questions.map((q) => q.questionType).sort()).toEqual(["multiple_choice", "text_input"]);
    expect(c.dimensions.map((d) => d.code)).toContain("IMPD");
  });

  test("import CSV dengan dimensi yang sudah ada tidak menduplikasi dimensi", async ({ page }) => {
    test.setTimeout(180000);
    const { versionId } = await setup(page, "ImportDup");
    const csv = [
      "Teks,Dimensi,Tipe,Opsi A,Opsi B,Kunci,Bobot,Kunci Isian,Cara nilai,Toleransi",
      "Soal A,D1,pilihan,Pil A,Pil B,A,1,,,",
      "Soal B,D1,pilihan,Pil C,Pil D,B,1,,,",
    ].join("\n");

    await page.locator('[data-testid="q-import"]').click();
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "dup.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByText(/2 baris terbaca/)).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Impor 2 soal/i }).click();
    await expect(page.getByText(/2 soal berhasil ditambahkan/)).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "Tutup", exact: true }).click();
    await page.waitForTimeout(2500);

    const c = await contentOf(page, versionId);
    expect(c.dimensions).toHaveLength(1);
    expect(c.questions).toHaveLength(2);
  });
});
