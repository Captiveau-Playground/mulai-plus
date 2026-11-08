// E2E B2B — M2.6: kode akses sekali pakai untuk peserta TANPA email.
// Guru membagikan kode personal; siswa mendaftar dengan email apa pun lalu kode
// tersebut mengaitkan akunnya ke roster (dan hasil tesnya nanti ikut tertaut).
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { cleanupTrack, newTrack, rpcAs, suffix, uniqueId } from "../../../helpers/b2b";
import { closeDb, q } from "../../../helpers/db";

const PREFIX = "e2e-claim";
const track = newTrack();
const orgIds = track.orgIds;
const schoolIds = track.schoolIds;
const emails = track.emails;
let admin: Page;

/** Kelas dengan 2 peserta: satu tanpa email, satu dengan email. */
async function seedClass(name: string) {
  const schoolId = uniqueId();
  const batchId = uniqueId();
  const tanpaEmail = uniqueId();
  schoolIds.push(schoolId);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [schoolId, name]);
  await q(
    "insert into tmb_batches (id, school_id, name, class_name, major, invite_code) values ($1,$2,'XII TKJ 1','XII TKJ 1','TKJ',$3)",
    [batchId, schoolId, `E2E${suffix()}`],
  );
  await q(
    "insert into tmb_batch_students (id, batch_id, name, nis, status) values ($1,$2,'Siswa Tanpa Email','99901','invited')",
    [tanpaEmail, batchId],
  );
  await q(
    "insert into tmb_batch_students (id, batch_id, name, email, status) values ($1,$2,'Siswa Beremail','ada@test.local','invited')",
    [uniqueId(), batchId],
  );
  return { schoolId, batchId, tanpaEmail };
}

async function approveSchool(page: Page, tag: string, schoolName: string) {
  const email = `${PREFIX}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi("PIC Claim", email, E2E_PASSWORD);
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
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  await cleanupTrack(track);
  await admin.context().close();
  await closeDb();
});

test.describe("B2B · kode akses peserta tanpa email (M2.6)", () => {
  test("API: kode dibuat otomatis, teks undangan memuat kode & link personal", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const nama = `SMA Klaim ${suffix()}`;
    const fx = await seedClass(nama);
    await approveSchool(page, "api", nama);

    const list = await rpcAs<any>(page, "school/participants", { batchId: fx.batchId });
    expect(list.ok).toBe(true);
    const tanpa = (list.items ?? []).find((x: any) => x.name === "Siswa Tanpa Email");
    expect(tanpa, "peserta tanpa email ada").toBeTruthy();
    expect(tanpa.claimCode, "kode akses dibuat otomatis").toMatch(/^[A-Z2-9]{6}$/);
    expect(tanpa.claimCodeUsed).toBe(false);

    // (K4) peserta beremail JUGA punya kode akses sebagai cadangan bila emailnya beda
    const beremail = (list.items ?? []).find((x: any) => x.name === "Siswa Beremail");
    expect(beremail.claimCode, "peserta beremail tetap dapat kode cadangan").toMatch(/^[A-Z2-9]{6}$/);

    // link personal tetap tersedia untuk peserta beremail (dipakai bila emailnya salah)
    const invEmail = await rpcAs<any>(page, "school/invite", { batchId: fx.batchId, participantId: beremail.id });
    expect(invEmail.ok).toBe(true);
    expect(invEmail.claimCode).toBe(beremail.claimCode);

    // teks undangan personal memuat kode + link memakai kode
    const inv = await rpcAs<any>(page, "school/invite", { batchId: fx.batchId, participantId: fx.tanpaEmail });
    expect(inv.ok).toBe(true);
    expect(inv.claimCode).toBe(tanpa.claimCode);
    expect(inv.waText).toContain(tanpa.claimCode);
    expect(inv.link).toContain(`/assessment/invite/${tanpa.claimCode}`);
  });

  test("UI+API: siswa tanpa email memakai kode → akun tertaut, kode tidak bisa dipakai ulang", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const nama = `SMA Klaim UI ${suffix()}`;
    const fx = await seedClass(nama);
    await approveSchool(page, "ui", nama);

    // guru melihat kode di tabel peserta
    await page.goto(`/sekolah/kelas/${fx.batchId}`, { waitUntil: "domcontentloaded" });
    const badge = page.getByTestId("claim-code").first();
    await expect(badge).toBeVisible({ timeout: 30000 });
    const code = (await badge.textContent())?.trim() ?? "";
    expect(code).toMatch(/^[A-Z2-9]{6}$/);

    // siswa 1 mendaftar dengan email apa pun lalu klaim kode
    // (pakai konteks terpisah: sesi guru masih aktif di `page`)
    const siswaEmail = `${PREFIX}-siswa-${Date.now()}-${suffix().toLowerCase()}@test.local`;
    const created = await signUpViaApi("Siswa Klaim", siswaEmail, E2E_PASSWORD);
    expect(created.ok, created.raw).toBe(true);
    emails.push(siswaEmail);
    const ctx1 = await (page.context().browser() as any).newContext();
    const page1 = await ctx1.newPage();
    await preAcceptCookies(page1);
    await loginUI(page1, siswaEmail, E2E_PASSWORD);

    const claim = await rpcAs<any>(page1, "tmb/invite/claim", { code });
    expect(claim?.studentName, JSON.stringify(claim)).toBe("Siswa Tanpa Email");

    // roster sudah tertaut ke akun siswa
    const bound = await q("select user_id, claim_code_used_at from tmb_batch_students where id = $1", [fx.tanpaEmail]);
    expect(bound[0]?.user_id, "userId tertaut").toBeTruthy();
    expect(bound[0]?.claim_code_used_at, "waktu pakai tercatat").toBeTruthy();

    // klaim ULANG oleh akun yang sama → tetap sukses & tidak mengganti pemilik
    const claimAgain = await rpcAs<any>(page1, "tmb/invite/claim", { code });
    expect(claimAgain?.studentName, "klaim ulang akun sendiri harus idempoten").toBe("Siswa Tanpa Email");
    const boundAgain = await q("select user_id from tmb_batch_students where id = $1", [fx.tanpaEmail]);
    expect(boundAgain[0]?.user_id).toBe(bound[0]?.user_id);

    // kode yang sama dipakai akun lain → ditolak (pakai konteks terpisah karena
    // halaman login me-redirect akun yang sudah masuk)
    const lainEmail = `${PREFIX}-lain-${Date.now()}-${suffix().toLowerCase()}@test.local`;
    const created2 = await signUpViaApi("Siswa Lain", lainEmail, E2E_PASSWORD);
    expect(created2.ok, created2.raw).toBe(true);
    emails.push(lainEmail);
    const ctx2 = await (page.context().browser() as any).newContext();
    const page2 = await ctx2.newPage();
    await preAcceptCookies(page2);
    await loginUI(page2, lainEmail, E2E_PASSWORD);
    const claim2 = await rpcAs<any>(page2, "tmb/invite/claim", { code });
    expect(claim2?.studentName ?? null, "kode sudah terpakai → harus ditolak").toBeNull();
    await ctx2.close();
    await ctx1.close();
  });
});
