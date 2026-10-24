// E2E B2B — M1: pendaftaran sekolah → approval admin MULAI+ → akun aktif.
//
// Regresi yang dijaga:
//  1. calon admin sekolah mendaftar → status "pending" (belum boleh lihat data)
//  2. admin MULAI+ menyetujui → organisasi + anggota aktif, role akun naik ke
//     `school_admin`, dan sekolah tersambung ke `tmb_schools` (data batch/roster terlihat)
//  3. pendaftaran ganda ditolak (satu akun = satu sekolah)
//  4. penolakan (reject) tidak mengubah role akun
//  5. ISOLASI: sekolah hanya melihat data miliknya sendiri
import { expect, type Page, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI } from "../../../helpers/auth";
import { cleanupTrack, newTrack, rpcAs, suffix, uniqueId } from "../../../helpers/b2b";
import { closeDb, q } from "../../../helpers/db";

const PREFIX = "e2e-school";
const track = newTrack();
const orgIds = track.orgIds;
const schoolIds = track.schoolIds;
const emails = track.emails; // dilacak untuk teardown tertarget
let admin: Page;

/** Panggil RPC memakai sesi browser (cookie dibagi karena sama-sama `localhost`). */
/** Buat akun + login sebagai calon admin sekolah. */
async function applicant(page: Page, tag: string) {
  const email = `${PREFIX}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi("Calon Admin Sekolah", email, E2E_PASSWORD);
  expect(created.ok, `signup gagal: ${created.raw}`).toBe(true);
  emails.push(email);
  await loginUI(page, email, E2E_PASSWORD);
  return { email, userId: created.userId as string };
}

/** Sekolah legacy + batch + peserta (data yang sudah ada sebelum B2B punya portal). */
async function seedLegacySchool(name: string, studentNames: string[]) {
  const schoolId = uniqueId();
  const batchId = uniqueId();
  schoolIds.push(schoolId);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [schoolId, name]);
  await q(
    "insert into tmb_batches (id, school_id, name, class_name, major, invite_code) values ($1,$2,'Batch Isolasi','XII IPA','IPA',$3)",
    [batchId, schoolId, `E2E${suffix()}`],
  );
  for (const nm of studentNames) {
    await q("insert into tmb_batch_students (id, batch_id, name, status) values ($1,$2,$3,'invited')", [
      uniqueId(),
      batchId,
      nm,
    ]);
  }
  return { schoolId, batchId };
}

const daftar = (page: Page, name: string, extra: Record<string, unknown> = {}) =>
  rpcAs<{ ok: boolean; orgId?: string; status?: string; error?: string }>(page, "school/register", {
    name,
    picName: "Budi BK",
    picPosition: "Staff BK",
    picPhone: "08123456789",
    picEmail: "bk@test.local",
    ...extra,
  });

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  await cleanupTrack(track);
  await admin.context().close();
  await closeDb();
});

test.describe("B2B · pendaftaran & approval sekolah", () => {
  test("daftar → pending → approve → aktif, role naik, sekolah legacy tersambung", async ({ page }) => {
    test.setTimeout(90000);
    const nama = `SMA E2E ${suffix()}`;
    const { userId } = await applicant(page, "approve");

    // 1) daftar
    const reg = await daftar(page, nama, { city: "Bandung", npsn: "12345678" });
    expect(reg.ok, `daftar gagal: ${JSON.stringify(reg)}`).toBe(true);
    orgIds.push(reg.orgId!);

    // 2) belum aktif → belum boleh lihat data
    const me1 = await rpcAs<any>(page, "school/me");
    expect(me1.member.status).toBe("pending");
    expect(me1.org.name).toBe(nama);
    expect(me1.org.schoolId).toBeNull();
    const ov1 = await rpcAs<any>(page, "school/overview");
    expect(ov1.ok).toBe(false);
    expect(ov1.error).toBe("belum_aktif");

    // role akun belum berubah
    expect((await q<any>('select role from "user" where id = $1', [userId]))[0]?.role).toBe("student");

    // 3) admin MULAI+ melihat pendaftaran & menyetujui
    const list = await adminRpc<{ items: any[] }>(admin, "schoolAdmin/registrations", { status: "pending" });
    const found = (list.items ?? []).find((x: any) => x.id === reg.orgId);
    expect(found, "pendaftaran harus muncul di daftar admin").toBeTruthy();
    expect(found.user?.email).toContain(PREFIX);

    const appr = await adminRpc<any>(admin, "schoolAdmin/approve", { orgId: reg.orgId, note: "Terverifikasi" });
    expect(appr.ok).toBe(true);
    if (appr.schoolId) schoolIds.push(appr.schoolId);
    expect(appr.roleChanged).toBe(true);
    expect(appr.schoolCreated, "nama sekolah unik → sekolah legacy dibuat baru").toBe(true);
    expect(appr.schoolId).toBeTruthy();

    // 4) setelah aktif: role naik + data sekolah bisa dibuka
    expect((await q<any>('select role from "user" where id = $1', [userId]))[0]?.role).toBe("school_admin");
    const me2 = await rpcAs<any>(page, "school/me");
    expect(me2.member.status).toBe("aktif");
    expect(me2.org.status).toBe("aktif");
    expect(me2.org.schoolId).toBe(appr.schoolId);
    const sekolah = await q<any>("select name from tmb_schools where id = $1", [appr.schoolId]);
    expect(sekolah[0]?.name).toBe(nama);

    const ov2 = await rpcAs<any>(page, "school/overview");
    expect(ov2.ok).toBe(true);
    expect(ov2.totals.peserta).toBe(0);
    expect(ov2.batches).toEqual([]);
  });

  test("pendaftaran ganda ditolak (satu akun = satu sekolah)", async ({ page }) => {
    test.setTimeout(90000);
    const { userId } = await applicant(page, "ganda");
    const first = await daftar(page, `SMK E2E ${suffix()}`);
    expect(first.ok).toBe(true);
    orgIds.push(first.orgId!);

    const second = await daftar(page, `SMK Lain ${suffix()}`);
    expect(second.ok).toBe(false);
    expect(second.error).toBe("sudah_terdaftar");

    // hanya satu keanggotaan
    const rows = await q<any>("select count(*)::int as n from assessment_org_members where user_id = $1", [userId]);
    expect(rows[0]?.n).toBe(1);
  });

  test("reject → status ditolak & role akun tidak berubah", async ({ page }) => {
    test.setTimeout(90000);
    const { userId } = await applicant(page, "reject");
    const reg = await daftar(page, `SMA Tolak ${suffix()}`);
    expect(reg.ok).toBe(true);
    orgIds.push(reg.orgId!);

    const rej = await adminRpc<any>(admin, "schoolAdmin/reject", {
      orgId: reg.orgId,
      note: "Data sekolah tidak jelas",
    });
    expect(rej.ok).toBe(true);

    const me = await rpcAs<any>(page, "school/me");
    expect(me.org.status).toBe("ditolak");
    expect(me.member.status).toBe("ditolak");
    expect(me.org.note).toContain("tidak jelas");
    const ov = await rpcAs<any>(page, "school/overview");
    expect(ov.ok).toBe(false);
    expect((await q<any>('select role from "user" where id = $1', [userId]))[0]?.role).toBe("student");
  });

  test("isolasi: sekolah hanya melihat peserta & batch miliknya", async ({ page, browser }) => {
    test.setTimeout(90000);
    const namaA = `SMA Isolasi A ${suffix()}`;
    const namaB = `SMA Isolasi B ${suffix()}`;
    const schoolA = await seedLegacySchool(namaA, ["Siswa A1"]);
    const schoolB = await seedLegacySchool(namaB, ["Siswa B1", "Siswa B2"]);

    // ── Sekolah A ──
    const userA = await applicant(page, "isolasi-a");
    const regA = await daftar(page, namaA);
    orgIds.push(regA.orgId!);
    const apprA = await adminRpc<any>(admin, "schoolAdmin/approve", { orgId: regA.orgId });
    expect(apprA.schoolId, "sekolah legacy harus DITAUTKAN (nama sama), bukan dibuat baru").toBe(schoolA.schoolId);
    expect(apprA.schoolCreated).toBe(false);

    const ovA = await rpcAs<any>(page, "school/overview");
    expect(ovA.ok).toBe(true);
    expect(ovA.org.schoolId).toBe(schoolA.schoolId);
    expect(ovA.totals.peserta).toBe(1);
    expect(ovA.batches.map((b: any) => b.id)).toEqual([schoolA.batchId]);

    // ── Sekolah B (context terpisah supaya cookie sesi tidak saling menimpa) ──
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    const userB = await applicant(pageB, "isolasi-b");
    const regB = await daftar(pageB, namaB);
    orgIds.push(regB.orgId!);
    const apprB = await adminRpc<any>(admin, "schoolAdmin/approve", { orgId: regB.orgId });
    expect(apprB.schoolId).toBe(schoolB.schoolId);

    const ovB = await rpcAs<any>(pageB, "school/overview");
    expect(ovB.ok).toBe(true);
    expect(ovB.totals.peserta).toBe(2);
    expect(ovB.batches.map((b: any) => b.id)).toEqual([schoolB.batchId]);

    // ── silang: tidak boleh saling melihat ──
    expect(ovA.batches.map((b: any) => b.id)).not.toContain(schoolB.batchId);
    expect(ovB.batches.map((b: any) => b.id)).not.toContain(schoolA.batchId);

    await pageB.close();
    await ctxB.close();
    void userA;
    void userB;
  });
});
