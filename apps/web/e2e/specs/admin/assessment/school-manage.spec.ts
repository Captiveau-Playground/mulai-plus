// E2E B2B — M2.2: sekolah bisa MEMBUAT kelas, IMPORT peserta, dan membagikan undangan.
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { cleanupTrack, newTrack, rpcAs, suffix, uniqueId } from "../../../helpers/b2b";
import { closeDb, q } from "../../../helpers/db";

const PREFIX = "e2e-mng";
const track = newTrack();
const orgIds = track.orgIds;
const schoolIds = track.schoolIds;
const emails = track.emails;
let admin: Page;

/** Sekolah aktif + org disetujui (tanpa kelas — kelas dibuat lewat API/UI di test). */
async function setupSchool(page: Page, tag: string) {
  const name = `SMA Kelola ${suffix()}`;
  const schoolId = uniqueId();
  schoolIds.push(schoolId);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [schoolId, name]);
  const email = `${PREFIX}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi("PIC Kelola", email, E2E_PASSWORD);
  expect(created.ok, `signup: ${created.raw}`).toBe(true);
  emails.push(email);
  await loginUI(page, email, E2E_PASSWORD);
  const reg = await rpcAs<any>(page, "school/register", {
    name,
    picName: "Budi BK",
    picPhone: "08123456789",
    picEmail: "bk@test.local",
  });
  expect(reg.ok, `register: ${JSON.stringify(reg)}`).toBe(true);
  orgIds.push(reg.orgId);
  const appr = await adminRpc<any>(admin, "schoolAdmin/approve", { orgId: reg.orgId });
  expect(appr.ok).toBe(true);
  if (appr.schoolId) schoolIds.push(appr.schoolId);
  return { name, schoolId };
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  await cleanupTrack(track);
  await admin.context().close();
  await closeDb();
});

test.describe("B2B · kelola kelas & peserta (M2.2)", () => {
  test("buat kelas → import CSV (duplikat dilewati) → undangan siap bagikan", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    await setupSchool(page, "api");

    // 1) buat kelas
    const created = await rpcAs<any>(page, "school/cohortCreate", {
      name: "XII IPA 2",
      className: "XII",
      major: "IPA",
    });
    expect(created.ok, `cohortCreate: ${JSON.stringify(created)}`).toBe(true);
    expect(created.inviteCode, "kode undangan otomatis").toMatch(/^[A-Z0-9]{6}$/);

    const cohorts = await rpcAs<any>(page, "school/cohorts");
    expect(cohorts.items.some((c: any) => c.id === created.id)).toBe(true);

    // 2) import CSV: 3 valid, 1 duplikat email di file, 1 tanpa nama
    const csv = [
      "nama,email,nis",
      "Budi Santoso,budi@sekolah.sch.id,1001",
      "Siti Aminah,siti@sekolah.sch.id,1002",
      "Agus Salim,agus@sekolah.sch.id,1003",
      "Budi Duplikat,budi@sekolah.sch.id,9999",
      ",tanpa-nama@sekolah.sch.id,1004",
    ].join("\n");
    const imp = await rpcAs<any>(page, "school/participantsImport", { batchId: created.id, csv });
    expect(imp.ok).toBe(true);
    expect(imp.imported).toBe(3);
    expect(imp.skipped).toBe(1);
    expect(imp.failed.length).toBe(1);

    const detail = await rpcAs<any>(page, "school/participants", { batchId: created.id });
    expect(detail.items.length).toBe(3);
    expect(detail.items.map((p: any) => p.name)).toContain("Agus Salim");

    // 3) import ulang → semua dilewati
    const again = await rpcAs<any>(page, "school/participantsImport", { batchId: created.id, csv });
    expect(again.imported).toBe(0);
    // 3 peserta lama + 1 baris duplikat di file = 4 dilewati; 1 baris tanpa nama tetap gagal
    expect(again.skipped).toBe(4);
    expect(again.failed.length).toBe(1);

    // 4) tambah satu peserta + duplikat ditolak
    const one = await rpcAs<any>(page, "school/participantAdd", {
      batchId: created.id,
      name: "Dewi Lestari",
      email: "dewi@sekolah.sch.id",
    });
    expect(one.ok).toBe(true);
    const dup = await rpcAs<any>(page, "school/participantAdd", {
      batchId: created.id,
      name: "Dewi Lagi",
      email: "dewi@sekolah.sch.id",
    });
    expect(dup.ok).toBe(false);
    expect(dup.error).toBe("peserta_sudah_ada");

    // 5) undangan: kode + link + teks WA
    const inv = await rpcAs<any>(page, "school/invite", { batchId: created.id });
    // (regresi) link undangan WAJIB mengarah ke WEB (3001), bukan ke API (3000)
    expect(inv.link, "link undangan harus ke web, bukan backend").toContain("/assessment/invite/");
    expect(inv.link).not.toContain(":3000");
    expect(inv.link).toMatch(/:3001\//);
    expect(inv.ok).toBe(true);
    expect(inv.code).toBe(created.inviteCode);
    expect(inv.link).toContain(`/assessment/invite/${created.inviteCode}`);
    expect(inv.waText).toContain("XII IPA 2");
  });

  test("edge: email tidak valid, batas 500 baris, dan peserta ganda ditolak", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    await setupSchool(page, "edge");

    const created = await rpcAs<any>(page, "school/cohortCreate", { name: "XII EDGE", className: "XII", major: "IPA" });
    expect(created.ok, `cohortCreate: ${JSON.stringify(created)}`).toBe(true);
    const batchId = created.id as string;

    // (a) email tidak valid → tercatat di `failed`, bukan menggagalkan seluruh import
    const csvInvalid = ["nama,email,nis", "Siswa Valid,valid@sekolah.sch.id,2001", "Siswa Rusak,bukan-email,2002"].join(
      "\n",
    );
    const imp1 = await rpcAs<any>(page, "school/participantsImport", { batchId, csv: csvInvalid });
    expect(imp1.ok, JSON.stringify(imp1)).toBe(true);
    expect(imp1.imported).toBe(1);
    expect((imp1.failed ?? []).length, "baris email invalid harus dilaporkan").toBe(1);
    expect(String(imp1.failed[0].reason)).toMatch(/email/i);

    // (b) import ulang email yang sudah ada di kelas → dilewati (bukan dobel)
    const csvDup = ["nama,email,nis", "Siswa Valid Lagi,valid@sekolah.sch.id,2003"].join("\n");
    const imp2 = await rpcAs<any>(page, "school/participantsImport", { batchId, csv: csvDup });
    expect(imp2.ok).toBe(true);
    expect(imp2.imported).toBe(0);
    expect(imp2.skipped).toBe(1);

    // (c) batas 500 baris per import
    const rows = ["nama,email,nis"];
    for (let i = 0; i < 501; i++) rows.push(`Siswa ${i},siswa${i}@sekolah.sch.id,${3000 + i}`);
    const imp3 = await rpcAs<any>(page, "school/participantsImport", { batchId, csv: rows.join("\n") });
    expect(imp3.ok, "lebih dari 500 baris harus ditolak").toBe(false);
    expect(imp3.error).toBe("terlalu_banyak_baris");

    // (d) tambah manual: sukses sekali, ditolak saat email sama
    const add1 = await rpcAs<any>(page, "school/participantAdd", {
      batchId,
      name: "Siswa Manual",
      email: "manual@sekolah.sch.id",
    });
    expect(add1.ok, JSON.stringify(add1)).toBe(true);
    const add2 = await rpcAs<any>(page, "school/participantAdd", {
      batchId,
      name: "Siswa Manual Dobel",
      email: "manual@sekolah.sch.id",
    });
    expect(add2.ok).toBe(false);
    expect(add2.error).toBe("peserta_sudah_ada");

    // jumlah akhir: 1 dari CSV + 1 manual
    const list = await rpcAs<any>(page, "school/participants", { batchId });
    expect(list.ok).toBe(true);
    expect(list.items.length).toBe(2);

    // (e) normalisasi email: campuran huruf besar → tersimpan huruf kecil
    const addMixed = await rpcAs<any>(page, "school/participantAdd", {
      batchId,
      name: "Siswa Kapital",
      email: "Siswa.Kapital@Sekolah.SCH.ID",
    });
    expect(addMixed.ok, JSON.stringify(addMixed)).toBe(true);
    const csvMixed = ["nama,email", "Siswa Import,Import.Kapital@Sekolah.SCH.ID"].join("\n");
    await rpcAs<any>(page, "school/participantsImport", { batchId, csv: csvMixed });
    const norm = await q<{ email: string }>(
      "select email from tmb_batch_students where batch_id = $1 and email is not null order by email",
      [batchId],
    );
    for (const row of norm) {
      expect(row.email, "email roster harus huruf kecil").toBe(row.email.toLowerCase());
    }

    // (f) peserta tanpa email otomatis dapat kode akses
    const add3 = await rpcAs<any>(page, "school/participantAdd", { batchId, name: "Siswa Tanpa Email" });
    expect(add3.ok).toBe(true);
    const list2 = await rpcAs<any>(page, "school/participants", { batchId });
    const noEmail = (list2.items ?? []).find((x: any) => x.name === "Siswa Tanpa Email");
    expect(noEmail?.claimCode, "kode akses dibuat otomatis untuk peserta tanpa email").toMatch(/^[A-Z2-9]{6}$/);
  });

  test("UI: buat kelas dari dashboard → import dari dialog → kartu undangan tampil", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    await setupSchool(page, "ui");

    await page.goto("/sekolah/kelas", { waitUntil: "domcontentloaded" });
    await page.getByTestId("cohort-create-open").click();
    await page.getByTestId("cohort-name").fill("XI TKJ 1");
    await page.getByTestId("cohort-class").fill("XI");
    await page.getByTestId("cohort-major").fill("TKJ");
    await page.getByTestId("cohort-create-submit").click();

    const row = page.locator('[data-testid="cohort-row"]').filter({ hasText: "XI TKJ 1" });
    await expect(row).toBeVisible({ timeout: 30000 });
    await row.click();

    await expect(page.getByTestId("cohort-detail")).toBeVisible({ timeout: 30000 });
    await page.getByTestId("participant-import-open").click();
    await page
      .getByTestId("import-csv")
      .fill("nama,email,nis\nRina Wati,rina@sekolah.sch.id,2001\nJoko Susilo,joko@sekolah.sch.id,2002\n");
    await page.getByTestId("import-submit").click();
    await expect(page.getByTestId("import-result")).toContainText(/2 ditambahkan/, { timeout: 20000 });

    await expect(page.getByTestId("participant-row")).toHaveCount(2);
    await expect(page.getByTestId("invite-card")).toBeVisible();
    await expect(page.getByTestId("invite-code")).not.toHaveText("—");
  });
});
