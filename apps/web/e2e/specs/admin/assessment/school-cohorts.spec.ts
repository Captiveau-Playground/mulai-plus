// E2E B2B — M2.1: halaman "Kelas & Peserta" di dashboard sekolah.
//   · sekolah hanya melihat kelas & peserta MILIKNYA (isolasi)
//   · ringkasan progres (selesai / mengerjakan / belum)
//   · detail kelas: tabel peserta + Holland code + pencarian
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { closeDb, q } from "../../../helpers/db";
import { API_URL } from "../../../helpers/env";

const PREFIX = "e2e-kls";
const orgIds: string[] = [];
const schoolIds: string[] = [];
const resultIds: string[] = [];
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

/** Sekolah legacy + 1 kelas + peserta (status & hasil diatur). */
async function seedSchool(name: string, students: { name: string; status: string; holland?: string }[]) {
  const schoolId = rid();
  const batchId = rid();
  schoolIds.push(schoolId);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [schoolId, name]);
  await q(
    "insert into tmb_batches (id, school_id, name, class_name, major, invite_code) values ($1,$2,'XII IPA 1','XII IPA 1','IPA',$3)",
    [batchId, schoolId, `E2E${suffix()}`],
  );
  for (const s of students) {
    let resultId: string | null = null;
    if (s.holland) {
      resultId = rid();
      resultIds.push(resultId);
      await q("insert into tmb_assessment_results (id, user_id, holland_code) values ($1,$2,$3)", [
        resultId,
        `e2e-kls-siswa-${suffix()}`,
        s.holland,
      ]);
    }
    await q("insert into tmb_batch_students (id, batch_id, name, status, result_id) values ($1,$2,$3,$4,$5)", [
      rid(),
      batchId,
      s.name,
      s.status,
      resultId,
    ]);
  }
  return { schoolId, batchId };
}

async function registerAndApprove(page: Page, tag: string, schoolName: string) {
  const email = `${PREFIX}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi("PIC Sekolah", email, E2E_PASSWORD);
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
  return { email, orgId: reg.orgId as string };
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  for (const id of orgIds) await q("delete from assessment_orgs where id = $1", [id]).catch(() => undefined);
  if (schoolIds.length) {
    await q("delete from tmb_batches where school_id = any($1)", [schoolIds]).catch(() => undefined);
  }
  for (const id of schoolIds) await q("delete from tmb_schools where id = $1", [id]).catch(() => undefined);
  if (resultIds.length)
    await q("delete from tmb_assessment_results where id = any($1)", [resultIds]).catch(() => undefined);
  if (emails.length) await q('delete from "user" where email = any($1)', [emails]).catch(() => undefined);
  await closeDb();
  await admin.context().close();
});

test.describe("B2B · Kelas & Peserta (M2.1)", () => {
  test("sekolah melihat kelas & ringkasan progresnya saja", async ({ page }) => {
    test.setTimeout(240000);
    await preAcceptCookies(page);
    const namaA = `SMA Kelas A ${suffix()}`;
    const namaB = `SMA Kelas B ${suffix()}`;
    const a = await seedSchool(namaA, [
      { name: "Siswa Selesai", status: "completed", holland: "RIA" },
      { name: "Siswa Jalan", status: "in_progress" },
      { name: "Siswa Belum", status: "invited" },
    ]);
    const b = await seedSchool(namaB, [{ name: "Siswa B", status: "invited" }]);

    await registerAndApprove(page, "a", namaA);

    const cohorts = await rpcAs<any>(page, "school/cohorts");
    expect(cohorts.ok).toBe(true);
    expect(cohorts.items.length, "hanya 1 kelas milik sekolah A").toBe(1);
    const c = cohorts.items[0];
    expect(c.id).toBe(a.batchId);
    expect(c.total).toBe(3);
    expect(c.selesai).toBe(1);
    expect(c.mulai).toBe(1);
    expect(c.belum).toBe(1);
    expect(c.progress).toBe(33);

    // detail peserta: hanya kelas A
    const detail = await rpcAs<any>(page, "school/participants", { batchId: a.batchId });
    expect(detail.ok).toBe(true);
    expect(detail.items.length).toBe(3);
    const selesai = detail.items.find((x: any) => x.name === "Siswa Selesai");
    expect(selesai.status).toBe("completed");
    expect(selesai.hollandCode).toBe("RIA");

    // isolasi: kelas sekolah B tidak bisa dibuka
    const forbidden = await rpcAs<any>(page, "school/participants", { batchId: b.batchId });
    expect(forbidden.ok).toBe(false);
    expect(forbidden.error).toBe("not_found");

    // UI: daftar kelas → detail + pencarian
    await page.goto("/sekolah/kelas", { waitUntil: "domcontentloaded" });
    const row = page.locator('[data-testid="cohort-row"]').filter({ hasText: "XII IPA 1" });
    await expect(row).toBeVisible({ timeout: 30000 });
    await expect(row).toContainText("1/3 selesai");
    await row.click();
    await expect(page.getByTestId("cohort-detail")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("participant-row")).toHaveCount(3);
    await expect(page.locator("body")).toContainText("Siswa Selesai");
    await expect(page.locator("body")).toContainText("RIA");
    // pencarian
    await page.getByTestId("participant-search").fill("Siswa Jalan");
    await expect(page.getByTestId("participant-row")).toHaveCount(1);
  });
});
