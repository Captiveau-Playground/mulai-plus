// E2E B2B — M4.1: kolaborasi tim sekolah (guru BK `school_viewer`).
// Admin sekolah mengundang rekan lewat email; saat rekan membuka portal, undangan
// diklaim otomatis, perannya jadi `school_viewer`, dan hanya bisa MELIHAT.
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { closeDb, q } from "../../../helpers/db";
import { API_URL } from "../../../helpers/env";

const PREFIX = "e2e-team";
const orgIds: string[] = [];
const emails: string[] = [];
let admin: Page;

const _rid = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const suffix = () => Math.random().toString(36).slice(2, 6).toUpperCase();

async function rpcAs<T = any>(page: Page, path: string, json: unknown = {}): Promise<T> {
  return page.evaluate(
    async (arg: { base: string; path: string; json: unknown }) => {
      const res = await fetch(`${arg.base}/rpc/${arg.path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ json: arg.json }),
      });
      const body = (await res.json()) as { json?: unknown };
      return body?.json ?? null;
    },
    { base: API_URL, path, json },
  ) as Promise<T>;
}

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
  const kelas = await rpcAs<any>(page, "school/cohortCreate", { name: "Kelas Tim", className: "XII 1", major: "IPA" });
  expect(kelas.ok).toBe(true);
  return { orgId: reg.orgId as string, email, batchId: kelas.id as string };
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  for (const id of orgIds) await q("delete from assessment_orgs where id = $1", [id]).catch(() => undefined);
  if (emails.length) await q('delete from "user" where email = any($1)', [emails]).catch(() => undefined);
  await closeDb();
  await admin.context().close();
});

test.describe("B2B · tim sekolah & guru BK (M4.1)", () => {
  test("API: undang rekan → klaim otomatis → peran viewer hanya bisa melihat", async ({ page, browser }) => {
    test.setTimeout(300000);
    await preAcceptCookies(page);
    const nama = `SMA Tim ${suffix()}`;
    const fx = await seedSchool(page, "api", nama);

    const guruEmail = `${PREFIX}-guru-${Date.now()}-${suffix().toLowerCase()}@test.local`;
    // rekan harus punya akun lebih dulu
    const created = await signUpViaApi("Guru BK", guruEmail, E2E_PASSWORD);
    expect(created.ok, created.raw).toBe(true);
    emails.push(guruEmail);

    // admin mengundang sebagai viewer
    const inv = await rpcAs<any>(page, "school/invitePeer", { email: guruEmail, role: "school_viewer" });
    expect(inv.ok, JSON.stringify(inv)).toBe(true);

    const team1 = await rpcAs<any>(page, "school/team", {});
    expect(team1.ok).toBe(true);
    expect(team1.me.canManage).toBe(true);
    expect((team1.invites ?? []).some((i: any) => i.email === guruEmail)).toBe(true);

    // guru membuka portal → undangan diklaim otomatis
    const ctx = await (browser as any).newContext();
    const gp = await ctx.newPage();
    await preAcceptCookies(gp);
    await loginUI(gp, guruEmail, E2E_PASSWORD);
    const me = await rpcAs<any>(gp, "school/me", {});
    expect(me.ok).toBe(true);
    expect(me.member?.role, JSON.stringify(me)).toBe("school_viewer");

    // viewer boleh melihat data
    const list = await rpcAs<any>(gp, "school/participants", { batchId: fx.batchId });
    expect(list.ok).toBe(true);
    const insight = await rpcAs<any>(gp, "school/cohortInsight", { batchId: fx.batchId });
    expect(insight.ok).toBe(true);

    // viewer TIDAK boleh mengubah (buat kelas / import / jadwal)
    const denied = await rpcAs<any>(gp, "school/cohortCreate", { name: "Kelas Baru", className: "XI 1" });
    expect(denied.ok).toBe(false);
    expect(denied.error).toBe("hanya_admin");
    const deniedJadwal = await rpcAs<any>(gp, "school/cohortSchedule", {
      batchId: fx.batchId,
      mode: "scheduled",
      windowStart: new Date(Date.now() + 86400000).toISOString(),
      windowEnd: new Date(Date.now() + 172800000).toISOString(),
    });
    expect(deniedJadwal.ok).toBe(false);

    // tim sekolah menampilkan 2 anggota dengan peran berbeda
    const team2 = await rpcAs<any>(gp, "school/team", {});
    const roles = (team2.members ?? []).map((m: any) => m.role).sort();
    expect(roles).toEqual(["school_admin", "school_viewer"]);
    await ctx.close();
  });

  test("UI: halaman Tim sekolah menampilkan anggota & undangan", async ({ page }) => {
    test.setTimeout(300000);
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
