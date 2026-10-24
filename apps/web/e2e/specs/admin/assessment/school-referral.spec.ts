// E2E B2B — M4.3: referral antar sekolah (kode rujukan + pencatatan sekolah asal).
import { expect, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { closeDb, q } from "../../../helpers/db";
import { API_URL } from "../../../helpers/env";

const PREFIX = "e2e-ref";
const orgIds: string[] = [];
const emails: string[] = [];

const suffix = () => Math.random().toString(36).slice(2, 6).toUpperCase();

async function rpcAs<T = any>(page: any, path: string, json: unknown = {}): Promise<T> {
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

async function daftar(page: any, tag: string, name: string, ref?: string) {
  const email = `${PREFIX}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi(`PIC ${tag}`, email, E2E_PASSWORD);
  expect(created.ok, created.raw).toBe(true);
  emails.push(email);
  await loginUI(page, email, E2E_PASSWORD);
  const reg = await rpcAs<any>(page, "school/register", {
    name,
    picName: "PIC Rujukan",
    picPhone: "08123456789",
    picEmail: "bk@test.local",
    ...(ref ? { ref } : {}),
  });
  expect(reg.ok, JSON.stringify(reg)).toBe(true);
  orgIds.push(reg.orgId);
  return reg.orgId as string;
}

test.afterAll(async () => {
  for (const id of orgIds) await q("delete from assessment_orgs where id = $1", [id]).catch(() => undefined);
  if (emails.length) await q('delete from "user" where email = any($1)', [emails]).catch(() => undefined);
  await closeDb();
});

test.describe("B2B · referral antar sekolah (M4.3)", () => {
  test("API + UI: kode rujukan, sekolah baru tercatat, kartu referral tampil", async ({ page, browser }) => {
    test.setTimeout(300000);
    const admin = await createAdminPage(browser);
    await preAcceptCookies(page);

    // sekolah A → disetujui → punya kode rujukan
    const namaA = `SMA Rujukan ${suffix()}`;
    const orgA = await daftar(page, "a", namaA);
    expect((await adminRpc<any>(admin, "schoolAdmin/approve", { orgId: orgA })).ok).toBe(true);
    const refA = await rpcAs<any>(page, "school/referral", {});
    expect(refA.ok, JSON.stringify(refA)).toBe(true);
    expect(refA.code).toMatch(/^SCH-[A-Z2-9]{6}$/);
    expect(refA.link).toContain(`ref=${refA.code}`);
    expect(refA.total).toBe(0);

    // sekolah B mendaftar dengan kode rujukan A (akun baru, konteks baru)
    const ctx = await (browser as any).newContext();
    const pb = await ctx.newPage();
    await preAcceptCookies(pb);
    const namaB = `SMA Dirujuk ${suffix()}`;
    const orgB = await daftar(pb, "b", namaB, refA.code);

    // A melihat B sebagai rujukannya
    const refA2 = await rpcAs<any>(page, "school/referral", {});
    expect(refA2.total).toBe(1);
    expect(refA2.referred[0].name).toBe(namaB);

    // B mencatat asal rujukan
    const rows = await q("select referred_by_org_id from assessment_orgs where id = $1", [orgB]);
    expect(rows[0]?.referred_by_org_id).toBe(orgA);

    // kode tidak valid → tidak menautkan apa pun
    const ctx2 = await (browser as any).newContext();
    const pc = await ctx2.newPage();
    await preAcceptCookies(pc);
    const orgC = await daftar(pc, "c", `SMA Tanpa Rujukan ${suffix()}`, "SCH-TIDAKADA");
    const rowsC = await q("select referred_by_org_id from assessment_orgs where id = $1", [orgC]);
    expect(rowsC[0]?.referred_by_org_id).toBeNull();

    // UI: kartu referral di dashboard sekolah A menampilkan kode & jumlah
    await page.goto("/sekolah", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("referral-code")).toHaveText(refA.code, { timeout: 30000 });
    await expect(page.getByTestId("referral-count")).toContainText("1");

    await ctx.close();
    await ctx2.close();
    await admin.context().close();
  });
});
