// E2E B2B — M2.4: monitoring peserta (filter status) + tombol "Ingatkan" (teks WA
// yang dipersonalisasi per siswa, disalin ke clipboard).
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { cleanupTrack, newTrack, rpcAs, suffix, uniqueId } from "../../../helpers/b2b";
import { closeDb, q } from "../../../helpers/db";

const PREFIX = "e2e-mon";
const track = newTrack();
const orgIds = track.orgIds;
const schoolIds = track.schoolIds;
const emails = track.emails;
let admin: Page;

/** Kelas dengan 3 peserta: 1 belum mulai, 1 mengerjakan, 1 selesai. */
async function seedClass(name: string) {
  const schoolId = uniqueId();
  const batchId = uniqueId();
  schoolIds.push(schoolId);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [schoolId, name]);
  await q(
    "insert into tmb_batches (id, school_id, name, class_name, major, invite_code) values ($1,$2,'XII IPS 2','XII IPS 2','IPS',$3)",
    [batchId, schoolId, `E2E${suffix()}`],
  );
  const roster: Record<string, string> = {};
  for (const [nm, status] of [
    ["Siswa Belum", "invited"],
    ["Siswa Jalan", "in_progress"],
    ["Siswa Selesai", "completed"],
  ] as const) {
    const id = uniqueId();
    roster[status] = id;
    await q("insert into tmb_batch_students (id, batch_id, name, email, status) values ($1,$2,$3,$4,$5)", [
      id,
      batchId,
      nm,
      `${id}@test.local`,
      status,
    ]);
  }
  return { schoolId, batchId, roster };
}

async function approveSchool(page: Page, tag: string, schoolName: string) {
  const email = `${PREFIX}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi("PIC Monitoring", email, E2E_PASSWORD);
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

test.describe("B2B · monitoring & ingatkan (M2.4)", () => {
  test("API: undangan personal per peserta + isolasi", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const nama = `SMA Monitor ${suffix()}`;
    const fx = await seedClass(nama);
    const other = await seedClass(`SMA Lain ${suffix()}`);
    await approveSchool(page, "api", nama);

    const inv = await rpcAs<any>(page, "school/invite", {
      batchId: fx.batchId,
      participantId: fx.roster.invited,
    });
    expect(inv.ok, JSON.stringify(inv)).toBe(true);
    expect(inv.studentName).toBe("Siswa Belum");
    expect(inv.waText).toContain("Halo Siswa Belum!");
    expect(inv.link).toContain("/assessment/invite/");

    // peserta dari kelas lain tidak bisa diundang lewat batch ini
    const bad = await rpcAs<any>(page, "school/invite", {
      batchId: fx.batchId,
      participantId: other.roster.invited,
    });
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe("not_found");
  });

  test("UI: filter status menyaring peserta & tombol Ingatkan menyalin teks", async ({ page, context }) => {
    test.setTimeout(90000);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await preAcceptCookies(page);
    const nama = `SMA Monitor UI ${suffix()}`;
    const fx = await seedClass(nama);
    await approveSchool(page, "ui", nama);

    await page.goto(`/sekolah/kelas/${fx.batchId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("participant-row")).toHaveCount(3, { timeout: 30000 });

    // filter status
    await page.getByTestId("filter-invited").click();
    await expect(page.getByTestId("participant-row")).toHaveCount(1);
    await expect(page.getByTestId("participant-row").first()).toContainText("Siswa Belum");
    await page.getByTestId("filter-completed").click();
    await expect(page.getByTestId("participant-row")).toHaveCount(1);
    await expect(page.getByTestId("participant-row").first()).toContainText("Siswa Selesai");
    await page.getByTestId("filter-all").click();
    await expect(page.getByTestId("participant-row")).toHaveCount(3);

    // "Ingatkan" hanya untuk peserta yang belum selesai
    await expect(page.getByTestId("nudge-button")).toHaveCount(2);
    await page.getByTestId("nudge-button").first().click();
    await expect(page.locator("body")).toContainText(/tersalin/i, { timeout: 15000 });
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain("Halo Siswa");
    expect(clip).toContain("/assessment/invite/");
  });
});
