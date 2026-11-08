// E2E B2B — F07: KLAIM UNDANGAN SISWA.
//
// Regresi bug 412 (24 Okt 2026): klaim memakai kode batch sambil membandingkan email
// secara case-sensitive → roster berisi huruf besar SELALU gagal (HTTP 412).
// Spec ini mengunci semua jalur klaim: kode batch (email cocok / beda kapital / tidak
// terdaftar / roster tanpa email), kode personal, kode invalid, guard sekolah nonaktif,
// guard jadwal berakhir, anti-klaim ganda, plus alur UI (auto-klaim & kode manual).
import { expect, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { preAcceptCookies } from "../../../helpers/auth";
import {
  approveSchool,
  cleanupTrack,
  newTrack,
  registerSchool,
  rpcAs,
  seedBatch,
  seedRoster,
  seedTmbSchool,
  signUpAndLogin,
  suffix,
  uniqueId,
} from "../../../helpers/b2b";
import { closeDb, q } from "../../../helpers/db";

const PREFIX = "e2e-inv";
const track = newTrack();
let admin: Awaited<ReturnType<typeof createAdminPage>>;

/** Sekolah (tmb_schools) + kelas; mengembalikan kode undangan kelas. */
async function setupClass(name: string, window?: { startHours: number; endHours: number }) {
  const schoolId = await seedTmbSchool(track, name);
  const batchId = await seedBatch(track, {
    schoolId,
    className: "XII INV",
    major: "IPA",
    ...(window ? { windowStartHours: window.startHours, windowEndHours: window.endHours } : {}),
  });
  const [row] = await q<{ invite_code: string }>("select invite_code from tmb_batches where id = $1", [batchId]);
  return { schoolId, batchId, inviteCode: row.invite_code };
}

/** Daftarkan + setujui org untuk sekolah yang sudah di-seed (jembatan by name). */
async function activateSchool(page: any, schoolName: string) {
  const reg = await registerSchool(page, track, { name: schoolName });
  expect(reg.ok, `register: ${JSON.stringify(reg)}`).toBe(true);
  const appr = await approveSchool(admin, track, reg.orgId as string);
  expect(appr.ok, `approve: ${JSON.stringify(appr)}`).toBe(true);
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

test.describe("F07 · klaim undangan siswa", () => {
  test("T01: kode batch dengan email roster BEDA KAPITAL tetap berhasil", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const fx = await setupClass(`SMA Klaim ${suffix()}`);

    // data lama / Dapodik: email roster HURUF BESAR
    const studentEmail = `${PREFIX}-kap-${uniqueId()}@test.local`;
    await seedRoster(track, fx.batchId, { name: "Siswa Kapital", email: studentEmail.toUpperCase() });
    await signUpAndLogin(page, track, { name: "Siswa", email: studentEmail, prefix: PREFIX, tag: "kap" });

    const r = await rpcAs<any>(page, "tmb/invite/claim", { code: fx.inviteCode });
    expect(r?.ok, `klaim harus sukses: ${JSON.stringify(r)}`).toBe(true);
    expect(r.studentName).toBe("Siswa Kapital");
    expect(r.via).toBe("batch");

    const [row] = await q<{ user_id: string | null; email: string }>(
      "select user_id, email from tmb_batch_students where batch_id = $1 and name = $2",
      [fx.batchId, "Siswa Kapital"],
    );
    expect(row.user_id, "akun tertaut ke roster").toBeTruthy();
    expect(row.email, "email dinormalisasi saat klaim").toBe(studentEmail);
  });

  test("T02: email akun tidak terdaftar → error terstruktur + panduan kode akses", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const fx = await setupClass(`SMA Klaim ${suffix()}`);
    await seedRoster(track, fx.batchId, { name: "Siswa Lain", email: "siswa.lain@sekolah.sch.id" });
    await signUpAndLogin(page, track, {
      name: "Siswa",
      email: `${PREFIX}-lain-${uniqueId()}@test.local`,
      prefix: PREFIX,
      tag: "lain",
    });

    const r = await rpcAs<any>(page, "tmb/invite/claim", { code: fx.inviteCode });
    expect(r.ok, "harus gagal dengan pesan jelas").toBe(false);
    expect(r.error).toBe("email_tidak_terdaftar");
    expect(r.message).toMatch(/kode akses/i);
  });

  test("T03: roster tanpa email + kode batch → arahkan minta kode akses (bukan 412 mentah)", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const fx = await setupClass(`SMA Klaim ${suffix()}`);
    await seedRoster(track, fx.batchId, { name: "Siswa Tanpa Email", email: null });
    await signUpAndLogin(page, track, {
      name: "Siswa",
      email: `${PREFIX}-nul-${uniqueId()}@test.local`,
      prefix: PREFIX,
      tag: "nul",
    });

    const r = await rpcAs<any>(page, "tmb/invite/claim", { code: fx.inviteCode });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("email_tidak_terdaftar");
  });

  test("T04: kode tidak dikenal → kode_tidak_valid (bukan 500)", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    await signUpAndLogin(page, track, {
      name: "Siswa",
      email: `${PREFIX}-b4d-${uniqueId()}@test.local`,
      prefix: PREFIX,
      tag: "b4d",
    });
    const r = await rpcAs<any>(page, "tmb/invite/claim", { code: "ZZZZZZ" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("kode_tidak_valid");
    expect(r.message).toMatch(/tidak valid/i);
  });

  test("T06: kode akses personal tetap bisa dipakai peserta BEREMAIL", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const fx = await setupClass(`SMA Klaim ${suffix()}`);
    const rosterId = await seedRoster(track, fx.batchId, {
      name: "Siswa Beremail",
      email: "siswa.beremail@sekolah.sch.id",
    });
    // guru membagikan kode akses (K4: kode tersedia untuk semua peserta)
    const code = `AKS${uniqueId().slice(-5).toUpperCase()}`;
    await q("update tmb_batch_students set claim_code = $1 where id = $2", [code, rosterId]);

    await signUpAndLogin(page, track, {
      name: "Siswa",
      email: `${PREFIX}-psn-${uniqueId()}@test.local`,
      prefix: PREFIX,
      tag: "psn",
    });
    const r = await rpcAs<any>(page, "tmb/invite/claim", { code });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(r.via).toBe("personal");
    expect(r.studentName).toBe("Siswa Beremail");
  });

  test("T11: roster sudah terikat akun lain → sudah_diklaim", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const fx = await setupClass(`SMA Klaim ${suffix()}`);
    const email = `${PREFIX}-dlm-${uniqueId()}@test.local`;
    const rosterId = await seedRoster(track, fx.batchId, { name: "Siswa Bentrok", email });
    // data tidak konsisten: baris roster sudah menunjuk akun lain
    await q("update tmb_batch_students set user_id = $1 where id = $2", ["e2e-akun-lain", rosterId]);

    await signUpAndLogin(page, track, { name: "Siswa", email, prefix: PREFIX, tag: "dlm" });
    const r = await rpcAs<any>(page, "tmb/invite/claim", { code: fx.inviteCode });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("sudah_diklaim");
  });

  test("T09: sekolah nonaktif → klaim ditolak", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const name = `SMA Nonaktif ${suffix()}`;
    const fx = await setupClass(name);
    await seedRoster(track, fx.batchId, { name: "Siswa Nonaktif", email: "siswa.nonaktif@sekolah.sch.id" });

    // PIC mendaftarkan + approval di konteks terpisah (page dipakai akun siswa)
    const ctx = await (page.context().browser() as any).newContext();
    const picPage = await ctx.newPage();
    await preAcceptCookies(picPage);
    await signUpAndLogin(picPage, track, { name: "PIC", prefix: `${PREFIX}-pic`, tag: "off" });
    const orgId = await activateSchool(picPage, name);
    await q("update assessment_orgs set status = 'nonaktif' where id = $1", [orgId]);
    await ctx.close();

    await signUpAndLogin(page, track, {
      name: "Siswa",
      email: `${PREFIX}-off-${uniqueId()}@test.local`,
      prefix: PREFIX,
      tag: "off-siswa",
    });
    void admin;
    const r = await rpcAs<any>(page, "tmb/invite/claim", { code: fx.inviteCode });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("sekolah_nonaktif");
  });

  test("T10: jadwal kelas sudah berakhir → window_ended", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const fx = await setupClass(`SMA Lewat ${suffix()}`, { startHours: -48, endHours: -24 });
    const email = `${PREFIX}-win-${uniqueId()}@test.local`;
    await seedRoster(track, fx.batchId, { name: "Siswa Lewat", email });
    await signUpAndLogin(page, track, { name: "Siswa", email, prefix: PREFIX, tag: "win" });

    const r = await rpcAs<any>(page, "tmb/invite/claim", { code: fx.inviteCode });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("window_ended");
  });

  test("T07: UI — login lalu buka link undangan → auto-klaim sukses", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const fx = await setupClass(`SMA UI ${suffix()}`);
    const email = `${PREFIX}-ui-${uniqueId()}@test.local`;
    await seedRoster(track, fx.batchId, { name: "Siswa UI", email });
    await signUpAndLogin(page, track, { name: "Siswa UI", email, prefix: PREFIX, tag: "ui" });

    await page.goto(`/assessment/invite/${fx.inviteCode}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Undangan Diterima/i)).toBeVisible({ timeout: 30000 });
  });

  test("T08: UI — klaim gagal menampilkan form kode manual, lalu sukses memakainya", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const fx = await setupClass(`SMA UI ${suffix()}`);
    const rosterId = await seedRoster(track, fx.batchId, {
      name: "Siswa Manual",
      email: "email.lain@sekolah.sch.id",
    });
    const code = `MNL${uniqueId().slice(-5).toUpperCase()}`;
    await q("update tmb_batch_students set claim_code = $1 where id = $2", [code, rosterId]);

    await signUpAndLogin(page, track, {
      name: "Siswa Manual",
      email: `${PREFIX}-man-${uniqueId()}@test.local`,
      prefix: PREFIX,
      tag: "man",
    });

    await page.goto(`/assessment/invite/${fx.inviteCode}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("claim-error")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("claim-error-msg")).toContainText(/kode akses/i);

    await page.getByTestId("claim-code-input").fill(code);
    await page.getByTestId("claim-code-submit").click();
    await expect(page.getByText(/Undangan Diterima/i)).toBeVisible({ timeout: 30000 });
  });
});
