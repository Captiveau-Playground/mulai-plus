// E2E B2B — M3: insight kelas (distribusi Holland, jurusan teratas, kemampuan,
// "perlu perhatian") + unduh PDF ber-kop.
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { cleanupTrack, newTrack, rpcAs, suffix, uniqueId } from "../../../helpers/b2b";
import { closeDb, q } from "../../../helpers/db";

const PREFIX = "e2e-ins";
const track = newTrack();
const orgIds = track.orgIds;
const schoolIds = track.schoolIds;
const resultIds = track.resultIds;
const emails = track.emails;
let admin: Page;

type SeedStudent = {
  name: string;
  holland: string;
  scores: Record<string, number>;
  conf: number;
  ability: Record<string, { correct: number; total: number }>;
  majors: string[];
};

/** Kelas dengan 3 peserta selesai (variasi Holland, confidence, kemampuan). */
async function seedInsightClass(name: string) {
  const schoolId = uniqueId();
  const batchId = uniqueId();
  schoolIds.push(schoolId);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [schoolId, name]);
  await q(
    "insert into tmb_batches (id, school_id, name, class_name, major, invite_code) values ($1,$2,'XII IPA 3','XII IPA 3','IPA',$3)",
    [batchId, schoolId, `E2E${suffix()}`],
  );

  const plan: SeedStudent[] = [
    {
      name: "Siswa Rajin",
      holland: "RIA",
      scores: { R: 5, I: 4, A: 3, S: 1, E: 0, C: 0 },
      conf: 82,
      ability: { verbal: { correct: 4, total: 4 }, numerical: { correct: 3, total: 4 } },
      majors: ["Teknik Informatika", "Teknik Mesin"],
    },
    {
      name: "Siswa Ragu",
      holland: "RIE",
      scores: { R: 4, I: 5, A: 1, S: 0, E: 2, C: 0 },
      conf: 41,
      ability: { verbal: { correct: 1, total: 4 }, numerical: { correct: 1, total: 4 } },
      majors: ["Teknik Informatika"],
    },
    {
      name: "Siswa Sosial",
      holland: "SIA",
      scores: { R: 1, I: 2, A: 3, S: 5, E: 2, C: 1 },
      conf: 74,
      ability: { verbal: { correct: 3, total: 4 }, numerical: { correct: 2, total: 4 } },
      majors: ["Psikologi"],
    },
  ];

  for (const p of plan) {
    const resultId = uniqueId();
    resultIds.push(resultId);
    const rosterId = uniqueId();
    await q(
      `insert into tmb_assessment_results (id, user_id, holland_code, holland_scores, ability_scores, confidence_score, differentiation)
       values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,'clear')`,
      [
        resultId,
        `e2e-ins-${resultId}`,
        p.holland,
        JSON.stringify(p.scores),
        JSON.stringify({ scores: p.ability }),
        String(p.conf),
      ],
    );
    let rank = 1;
    for (const m of p.majors) {
      await q("insert into tmb_recommendations (id, result_id, type, rank, item_name) values ($1,$2,'major',$3,$4)", [
        uniqueId(),
        resultId,
        rank++,
        m,
      ]);
    }
    await q("insert into tmb_recommendations (id, result_id, type, rank, item_name) values ($1,$2,'career',1,$3)", [
      uniqueId(),
      resultId,
      "Data Analyst",
    ]);
    await q(
      "insert into tmb_batch_students (id, batch_id, name, email, status, result_id) values ($1,$2,$3,$4,'completed',$5)",
      [rosterId, batchId, p.name, `${rosterId}@test.local`, resultId],
    );
  }
  // 1 peserta belum mulai → masuk daftar "perlu perhatian"
  await q(
    "insert into tmb_batch_students (id, batch_id, name, email, status) values ($1,$2,'Siswa Belum Mulai','belum@test.local','invited')",
    [uniqueId(), batchId],
  );
  return { schoolId, batchId };
}

