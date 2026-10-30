// E2E B2B — M1b (UI): pendaftaran sekolah lewat form → verifikasi di admin MULAI+
// → dashboard sekolah aktif (peserta, progres, sebaran Holland).
//
// Prasyarat data: sekolah legacy + batch + 1 peserta selesai (dengan hasil Holland)
// disemai lebih dulu supaya dashboard benar-benar menampilkan angka, bukan 0.
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { cleanupTrack, newTrack, suffix, uniqueId } from "../../../helpers/b2b";
import { closeDb, q } from "../../../helpers/db";

const PREFIX = "e2e-portal";
const track = newTrack();
const orgIds = track.orgIds;
const schoolIds = track.schoolIds;
const emails = track.emails;
const resultIds = track.resultIds;
let admin: Page;

async function applicant(page: Page, tag: string) {
  const email = `${PREFIX}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi("PIC Sekolah", email, E2E_PASSWORD);
  expect(created.ok, `signup gagal: ${created.raw}`).toBe(true);
  emails.push(email);
  await loginUI(page, email, E2E_PASSWORD);
  return { email, userId: created.userId as string };
}

/** Sekolah legacy + batch + 1 peserta yang sudah selesai (punya hasil Holland). */
async function seedSchoolWithResult(name: string) {
  const schoolId = uniqueId();
  const batchId = uniqueId();
  const resId = uniqueId();
  schoolIds.push(schoolId);
  resultIds.push(resId);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [schoolId, name]);
  await q(
    "insert into tmb_batches (id, school_id, name, class_name, major, invite_code) values ($1,$2,'XII IPA 1','XII IPA 1','IPA',$3)",
    [batchId, schoolId, `E2E${suffix()}`],
  );
  await q(
    `insert into tmb_assessment_results (id, user_id, holland_code, holland_scores)
     values ($1,$2,'RIA','{"R":5,"I":3,"A":2}'::jsonb)`,
    [resId, `e2e-portal-siswa-${suffix()}`],
  );
  await q(
    "insert into tmb_batch_students (id, batch_id, name, status, result_id) values ($1,$2,'Siswa Portal','completed',$3)",
    [uniqueId(), batchId, resId],
  );
  return { schoolId, batchId };
}

const orgIdByName = async (name: string) => {
  const rows = await q<{ id: string }>("select id from assessment_orgs where name = $1 order by created_at desc", [
    name,
  ]);
  return rows[0]?.id ?? null;
};

/** Isi formulir pendaftaran sekolah. */
async function isiForm(page: Page, nama: string) {
  await page.goto("/sekolah/daftar", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("school-register-form")).toBeVisible({ timeout: 20000 });
  await page.getByTestId("school-name").fill(nama);
  await page.getByTestId("school-city").fill("Bandung");
  await page.getByTestId("school-npsn").fill("12345678");
  await page.getByTestId("school-pic-name").fill("Budi Santoso");
  await page.getByTestId("school-pic-position").fill("Guru BK");
  await page.getByTestId("school-pic-phone").fill("081234567890");
  await page.getByTestId("school-submit").click();
  await expect(page.getByTestId("school-register-done")).toBeVisible({ timeout: 20000 });
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  await cleanupTrack(track);
  await admin.context().close();
  await closeDb();
});

test.describe("B2B · portal sekolah (UI)", () => {
  test("daftar dari form → menunggu → admin setujui → dashboard aktif + routing role", async ({ page }) => {
    test.setTimeout(90000);
    const nama = `SMA Portal ${suffix()}`;
    await seedSchoolWithResult(nama);
    await applicant(page, "approve");

    // 1) daftar lewat form
    await isiForm(page, nama);
    const orgId = await orgIdByName(nama);
    expect(orgId, "organisasi harus terbentuk").toBeTruthy();
    orgIds.push(orgId!);

    // 2) dashboard sekolah masih terkunci
    await page.goto("/sekolah", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("school-status-title")).toContainText(/Menunggu persetujuan/i, { timeout: 20000 });

    // 3) admin menyetujui dari antrean verifikasi
    await admin.goto("/admin/assessment/schools/pendaftaran", { waitUntil: "domcontentloaded" });
    const row = admin.locator('[data-testid="pending-row"]').filter({ hasText: nama });
    await expect(row).toBeVisible({ timeout: 30000 });
    await admin.getByTestId(`approve-${orgId}`).click();
    await expect(row).toBeHidden({ timeout: 30000 });

    // 4) dashboard sekolah terbuka dengan angka dari data yang sudah ada
    await page.goto("/sekolah", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("school-dashboard")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("stat-peserta")).toContainText("1");
    await expect(page.getByTestId("stat-selesai")).toContainText("1");
    await expect(page.getByTestId("holland-R")).toContainText("1");
    await expect(page.getByTestId("batch-row")).toContainText("XII IPA 1");

    // 5) routing role: /dashboard mengarah ke area sekolah
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/sekolah$/, { timeout: 20000 });
  });

  test("tolak pendaftaran dari admin menampilkan catatan di dashboard sekolah", async ({ page }) => {
    test.setTimeout(90000);
    const nama = `SMK Ditolak ${suffix()}`;
    await applicant(page, "reject");
    await isiForm(page, nama);
    const orgId = await orgIdByName(nama);
    expect(orgId).toBeTruthy();
    orgIds.push(orgId!);

    await admin.goto("/admin/assessment/schools/pendaftaran", { waitUntil: "domcontentloaded" });
    const row = admin.locator('[data-testid="pending-row"]').filter({ hasText: nama });
    await expect(row).toBeVisible({ timeout: 30000 });
    await admin.getByTestId(`reject-${orgId}`).click();
    await admin.getByTestId("reject-note").fill("Data sekolah belum bisa diverifikasi");
    await admin.getByTestId("reject-confirm").click();
    await expect(row).toBeHidden({ timeout: 30000 });

    await page.goto("/sekolah", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("school-status-title")).toContainText(/belum disetujui/i, { timeout: 20000 });
    await expect(page.getByTestId("school-note")).toContainText("belum bisa diverifikasi");
  });

  test("tab login 'Sekolah' tampil & akun sekolah diarahkan ke area sekolah", async ({ page }) => {
    test.setTimeout(90000);
    // dialog cookie menutupi tombol login → setujui lebih dulu
    await preAcceptCookies(page);
    // Siapkan akun school_admin yang sudah aktif (langsung di DB, tanpa antrean approval)
    const email = `${PREFIX}-login-${Date.now()}-${suffix().toLowerCase()}@test.local`;
    const created = await signUpViaApi("Admin Sekolah Login", email, E2E_PASSWORD);
    expect(created.ok, `signup gagal: ${created.raw}`).toBe(true);
    emails.push(email);
    const orgId = uniqueId();
    orgIds.push(orgId);
    await q("insert into assessment_orgs (id, name, status) values ($1,$2,'aktif')", [orgId, `SMA Login ${suffix()}`]);
    await q(
      "insert into assessment_org_members (id, org_id, user_id, role, status) values ($1,$2,$3,'school_admin','aktif')",
      [uniqueId(), orgId, created.userId],
    );
    await q('update "user" set role = $2 where id = $1', [created.userId, "school_admin"]);

    // Tab konteks di halaman login (deep-link ?as=sekolah)
    await page.goto("/login?as=sekolah", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("login-tab-sekolah")).toHaveAttribute("aria-selected", "true", { timeout: 20000 });
    await expect(page.getByTestId("login-tab-hint")).toContainText(/admin sekolah/i);
    await expect(page.getByRole("link", { name: /Daftarkan sekolahmu/i })).toBeVisible();
    await page.getByTestId("login-tab-siswa").click();
    await expect(page.getByTestId("login-tab-hint")).toContainText(/untuk siswa/i);

    // Login → harus diarahkan ke /sekolah (bukan dashboard siswa)
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(E2E_PASSWORD);
    await page.getByRole("button", { name: /^Sign In$/i }).click();
    await expect(page).toHaveURL(/\/sekolah$/, { timeout: 30000 });
    await expect(page.getByTestId("school-dashboard")).toBeVisible({ timeout: 30000 });
  });
});
