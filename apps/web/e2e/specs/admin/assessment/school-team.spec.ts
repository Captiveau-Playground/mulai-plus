// E2E B2B — M4.1: kolaborasi tim sekolah (SATU role "Sekolah").
// Anggota mengundang rekan lewat email; saat rekan membuka portal, undangan
// diklaim otomatis dan ia punya hak yang sama (kelola kelas/peserta/jadwal).
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import {
  approveSchool,
  cleanupTrack,
  newTrack,
  registerSchool,
  rpcAs,
  signUpAndLogin,
  suffix,
  uniqueId,
} from "../../../helpers/b2b";
import { closeDb, q } from "../../../helpers/db";

const PREFIX = "e2e-team";
const track = newTrack();
const schoolIds = track.schoolIds;
const orgIds = track.orgIds;
const emails = track.emails;
let admin: Page;

const _rid = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Sekolah aktif + 1 kelas, atas nama admin sekolah. */
async function seedSchool(page: Page, tag: string, schoolName: string) {
  const email = `${PREFIX}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi("Admin Sekolah", email, E2E_PASSWORD);
  expect(created.ok, `signup: ${created.raw}`).toBe(true);
  emails.push(email);
  await loginUI(page, email, E2E_PASSWORD);
  const reg = await rpcAs<any>(page, "school/register", {
    name: schoolName,
    picName: "Admin Sekolah",
    picPhone: "08123456789",
    picEmail: "bk@test.local",
  });
  expect(reg.ok, `register: ${JSON.stringify(reg)}`).toBe(true);
  orgIds.push(reg.orgId);
  const appr = await adminRpc<any>(admin, "schoolAdmin/approve", { orgId: reg.orgId });
  expect(appr.ok).toBe(true);
  if (appr.schoolId) schoolIds.push(appr.schoolId);
  const kelas = await rpcAs<any>(page, "school/cohortCreate", { name: "Kelas Tim", className: "XII 1", major: "IPA" });
  expect(kelas.ok).toBe(true);
  return { orgId: reg.orgId as string, email, batchId: kelas.id as string };
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  await cleanupTrack(track);
  await admin.context().close();
  await closeDb();
});

test.describe("B2B · tim sekolah satu role (M4.1)", () => {
  test("API: undang rekan → klaim otomatis → anggota punya hak yang sama", async ({ page, browser }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const nama = `SMA Tim ${suffix()}`;
    const fx = await seedSchool(page, "api", nama);

    const rekanEmail = `${PREFIX}-rekan-${Date.now()}-${suffix().toLowerCase()}@test.local`;
    // rekan harus punya akun lebih dulu
    const created = await signUpViaApi("Rekan Sekolah", rekanEmail, E2E_PASSWORD);
    expect(created.ok, created.raw).toBe(true);
    emails.push(rekanEmail);

    // undang rekan (tanpa pilihan peran lagi — satu role sekolah)
    const inv = await rpcAs<any>(page, "school/invitePeer", { email: rekanEmail });
    expect(inv.ok, JSON.stringify(inv)).toBe(true);

    const team1 = await rpcAs<any>(page, "school/team", {});
    expect(team1.ok).toBe(true);
    expect(team1.me.canManage).toBe(true);
    expect((team1.invites ?? []).some((i: any) => i.email === rekanEmail)).toBe(true);

    // rekan membuka portal → undangan diklaim otomatis
    const ctx = await (browser as any).newContext();
    const gp = await ctx.newPage();
    await preAcceptCookies(gp);
    await loginUI(gp, rekanEmail, E2E_PASSWORD);
    const me = await rpcAs<any>(gp, "school/me", {});
    expect(me.ok).toBe(true);
    expect(me.member?.role, JSON.stringify(me)).toBe("school_admin");

    // boleh melihat data
    const list = await rpcAs<any>(gp, "school/participants", { batchId: fx.batchId });
    expect(list.ok).toBe(true);
    const insight = await rpcAs<any>(gp, "school/cohortInsight", { batchId: fx.batchId });
    expect(insight.ok).toBe(true);

    // ...dan boleh mengelola (hak sama dengan pengundang)
    const created2 = await rpcAs<any>(gp, "school/cohortCreate", { name: "Kelas Rekan", className: "XI 1" });
    expect(created2.ok, `rekan boleh membuat kelas: ${JSON.stringify(created2)}`).toBe(true);
    const added = await rpcAs<any>(gp, "school/participantAdd", {
      batchId: fx.batchId,
      name: "Siswa Dari Rekan",
      email: "rekan-siswa@sekolah.sch.id",
    });
    expect(added.ok, `rekan boleh menambah peserta: ${JSON.stringify(added)}`).toBe(true);

    // tim sekolah menampilkan 2 anggota dengan role yang sama
    const team2 = await rpcAs<any>(gp, "school/team", {});
    const roles = (team2.members ?? []).map((m: any) => m.role);
    expect(roles).toEqual(["school_admin", "school_admin"]);
    expect(team2.me.canManage).toBe(true);
    await ctx.close();
  });

  test("T16/T17: undangan duplikat & akun yang sudah punya sekolah ditolak", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const nama = `SMA Tim Dup ${suffix()}`;
    const fx = await seedSchool(page, "dup", nama);

    // undang sekali → sukses; undang lagi → sudah_diundang
    const calon = `${PREFIX}-dup-${uniqueId()}@test.local`;
    const inv1 = await rpcAs<any>(page, "school/invitePeer", { email: calon });
    expect(inv1.ok, JSON.stringify(inv1)).toBe(true);
    const inv2 = await rpcAs<any>(page, "school/invitePeer", { email: calon });
    expect(inv2.ok).toBe(false);
    expect(inv2.error).toBe("sudah_diundang");

    // email yang sudah jadi anggota → sudah_anggota
    const anggota = await q<{ email: string }>(
      `select u.email from assessment_org_members m join "user" u on u.id = m.user_id where m.org_id = $1 limit 1`,
      [fx.orgId],
    );
    const inv3 = await rpcAs<any>(page, "school/invitePeer", { email: anggota[0].email });
    expect(inv3.ok).toBe(false);
    expect(inv3.error).toBe("sudah_anggota");

    // T17: akun rekan yang SUDAH punya sekolah sendiri tidak ikut jadi anggota
    const lainEmail = `${PREFIX}-lain-${uniqueId()}@test.local`;
    const ctx = await (page.context().browser() as any).newContext();
    const otherPage = await ctx.newPage();
    await preAcceptCookies(otherPage);
    await signUpAndLogin(otherPage, track, { name: "PIC Lain", email: lainEmail, prefix: PREFIX, tag: "lain" });
    const regOther = await registerSchool(otherPage, track, { name: `SMA Lain ${suffix()}` });
    expect(regOther.ok, JSON.stringify(regOther)).toBe(true);
    await approveSchool(admin, track, regOther.orgId as string);
    await ctx.close();

    // diundang ke sekolah kami → saat membuka portal, tetap di sekolahnya sendiri
    await rpcAs<any>(page, "school/invitePeer", { email: lainEmail });
    const ctx2 = await (page.context().browser() as any).newContext();
    const p2 = await ctx2.newPage();
    await preAcceptCookies(p2);
    await loginUI(p2, lainEmail, E2E_PASSWORD);
    const me = await rpcAs<any>(p2, "school/me", {});
    expect(me.ok).toBe(true);
    expect(me.org.name, "tidak boleh pindah sekolah otomatis").not.toBe(nama);
    const team = await rpcAs<any>(p2, "school/team", {});
    expect((team.members ?? []).some((m: any) => m.email === lainEmail)).toBe(true);
    await ctx2.close();
  });

  test("UI: halaman Tim sekolah menampilkan anggota & undangan", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const nama = `SMA Tim UI ${suffix()}`;
    await seedSchool(page, "ui", nama);
    const calonEmail = `${PREFIX}-calon-${Date.now()}-${suffix().toLowerCase()}@test.local`;
    emails.push(calonEmail);

    await page.goto("/sekolah/tim", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("team-members")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("team-row")).toHaveCount(1);

    // undang rekan lewat form
    await page.getByTestId("peer-email").fill(calonEmail);
    await page.getByTestId("invite-peer").click();
    await expect(page.getByTestId("team-invites")).toContainText(calonEmail, { timeout: 20000 });

    // batalkan undangan
    await page.getByTestId("revoke-invite").first().click();
    await expect(page.getByTestId("team-invites")).toBeHidden({ timeout: 20000 });
  });
});