async function approveSchool(page: Page, tag: string, schoolName: string) {
  const email = `${PREFIX}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi("PIC Insight", email, E2E_PASSWORD);
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

test.describe("B2B · insight kelas (M3)", () => {
  test("API: agregat Holland, jurusan teratas, kemampuan & perlu perhatian", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const nama = `SMA Insight ${suffix()}`;
    const fx = await seedInsightClass(nama);
    const other = await seedInsightClass(`SMA Lain ${suffix()}`);
    await approveSchool(page, "api", nama);

    const r = await rpcAs<any>(page, "school/cohortInsight", { batchId: fx.batchId });
    expect(r.ok, JSON.stringify(r).slice(0, 300)).toBe(true);
    expect(r.counts.total).toBe(4);
    expect(r.counts.completed).toBe(3);
    expect(r.counts.invited).toBe(1);

    // Holland: R muncul 2x (RIA, RIE) → kode teratas
    expect(r.hollandDist[0].code).toBe("R");
    expect(r.hollandDist[0].count).toBe(2);

    // jurusan teratas: Teknik Informatika dipilih 2 siswa
    expect(r.topMajors[0].name).toBe("Teknik Informatika");
    expect(r.topMajors[0].count).toBe(2);

    // kemampuan: verbal total 4/4 dikali 3 siswa
    const verbal = r.ability.find((a: any) => a.key === "verbal");
    expect(verbal.total).toBe(12);

    // perlu perhatian: siswa confidence 41 + siswa belum mulai
    const names = r.attention.map((a: any) => a.name);
    expect(names).toContain("Siswa Ragu");
    expect(names).toContain("Siswa Belum Mulai");
    const ragu = r.attention.find((a: any) => a.name === "Siswa Ragu");
    expect(ragu.reasons.join(" ")).toMatch(/keyakinan rendah/i);

    // isolasi kelas sekolah lain
    const bad = await rpcAs<any>(page, "school/cohortInsight", { batchId: other.batchId });
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe("not_found");
  });

  test("API+UI: snapshot laporan tersimpan & bisa dicetak ulang", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const nama = `SMA Snapshot ${suffix()}`;
    const fx = await seedInsightClass(nama);
    const other = await seedInsightClass(`SMA Snapshot Lain ${suffix()}`);
    await approveSchool(page, "snap", nama);

    // simpan snapshot
    const saved = await rpcAs<any>(page, "school/saveReport", { batchId: fx.batchId, note: "laporan awal" });
    expect(saved.ok, JSON.stringify(saved)).toBe(true);
    expect(saved.id).toBeTruthy();

    // daftar & isi snapshot
    const list = await rpcAs<any>(page, "school/reports", { batchId: fx.batchId });
    expect(list.ok).toBe(true);
    expect(list.items.length).toBe(1);
    expect(list.items[0].completed).toBe(3);
    expect(list.items[0].note).toBe("laporan awal");

    const one = await rpcAs<any>(page, "school/report", { id: saved.id });
    expect(one.ok).toBe(true);
    expect(one.snapshot.counts.completed).toBe(3);
    expect(one.snapshot.hollandDist[0].code).toBe("R");

    // isolasi: kelas sekolah lain tidak bisa disimpan lewat akun ini
    const bad = await rpcAs<any>(page, "school/saveReport", { batchId: other.batchId });
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe("not_found");

    // UI: tombol simpan + riwayat + PDF dari snapshot
    await page.goto(`/sekolah/kelas/${fx.batchId}/laporan`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("report-title")).toBeVisible({ timeout: 30000 });
    await page.getByTestId("save-report").click();
    await expect(page.locator("body")).toContainText(/tersimpan/i, { timeout: 15000 });
    await expect(page.getByTestId("report-history")).toContainText("3/4", { timeout: 15000 });

    const dl = page.waitForEvent("download", { timeout: 30000 }).catch(() => null);
    await page.getByTestId("history-pdf").first().click();
    const file = await dl;
    expect(file, "PDF snapshot harus terunduh").toBeTruthy();
    expect(file?.suggestedFilename() ?? "").toMatch(/\.pdf$/);

    // PDF harus benar-benar terbentuk (magic bytes + ada halaman + ukuran wajar)
    const { readFile } = await import("node:fs/promises");
    const pdfPath = await file?.path();
    expect(pdfPath, "file PDF harus tersedia di disk").toBeTruthy();
    const buf = await readFile(pdfPath as string);
    expect(buf.subarray(0, 5).toString(), "harus berawalan %PDF").toBe("%PDF-");
    expect(buf.length, "PDF terlalu kecil — kemungkinan kosong").toBeGreaterThan(3000);
    const pages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pages, "PDF harus punya minimal 1 halaman").toBeGreaterThanOrEqual(1);
  });

  test("T15: snapshot ditolak saat kelas belum punya hasil", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const nama = `SMA Kosong ${suffix()}`;
    const fx = await seedInsightClass(nama);
    // kosongkan status: belum ada yang selesai
    await q("update tmb_batch_students set status = 'invited', result_id = null where batch_id = $1", [fx.batchId]);
    await approveSchool(page, "kosong", nama);

    const r = await rpcAs<any>(page, "school/saveReport", { batchId: fx.batchId });
    expect(r.ok, "tidak boleh menyimpan laporan tanpa hasil").toBe(false);
    expect(r.error).toBe("belum_ada_hasil");

    const list = await rpcAs<any>(page, "school/reports", { batchId: fx.batchId });
    expect(list.items ?? []).toHaveLength(0);
  });

  test("UI: halaman insight tampil & PDF berhasil diunduh", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    const nama = `SMA Insight UI ${suffix()}`;
    const fx = await seedInsightClass(nama);
    await approveSchool(page, "ui", nama);

    await page.goto(`/sekolah/kelas/${fx.batchId}/laporan`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("report-title")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("report-summary")).toContainText("4");
    await expect(page.getByTestId("holland-dist")).toBeVisible();
    await expect(page.getByTestId("top-majors")).toContainText("Teknik Informatika");
    await expect(page.getByTestId("attention-list")).toContainText("Siswa Ragu");

    const dl = page.waitForEvent("download", { timeout: 30000 }).catch(() => null);
    await page.getByTestId("download-pdf").click();
    const file = await dl;
    expect(file, "PDF harus terunduh").toBeTruthy();
    expect(file?.suggestedFilename() ?? "").toMatch(/\.pdf$/);

    // tombol dari detail kelas menuju laporan
    await page.goto(`/sekolah/kelas/${fx.batchId}`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("report-link").click();
    await expect(page.getByTestId("report-title")).toBeVisible({ timeout: 20000 });
  });
});
