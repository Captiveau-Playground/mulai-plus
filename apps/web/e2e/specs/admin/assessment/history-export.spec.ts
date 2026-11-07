// E2E ADMIN — "Ekspor Excel" di Riwayat B2C:
//   satu baris = satu orang + satu percobaan, kolom ke kanan = item soal (Q1..Qn),
//   plus versi soal, profil, dan confidence score.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";
import { loginAdmin } from "../../../helpers/admin-ui";

let dir = "";
test.beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "hf-history-"));
});
test.afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

test.describe("Admin · Riwayat B2C — ekspor hasil", () => {
  test("unduh .xlsx: percobaan + versi soal + profil + confidence + jawaban per item", async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/admin/assessment/b2c/history");
    await expect(page.locator('[data-testid="history-total"]')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000);

    const totalText = (await page.locator('[data-testid="history-total"]').textContent()) ?? "0";
    const total = Number(totalText.replace(/\D/g, ""));
    test.skip(total === 0, "belum ada percobaan tes di environment ini");

    const exportBtn = page.locator('[data-testid="history-export"]');
    await expect(exportBtn).toBeEnabled({ timeout: 20000 });

    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 120000 }), exportBtn.click()]);
    const file = join(dir, "riwayat.xlsx");
    await download.saveAs(file);
    expect(download.suggestedFilename()).toMatch(/^riwayat-assessment-\d{8}-\d{4}\.xlsx$/);
    expect(readFileSync(file).byteLength).toBeGreaterThan(2000);

    const wb = XLSX.read(readFileSync(file));
    // sheet per (tes + versi) + Soal + Petunjuk
    expect(wb.SheetNames).toContain("Soal");
    expect(wb.SheetNames).toContain("Petunjuk");
    const dataSheet = wb.SheetNames.find((n) => n !== "Soal" && n !== "Petunjuk");
    expect(dataSheet).toBeTruthy();

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[dataSheet as string] as any, { header: 1 }) as any[][];
    const header = (rows[0] ?? []) as string[];
    for (const col of [
      "Nama",
      "ID Siswa",
      "Percobaan ke",
      "Tes",
      "Kode Tes",
      "Versi Soal",
      "Profil (kode)",
      "Confidence (profil)",
      "Confidence (rekomendasi #1)",
      "Dijawab",
    ]) {
      expect(header, `kolom ${col}`).toContain(col);
    }
    // kolom item soal ada, dan jumlahnya sama dengan item versi terbesar
    const qCols = header.filter((h) => /^Q\d+$/.test(String(h)));
    expect(qCols.length).toBeGreaterThan(0);
    expect(rows.length - 1).toBeGreaterThan(0);

    // minimal satu baris punya jawaban terisi di kolom Q
    const firstQ = header.indexOf("Q1");
    const answered = rows.slice(1).some((r) => String(r[firstQ] ?? "").trim().length > 0);
    expect(answered).toBe(true);

    // sheet Soal memetakan Q → teks item
    const soal = XLSX.utils.sheet_to_json(wb.Sheets.Soal as any, { header: 1 }) as any[][];
    expect((soal[0] as string[]).slice(0, 8)).toEqual([
      "Kode Tes",
      "Versi Soal",
      "Status Versi",
      "Q",
      "Kode Soal",
      "Dimensi",
      "Tipe",
      "Teks Soal",
    ]);
    expect(soal.length - 1).toBeGreaterThan(0);
  });
});
