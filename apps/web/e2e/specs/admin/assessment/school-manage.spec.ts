// E2E B2B — M2.2: sekolah bisa MEMBUAT kelas, IMPORT peserta, dan membagikan undangan.
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { closeDb, q } from "../../../helpers/db";
import { API_URL } from "../../../helpers/env";

const PREFIX = "e2e-mng";
const orgIds: string[] = [];
const schoolIds: string[] = [];
const emails: string[] = [];
let admin: Page;

const rid = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

/** Sekolah aktif + org disetujui (tanpa kelas — kelas dibuat lewat API/UI di test). */
async function setupSchool(page: Page, tag: string) {
  const name = `SMA Kelola ${suffix()}`;
  const schoolId = rid();
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
  return { name, schoolId };
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  for (const id of orgIds) await q("delete from assessment_orgs where id = $1", [id]).catch(() => undefined);
  for (const id of schoolIds) await q("delete from tmb_schools where id = $1", [id]).catch(() => undefined);
  if (emails.length) await q('delete from "user" where email = any($1)', [emails]).catch(() => undefined);
  await closeDb();
  await admin.context().close();
});

test.describe("B2B · kelola kelas & peserta (M2.2)", () => {
  test("buat kelas → import CSV (duplikat dilewati) → undangan siap bagikan", async ({ page }) => {
    test.setTimeout(240000);
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
    expect(inv.ok).toBe(true);
    expect(inv.code).toBe(created.inviteCode);
    expect(inv.link).toContain(`/assessment/invite/${created.inviteCode}`);
    expect(inv.waText).toContain("XII IPA 2");
  });

  test("UI: buat kelas dari dashboard → import dari dialog → kartu undangan tampil", async ({ page }) => {
    test.setTimeout(240000);
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
