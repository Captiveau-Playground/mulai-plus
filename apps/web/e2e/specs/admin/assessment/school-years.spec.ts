// E2E B2B — M4.2: multi-angkatan (rekap lintas tahun + filter di daftar kelas).
import { expect, test } from "@playwright/test";
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

const PREFIX = "e2e-years";
const track = newTrack();
const orgIds = track.orgIds;
const schoolIds = track.schoolIds;
const resultIds = track.resultIds;
const emails = track.emails;

/** Sekolah dengan 2 angkatan: 2025 (1 kelas, 2 selesai) & 2026 (1 kelas, 1 selesai). */
async function seedYears(name: string) {
  const schoolId = uniqueId();
  schoolIds.push(schoolId);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [schoolId, name]);
  const plan = [
    { year: 2025, className: "XII A", count: 2, holland: "RIA", conf: "80" },
    { year: 2026, className: "XII B", count: 1, holland: "SEA", conf: "60" },
  ];
  for (const p of plan) {
    const batchId = uniqueId();
    await q(
      "insert into tmb_batches (id, school_id, name, class_name, major, invite_code, graduation_year) values ($1,$2,$3,$4,'IPA',$5,$6)",
      [batchId, schoolId, p.className, p.className, `E2E${suffix()}`, p.year],
    );
    for (let i = 0; i < p.count; i++) {
      const resultId = uniqueId();
      resultIds.push(resultId);
      const rosterId = uniqueId();
      await q(
        `insert into tmb_assessment_results (id, user_id, holland_code, holland_scores, confidence_score)
         values ($1,$2,$3,'{}'::jsonb,$4)`,
        [resultId, `e2e-years-${resultId}`, p.holland, p.conf],
      );
      await q(
        "insert into tmb_batch_students (id, batch_id, name, email, status, result_id) values ($1,$2,$3,$4,'completed',$5)",
        [rosterId, batchId, `${p.className} Siswa ${i + 1}`, `${rosterId}@test.local`, resultId],
      );
    }
  }
  return { schoolId };
}

test.afterAll(async () => {
  await cleanupTrack(track);
  await closeDb();
});

test.describe("B2B · multi-angkatan (M4.2)", () => {
  test("API + UI: rekap per angkatan & filter tahun", async ({ page, browser }) => {
    test.setTimeout(90000);
    const admin = await createAdminPage(browser);
    await preAcceptCookies(page);
    const nama = `SMA Angkatan ${suffix()}`;
    const fx = await seedYears(nama);

    const email = `${PREFIX}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
    const created = await signUpViaApi("PIC Angkatan", email, E2E_PASSWORD);
    expect(created.ok, created.raw).toBe(true);
    emails.push(email);
    await loginUI(page, email, E2E_PASSWORD);
    const reg = await rpcAs<any>(page, "school/register", {
      name: nama,
      picName: "Budi BK",
      picPhone: "08123456789",
      picEmail: "bk@test.local",
    });
    expect(reg.ok, JSON.stringify(reg)).toBe(true);
    orgIds.push(reg.orgId);
    expect((await adminRpc<any>(admin, "schoolAdmin/approve", { orgId: reg.orgId })).ok).toBe(true);
    expect(fx.schoolId).toBeTruthy();

    const y = await rpcAs<any>(page, "school/cohortYears", {});
    expect(y.ok, JSON.stringify(y).slice(0, 300)).toBe(true);
    expect(y.items.length).toBe(2);
    const y2025 = y.items.find((i: any) => i.year === 2025);
    const y2026 = y.items.find((i: any) => i.year === 2026);
    expect(y2025.completed).toBe(2);
    expect(y2025.topHolland.code).toBe("R");
    expect(y2026.completed).toBe(1);
    expect(y2026.topHolland.code).toBe("S");
    // urut terbaru dulu
    expect(y.items[0].year).toBe(2026);

    // UI: chip filter angkatan + kartu perbandingan
    await page.goto("/sekolah/kelas", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("cohort-row")).toHaveCount(2, { timeout: 30000 });
    await expect(page.getByTestId("year-compare")).toBeVisible();
    await expect(page.getByTestId("year-2025")).toBeVisible();
    await page.getByTestId("year-2025").click();
    await expect(page.getByTestId("cohort-row")).toHaveCount(1);
    await page.getByTestId("year-all").click();
    await expect(page.getByTestId("cohort-row")).toHaveCount(2);

    // isolasi: sekolah lain tidak melihat angkatan ini
    const ctx2 = await (page.context().browser() as any).newContext();
    const pageB = await ctx2.newPage();
    await preAcceptCookies(pageB);
    const otherName = `SMA Lain Angkatan ${suffix()}`;
    await signUpAndLogin(pageB, track, { name: "PIC Lain", prefix: `${PREFIX}-b`, tag: "iso" });
    const regB = await registerSchool(pageB, track, { name: otherName });
    expect(regB.ok, JSON.stringify(regB)).toBe(true);
    expect((await approveSchool(admin, track, regB.orgId as string)).ok).toBe(true);
    const yearsB = await rpcAs<any>(pageB, "school/cohortYears", {});
    expect(yearsB.ok, "sekolah lain harus dapat daftar kosong").toBe(true);
    expect(yearsB.items, "angkatan sekolah lain tidak boleh bocor").toHaveLength(0);
    await ctx2.close();

    await admin.context().close();
  });
});
