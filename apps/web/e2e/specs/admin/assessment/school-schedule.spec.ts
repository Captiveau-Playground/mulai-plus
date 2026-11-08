// E2E B2B — M2.3: jadwal/window tes per kelas + enforcement di server.
//   · siswa TIDAK bisa memulai tes di luar window kelasnya
//   · di dalam window → boleh mulai
//   · validasi jadwal (selesai harus setelah mulai)
//   · UI: kartu jadwal menampilkan status & bisa menyimpan
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, rpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { cleanupTrack, newTrack, rpcAs, suffix, uniqueId } from "../../../helpers/b2b";
import { closeDb, q } from "../../../helpers/db";

const PREFIX = "e2e-jdw";
const track = newTrack();
const orgIds = track.orgIds;
const schoolIds = track.schoolIds;
const studentIds = track.studentIds;
const emails = track.emails;
let admin: Page;

async function setupSchool(page: Page, tag: string) {
  const name = `SMA Jadwal ${suffix()}`;
  const schoolId = uniqueId();
  schoolIds.push(schoolId);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [schoolId, name]);
  const email = `${PREFIX}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi("PIC Jadwal", email, E2E_PASSWORD);
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
  if (appr.schoolId) schoolIds.push(appr.schoolId);
  return { name, schoolId };
}

/** Peserta roster yang "sudah punya akun" (userId) → dipakai menguji enforcement. */
async function addRosterStudent(batchId: string, userId: string, name = "Siswa Uji") {
  const id = uniqueId();
  await q(
    "insert into tmb_batch_students (id, batch_id, name, email, status, user_id) values ($1,$2,$3,$4,'invited',$5)",
    [id, batchId, name, `${id}@test.local`, userId],
  );
  return id;
}

const iso = (offsetMinutes: number) => new Date(Date.now() + offsetMinutes * 60_000).toISOString();

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  await cleanupTrack(track);
  await admin.context().close();
  await closeDb();
});

test.describe("B2B · jadwal & window kelas (M2.3)", () => {
  test("validasi jadwal + status window di daftar kelas", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    await setupSchool(page, "api");
    const c = await rpcAs<any>(page, "school/cohortCreate", { name: "XII IPS 1" });
    expect(c.ok).toBe(true);

    // selesai sebelum mulai → ditolak
    const bad = await rpcAs<any>(page, "school/cohortSchedule", {
      batchId: c.id,
      mode: "scheduled",
      startISO: iso(60),
      endISO: iso(30),
    });
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe("selesai_harus_setelah_mulai");

    // jadwal berjalan (mulai 1 jam lalu, selesai 1 jam lagi)
    const ok = await rpcAs<any>(page, "school/cohortSchedule", {
      batchId: c.id,
      mode: "scheduled",
      startISO: iso(-60),
      endISO: iso(60),
    });
    expect(ok.ok).toBe(true);
    expect(ok.windowState).toBe("berjalan");

    const cohorts = await rpcAs<any>(page, "school/cohorts");
    const row = cohorts.items.find((x: any) => x.id === c.id);
    expect(row.windowState).toBe("berjalan");
    expect(row.scheduleMode).toBe("scheduled");

    // hapus jadwal → kembali bebas
    const off = await rpcAs<any>(page, "school/cohortSchedule", { batchId: c.id, mode: "off" });
    expect(off.ok).toBe(true);
    expect(off.windowState).toBe("tanpa_jadwal");
  });

  test("server menolak MULAI di luar window & mengizinkan di dalamnya", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    await setupSchool(page, "enforce");
    const c = await rpcAs<any>(page, "school/cohortCreate", { name: "XII IPA 3" });
    const cfg = await rpc<{ version: { id: string }; questions: any[] }>("discover/config", { code: "TALENT" });
    const versionId = (cfg as any).version?.id as string;
    expect(versionId).toBeTruthy();

    // (a) window di masa depan → tidak boleh mulai
    const siswaA = `e2e-jdw-a-${Date.now()}`;
    studentIds.push(siswaA);
    await addRosterStudent(c.id, siswaA);
    await rpcAs<any>(page, "school/cohortSchedule", {
      batchId: c.id,
      mode: "scheduled",
      startISO: iso(120),
      endISO: iso(180),
    });
    const future = await rpc<any>("discover/start", { code: "TALENT", studentId: siswaA, versionId });
    expect(future.ok).toBe(false);
    expect(future.error).toBe("window_not_started");

    // (b) window sudah lewat → tidak boleh mulai
    const siswaB = `e2e-jdw-b-${Date.now()}`;
    studentIds.push(siswaB);
    await addRosterStudent(c.id, siswaB);
    await rpcAs<any>(page, "school/cohortSchedule", {
      batchId: c.id,
      mode: "scheduled",
      startISO: iso(-180),
      endISO: iso(-120),
    });
    const past = await rpc<any>("discover/start", { code: "TALENT", studentId: siswaB, versionId });
    expect(past.ok).toBe(false);
    expect(past.error).toBe("window_ended");

    // (c) window mencakup sekarang → boleh mulai
    const siswaC = `e2e-jdw-c-${Date.now()}`;
    studentIds.push(siswaC);
    await addRosterStudent(c.id, siswaC);
    await rpcAs<any>(page, "school/cohortSchedule", {
      batchId: c.id,
      mode: "scheduled",
      startISO: iso(-30),
      endISO: iso(30),
    });
    const inside = await rpc<any>("discover/start", { code: "TALENT", studentId: siswaC, versionId });
    expect(inside.ok).toBe(true);
    expect(inside.sessionId).toBeTruthy();
  });

  test("UI: kartu jadwal menyimpan rentang & menampilkan status", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    await setupSchool(page, "ui");
    const c = await rpcAs<any>(page, "school/cohortCreate", { name: "XI IPA 4" });

    await page.goto(`/sekolah/kelas/${c.id}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("schedule-card")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("schedule-state")).toContainText(/Tanpa jadwal/i);

    // isi jadwal yang sedang berjalan
    const toLocal = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    await page.getByTestId("schedule-start").fill(toLocal(new Date(Date.now() - 60 * 60_000)));
    await page.getByTestId("schedule-end").fill(toLocal(new Date(Date.now() + 60 * 60_000)));
    await page.getByTestId("schedule-save-scheduled").click();

    await expect(page.getByTestId("schedule-state")).toContainText(/Berjalan/i, { timeout: 20000 });
    await expect(page.locator("body")).toContainText(/→/);
  });
});
