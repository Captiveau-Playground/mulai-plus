// E2E ADMIN — "Ekspor" soal: file .xlsx yang dihasilkan harus
//   1) berisi kolom kontrak import + kolom lanjutan,
//   2) memuat semua soal versi yang sedang dibuka,
//   3) bisa diimpor ulang (round-trip) ke versi lain tanpa kehilangan soal.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";
import { createAssessment } from "../../../fixtures/assessment";
import { loginAdmin, openEditor, questionCount } from "../../../helpers/admin-ui";
import { deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const TEMPLATES = resolve(process.cwd(), "../../packages/db/templates/assessment");
const BASE_HEADER = [
  "Teks",
  "Dimensi",
  "Tipe",
  "Opsi A",
  "Opsi B",
  "Opsi C",
  "Opsi D",
  "Opsi E",
  "Opsi F",
  "Kunci",
  "Bobot",
  "Kunci Isian",
  "Cara nilai",
  "Toleransi",
  "Tampilan",
];
const EXTRA_HEADER = ["Kode", "Durasi", "Aktif", "Media URL", "Media Tipe", "Media Caption"];

const codes: string[] = [];
let dir = "";

test.beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "hf-export-"));
});
test.afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

test.describe("Admin · Ekspor soal (.xlsx)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    for (const code of codes.splice(0)) await deleteAssessmentByCode(page, code).catch(() => {});
  });

  test("ekspor versi aktif: kolom kontrak + kolom lanjutan, dan bisa diimpor ulang", async ({ page }) => {
    const { code } = runTag("E2EX");
    codes.push(code);
    await createAssessment(page, { code, name: `Ekspor ${code}` });
    await openEditor(page, code);

    // 1) isi 120 soal dari template resmi
    await page.locator('[data-testid="q-import"]').click();
    await page.locator('input[type="file"]').setInputFiles(resolve(TEMPLATES, "talent-items.xlsx"));
    await expect(page.getByText(/120 baris terbaca/)).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: /Impor 120 soal/ }).click();
    await expect(page.getByText(/120 soal berhasil ditambahkan/)).toBeVisible({ timeout: 120000 });
    await page.getByRole("button", { name: "Tutup", exact: true }).click();
    await page.waitForTimeout(2000);
    expect(await questionCount(page)).toBe(120);

    // 2) ekspor
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60000 }),
      page.locator('[data-testid="q-export"]').click(),
    ]);
    const file = join(dir, "hasil-ekspor.xlsx");
    await download.saveAs(file);
    expect(download.suggestedFilename()).toMatch(/^[a-z0-9-]+-v\d+-soal\.xlsx$/);
    expect(readFileSync(file).byteLength).toBeGreaterThan(5000);

    // 3) isi file
    const wb = XLSX.read(readFileSync(file));
    expect(wb.SheetNames).toEqual(["Soal", "Konfigurasi", "Petunjuk"]);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets.Soal as any, { header: 1 }) as any[][];
    const header = rows[0] as string[];
    expect(header.slice(0, BASE_HEADER.length)).toEqual(BASE_HEADER);
    expect(header.slice(BASE_HEADER.length, BASE_HEADER.length + EXTRA_HEADER.length)).toEqual(EXTRA_HEADER);
    expect(rows.length - 1).toBe(120);
    const first = rows[1] as any[];
    expect(String(first[0]).length).toBeGreaterThan(3);
    expect(["pilihan ganda", "isian (mengetik)", "skala (likert)"]).toContain(String(first[2]));
    expect(["persis", "angka", "kata", "pola", ""]).toContain(String(first[13]));
    expect(["standar", "emoji", "gambar", "banding", ""]).toContain(String(first[14]));
    expect(["ya", "tidak"]).toContain(String(first[header.indexOf("Aktif")]));

    // 4) round-trip: impor file hasil ekspor ke versi tes lain
    const { code: code2 } = runTag("E2EY");
    codes.push(code2);
    await createAssessment(page, { code: code2, name: `Roundtrip ${code2}` });
    await openEditor(page, code2);
    await page.locator('[data-testid="q-import"]').click();
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(page.getByText(/120 baris terbaca/)).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: /Impor 120 soal/ }).click();
    await expect(page.getByText(/120 soal berhasil ditambahkan/)).toBeVisible({ timeout: 120000 });
    await page.getByRole("button", { name: "Tutup", exact: true }).click();
    await page.waitForTimeout(2000);
    expect(await questionCount(page)).toBe(120);

    // dan ekspor ulang tetap 120 baris (tidak menggandakan/kehilangan)
    const [download2] = await Promise.all([
      page.waitForEvent("download", { timeout: 60000 }),
      page.locator('[data-testid="q-export"]').click(),
    ]);
    const file2 = join(dir, "hasil-ekspor-2.xlsx");
    await download2.saveAs(file2);
    const wb2 = XLSX.read(readFileSync(file2));
    const rows2 = XLSX.utils.sheet_to_json(wb2.Sheets.Soal as any, { header: 1 }) as any[][];
    expect(rows2.length - 1).toBe(120);
  });
});
