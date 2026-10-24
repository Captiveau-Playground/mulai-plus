// E2E B2B — M2.6: kode akses sekali pakai untuk peserta TANPA email.
// Guru membagikan kode personal; siswa mendaftar dengan email apa pun lalu kode
// tersebut mengaitkan akunnya ke roster (dan hasil tesnya nanti ikut tertaut).
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { closeDb, q } from "../../../helpers/db";
import { API_URL } from "../../../helpers/env";

const PREFIX = "e2e-claim";
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

/** Kelas dengan 2 peserta: satu tanpa email, satu dengan email. */
async function seedClass(name: string) {
  const schoolId = rid();
  const batchId = rid();
  const tanpaEmail = rid();
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
    [rid(), batchId],
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

test.describe("B2B · kode akses peserta tanpa email (M2.6)", () => {
  test("API: kode dibuat otomatis, teks undangan memuat kode & link personal", async ({ page }) => {
    test.setTimeout(240000);
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

    // peserta beremail tidak perlu kode
    const beremail = (list.items ?? []).find((x: any) => x.name === "Siswa Beremail");
    expect(beremail.claimCode).toBeNull();

    // teks undangan personal memuat kode + link memakai kode
    const inv = await rpcAs<any>(page, "school/invite", { batchId: fx.batchId, participantId: fx.tanpaEmail });
    expect(inv.ok).toBe(true);
    expect(inv.claimCode).toBe(tanpa.claimCode);
    expect(inv.waText).toContain(tanpa.claimCode);
    expect(inv.link).toContain(`/assessment/invite/${tanpa.claimCode}`);
  });

  test("UI+API: siswa tanpa email memakai kode → akun tertaut, kode tidak bisa dipakai ulang", async ({ page }) => {
    test.setTimeout(240000);
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
