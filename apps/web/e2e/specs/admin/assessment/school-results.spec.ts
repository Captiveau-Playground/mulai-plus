// E2E B2B — M2.5: hasil per peserta + export rekap kelas (dibatasi ke sekolahnya).

import { expect, type Page, test } from "@playwright/test";
import * as XLSX from "xlsx";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { cleanupTrack, newTrack, rpcAs, suffix, uniqueId } from "../../../helpers/b2b";
import { closeDb, q } from "../../../helpers/db";

const PREFIX = "e2e-hsl";
const track = newTrack();
const orgIds = track.orgIds;
const schoolIds = track.schoolIds;
const resultIds = track.resultIds;
const emails = track.emails;
let admin: Page;

/** Sekolah + kelas + 1 peserta yang sudah punya hasil & rekomendasi. */
async function seedWithResult(name: string) {
  const schoolId = uniqueId();
  const batchId = uniqueId();
  const rosterId = uniqueId();
  const resultId = uniqueId();
  schoolIds.push(schoolId);
  resultIds.push(resultId);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [schoolId, name]);
  await q(
    "insert into tmb_batches (id, school_id, name, class_name, major, invite_code) values ($1,$2,'XII IPA 1','XII IPA 1','IPA',$3)",
    [batchId, schoolId, `E2E${suffix()}`],
  );
  await q(
    `insert into tmb_assessment_results (id, user_id, holland_code, holland_scores, ability_scores, confidence_score, differentiation)
     values ($1,$2,'RIA','{"R":5,"I":3,"A":2,"S":1,"E":0,"C":0}'::jsonb,
             '{"levels":{"verbal":"high"},"scores":{"verbal":{"correct":3,"total":4},"numerical":{"correct":2,"total":4}}}'::jsonb,
             '78','moderate')`,
    [resultId, `e2e-hsl-siswa-${suffix()}`],
  );
  await q(
    "insert into tmb_recommendations (id, result_id, type, rank, item_name, confidence) values ($1,$2,'major',1,'Teknik Informatika','88')",
    [uniqueId(), resultId],
  );
  await q(
    "insert into tmb_recommendations (id, result_id, type, rank, item_name, confidence) values ($1,$2,'major',2,'Sistem Informasi','80')",
    [uniqueId(), resultId],
  );
  await q(
    "insert into tmb_recommendations (id, result_id, type, rank, item_name) values ($1,$2,'career',3,'Data Analyst')",
    [uniqueId(), resultId],
  );
  await q(
    "insert into tmb_batch_students (id, batch_id, name, email, nis, status, result_id) values ($1,$2,'Siswa Berhasil','siswa@test.local','12345','completed',$3)",
    [rosterId, batchId, resultId],
  );
  return { schoolId, batchId, rosterId, resultId };
}

async function registerAndApprove(page: Page, tag: string, schoolName: string) {
  const email = `${PREFIX}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi("PIC Hasil", email, E2E_PASSWORD);
  expect(created.ok, `signup: ${created.raw}`).toBe(true);
  emails.push(email);
  await loginUI(page, email, E2E_PASSWORD);
  const reg = await rpcAs<any>(page, "school/register", {
    name: schoolName,
    picName: "Budi BK",
    picPhone: "08123456789",
    picEmail: "bk@test.local",
  });
  expect(reg.ok, `register: ${JSON.stringify(reg)}`).toBe(true);
  orgIds.push(reg.orgId);
  const appr = await adminRpc<any>(admin, "schoolAdmin/approve", { orgId: reg.orgId });
  expect(appr.ok).toBe(true);
  if (appr.schoolId) schoolIds.push(appr.schoolId);
  return reg.orgId as string;
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  await cleanupTrack(track);
  await admin.context().close();
  await closeDb();
});

test.describe("B2B · hasil peserta & export rekap (M2.5)", () => {
  test("API: hasil peserta (Holland, kemampuan, rekomendasi) + export rekap terbatas sekolah", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const namaA = `SMA Hasil A ${suffix()}`;
    const namaB = `SMA Hasil B ${suffix()}`;
    const a = await seedWithResult(namaA);
    const b = await seedWithResult(namaB);
    await registerAndApprove(page, "a", namaA);

    // hasil peserta
    const r = await rpcAs<any>(page, "school/participantResult", { batchId: a.batchId, participantId: a.rosterId });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(r.result.hollandCode).toBe("RIA");
    expect(r.result.hollandScores.R).toBe(5);
    expect(r.result.confidenceScore).toBe("78");
    expect(r.majors.length).toBe(2);
    expect(r.majors[0].name).toBe("Teknik Informatika");
    expect(r.careers.length).toBe(1);

    // isolasi: peserta sekolah lain tidak bisa dibuka
    const other = await rpcAs<any>(page, "school/participantResult", {
      batchId: b.batchId,
      participantId: b.rosterId,
    });
    expect(other.ok).toBe(false);
    expect(other.error).toBe("not_found");

    // export rekap: hanya kelas sendiri, memuat skor dimensi
    const rekap = await rpcAs<any>(page, "school/exportRekap", { batchId: a.batchId });
    expect(rekap.ok).toBe(true);
    const row = (rekap.rows ?? []).find((x: any) => x.nama === "Siswa Berhasil");
    expect(row, "baris rekap peserta").toBeTruthy();
    expect(row.hollandCode).toBe("RIA");
    expect(row.verbal).toBe("3/4");
    expect(row.numerical).toBe("2/4");

    const forbidden = await rpcAs<any>(page, "school/exportRekap", { batchId: b.batchId });
    expect(forbidden.ok).toBe(false);
    expect(forbidden.error).toBe("not_found");
  });

  test("UI: klik peserta menampilkan hasil & tombol export berfungsi", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const nama = `SMA Hasil UI ${suffix()}`;
    const fx = await seedWithResult(nama);
    await registerAndApprove(page, "ui", nama);

    await page.goto(`/sekolah/kelas/${fx.batchId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("participant-row")).toHaveCount(1, { timeout: 30000 });
    await page.getByTestId("participant-row").first().click();

    const dlg = page.getByTestId("result-dialog");
    await expect(dlg).toBeVisible({ timeout: 20000 });
    await expect(dlg).toContainText(/Holland: RIA/i);
    await expect(dlg).toContainText(/Kemampuan per dimensi/i);
    await expect(dlg).toContainText(/Teknik Informatika/i);

    // tutup dialog dulu (overlay modal menutupi tombol export)
    await page.keyboard.press("Escape");
    await expect(dlg).toBeHidden({ timeout: 15000 });

    // export rekap → file terunduh
    const dl = page.waitForEvent("download", { timeout: 25000 }).catch(() => null);
    await page.getByTestId("export-rekap").click();
    const file = await dl;
    expect(file, "file rekap harus terunduh").toBeTruthy();
    expect(file?.suggestedFilename() ?? "").toMatch(/\.xlsx$/);

    // isi file: baris peserta + kolom dimensi & Holland (bukan hanya nama file)
    const path = await file?.path();
    expect(path, "file unduhan harus tersedia di disk").toBeTruthy();
    const wb = XLSX.readFile(path as string);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const siswa = rows.find((r) => String(r.nama ?? "") === "Siswa Berhasil");
    expect(siswa, "rekap harus memuat peserta kelas").toBeTruthy();
    expect(String(siswa?.hollandCode)).toBe("RIA");
    expect(String(siswa?.verbal)).toBe("3/4");
    expect(String(siswa?.numerical)).toBe("2/4");
  });
});
