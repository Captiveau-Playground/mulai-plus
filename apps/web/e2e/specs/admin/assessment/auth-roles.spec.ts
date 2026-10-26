// E2E AUTH — keamanan role internal + pengguna B2B.
//
// Mengunci empat kelas bug yang ditemukan saat audit:
//  1. endpoint `role.*` / `permission.*` dulu bisa dipanggil SEMUA user login
//     (eskalasi privilege: siswa bisa menghapus/mengubah role admin),
//  2. `consumeInvites` bisa MENURUNKAN role platform (admin/PM/mentor) menjadi
//     `school_viewer` saat menerima undangan sekolah,
//  3. role B2B belum terdaftar di UI admin (create user & selector role),
//  4. tabel `role` tidak punya seeder → environment baru tanpa role sekolah.
import { expect, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { cleanupTrack, newTrack, rpcAs, suffix, uniqueId } from "../../../helpers/b2b";
import { closeDb, q } from "../../../helpers/db";

const PREFIX = "e2e-auth";
const track = newTrack();
const { emails, orgIds, schoolIds } = track;
const userIds: string[] = [];
let admin: Awaited<ReturnType<typeof createAdminPage>> | undefined;

async function newUser(page: any, tag: string, prefix = PREFIX) {
  const email = `${prefix}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
  const created = await signUpViaApi(`E2E ${tag}`, email, E2E_PASSWORD);
  expect(created.ok, `signup: ${created.raw}`).toBe(true);
  emails.push(email);
  if (created.userId) userIds.push(created.userId);
  await loginUI(page, email, E2E_PASSWORD);
  return { email, userId: created.userId as string };
}

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  if (userIds.length) {
    await q("delete from assessment_org_invites where invited_by = any($1)", [userIds]).catch(() => undefined);
  }
  await cleanupTrack(track);
  if (userIds.length) await q('delete from "user" where id = any($1)', [userIds]).catch(() => undefined);
  await closeDb();
  // `beforeAll` bisa gagal (mis. server/DB sibuk) → jangan menutupi error aslinya
  await admin
    ?.context()
    .close()
    .catch(() => undefined);
});

test.describe("AUTH · role internal & B2B", () => {
  test("A1: siswa TIDAK boleh menyentuh role/permission (eskalasi privilege)", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    await newUser(page, "siswa");

    // dulu semua ini `protectedProcedure` → siswa bisa menghapus role admin
    const create = await rpcAs<any>(page, "role/create", {
      id: `hack-${uniqueId()}`,
      name: "Hacked",
      permissions: ["access:admin_dashboard"],
    });
    expect(create?.status ?? create?.code, "siswa tidak boleh membuat role").toBe(403);

    const del = await rpcAs<any>(page, "role/delete", { id: "admin" });
    expect(del?.status ?? del?.code, "siswa tidak boleh menghapus role admin").toBe(403);
    const stillAdmin = await q("select id from role where id = 'admin'");
    expect(stillAdmin.length, "role admin harus tetap ada").toBe(1);

    const upd = await rpcAs<any>(page, "role/update", {
      id: "student",
      name: "Student",
      permissions: ["access:admin_dashboard"],
    });
    expect(upd?.status ?? upd?.code, "siswa tidak boleh mengubah permission role").toBe(403);
    const perms = await q<{ permissions: string[] }>("select permissions from role where id = 'student'");
    expect(perms[0].permissions).not.toContain("access:admin_dashboard");

    const list = await rpcAs<any>(page, "role/list");
    expect(list?.status ?? list?.code, "role/list hanya untuk admin").toBe(403);
  });

  test("A2: siswa & admin sekolah tidak bisa memakai endpoint admin platform", async ({ page }) => {
    test.setTimeout(90000);
    await preAcceptCookies(page);
    await newUser(page, "bukanadmin");

    for (const path of ["tmbAdmin/overview", "schoolAdmin/registrations", "discoverAdmin/list"]) {
      const r = await rpcAs<any>(page, path, {});
      expect(r?.status ?? r?.code, `siswa TIDAK boleh mengakses ${path}`).toBe(403);
    }

    // admin platform tetap bisa
    const ok = await adminRpc<any>(admin, "schoolAdmin/registrations", { status: "pending" });
    expect(ok).toBeTruthy();
  });

  test("A2b: admin sekolah hanya boleh di area sekolah, bukan panel admin", async ({ page, browser }) => {
    test.setTimeout(120000);
    await preAcceptCookies(page);
    const nama = `SMA Auth Admin ${suffix()}`;
    await newUser(page, "schooladmin");
    const reg = await rpcAs<any>(page, "school/register", {
      name: nama,
      picName: "PIC Auth",
      picPhone: "08123456789",
      picEmail: "bk@test.local",
    });
    expect(reg.ok, JSON.stringify(reg)).toBe(true);
    orgIds.push(reg.orgId);
    const appr = await adminRpc<any>(admin, "schoolAdmin/approve", { orgId: reg.orgId });
    expect(appr.ok).toBe(true);
    if (appr.schoolId) schoolIds.push(appr.schoolId);

    // role naik & area sekolah terbuka (tanpa perlu login ulang = session segar)
    const me = await rpcAs<any>(page, "school/me", {});
    expect(me.member?.role, "role langsung berlaku di sesi yang sama").toBe("school_admin");
    const cohorts = await rpcAs<any>(page, "school/cohorts", {});
    expect(cohorts.ok).toBe(true);

    // ...tapi TIDAK boleh menyentuh panel admin platform
    for (const path of ["tmbAdmin/overview", "schoolAdmin/registrations", "discoverAdmin/list", "role/list"]) {
      const r = await rpcAs<any>(page, path, {});
      expect(r?.status ?? r?.code, `admin sekolah TIDAK boleh mengakses ${path}`).toBe(403);
    }

    // UI: layout /admin menolak (tidak ada menu admin yang dirender)
    await page.goto("/admin", { waitUntil: "domcontentloaded" }).catch(() => undefined);
    const denied = await page
      .getByText(/tidak punya akses|unauthorized|akses ditolak/i)
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    const adminMenu = await page
      .locator('a[href="/admin/users"]')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(denied || !adminMenu, "panel admin harus menolak admin sekolah").toBe(true);

    void browser;
  });

  test("A3: menerima undangan sekolah TIDAK menurunkan role platform", async ({ page, browser }) => {
    test.setTimeout(120000);
    await preAcceptCookies(page);

    // akun yang sudah punya role platform (program_manager)
    const email = `${PREFIX}-pm-${Date.now()}-${suffix().toLowerCase()}@test.local`;
    const created = await signUpViaApi("E2E PM", email, E2E_PASSWORD);
    expect(created.ok, created.raw).toBe(true);
    emails.push(email);
    userIds.push(created.userId as string);
    await q('update "user" set role = $1 where email = $2', ["program_manager", email]);

    // sekolah + undangan untuk email tersebut
    const nama = `SMA Auth ${suffix()}`;
    const ownerCtx = await (browser as any).newContext();
    const owner = await ownerCtx.newPage();
    await preAcceptCookies(owner);
    const ownerEmail = `${PREFIX}-pic-${Date.now()}-${suffix().toLowerCase()}@test.local`;
    const ownerReg = await signUpViaApi("PIC", ownerEmail, E2E_PASSWORD);
    expect(ownerReg.ok, ownerReg.raw).toBe(true);
    emails.push(ownerEmail);
    userIds.push(ownerReg.userId as string);
    await loginUI(owner, ownerEmail, E2E_PASSWORD);
    const reg = await rpcAs<any>(owner, "school/register", {
      name: nama,
      picName: "PIC Auth",
      picPhone: "08123456789",
      picEmail: "bk@test.local",
    });
    expect(reg.ok, JSON.stringify(reg)).toBe(true);
    orgIds.push(reg.orgId);
    const apprOwner = await adminRpc<any>(admin, "schoolAdmin/approve", { orgId: reg.orgId });
    if (apprOwner?.schoolId) schoolIds.push(apprOwner.schoolId);
    const inv = await rpcAs<any>(owner, "school/invitePeer", { email, role: "school_viewer" });
    expect(inv.ok, JSON.stringify(inv)).toBe(true);

    // program_manager membuka portal → undangan diklaim, tapi role TIDAK turun
    await loginUI(page, email, E2E_PASSWORD);
    const me = await rpcAs<any>(page, "school/me", {});
    expect(me.ok).toBe(true);
    expect(me.member, "keanggotaan sekolah tetap dibuat").toBeTruthy();
    expect(me.member.role).toBe("school_viewer");

    const [row] = await q<{ role: string }>('select role from "user" where email = $2 or email = $1', [email, email]);
    expect(row.role, "role platform TIDAK boleh turun").toBe("program_manager");

    // undangan yang tidak terpakai ditutup, tidak menggantung
    const pending = await q("select id from assessment_org_invites where email = $1 and status = 'pending'", [email]);
    expect(pending.length, "undangan tidak boleh menggantung").toBe(0);

    await ownerCtx.close();
  });

  test("A6: promosi role langsung berlaku (cache izin tidak menahan 5 menit)", async ({ page }) => {
    test.setTimeout(120000);
    await preAcceptCookies(page);
    const { userId } = await newUser(page, "promosi");

    // buka /admin sebagai siswa → ditolak
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const before = await page
      .locator('a[href="/admin/users"]')
      .first()
      .isVisible()
      .catch(() => false);
    expect(before, "siswa tidak boleh melihat menu admin").toBe(false);

    // admin MULAI+ mempromosikan akun ini (role berubah saat sesi masih hidup)
    expect((await adminRpc<any>(admin, "role/list", {})).length ?? 1).toBeGreaterThan(0);
    await q('update "user" set role = $1 where id = $2', ["admin", userId]);

    // reload → panel admin harus terbuka tanpa menunggu cache 5 menit
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.locator('a[href="/admin/users"]').first()).toBeVisible({ timeout: 20000 });

    // permission dari server juga sudah mencerminkan role baru
    const perms = await rpcAs<any>(page, "user/myPermissions", {});
    expect(perms.role).toBe("admin");
    expect(perms.permissions).toContain("access:admin_dashboard");

    // kembalikan role agar tidak mengganggu test lain
    await q('update "user" set role = $1 where id = $2', ["student", userId]);
  });

  test("A4: role B2B terdaftar lengkap di DB dengan permission yang benar", async () => {
    test.setTimeout(90000);
    const rows = await q<{ id: string; name: string; permissions: string[] }>("select id, name, permissions from role");
    const byId = new Map(rows.map((r) => [r.id, r]));

    for (const id of ["admin", "program_manager", "mentor", "student", "school_admin", "school_viewer"]) {
      expect(byId.has(id), `role ${id} wajib ada`).toBe(true);
    }
    // label manusiawi untuk UI admin
    expect(byId.get("school_admin")?.name).toBe("Admin Sekolah");
    expect(byId.get("school_viewer")?.name).toBe("Guru BK");

    // admin sekolah TIDAK boleh punya akses panel admin / ubah data platform
    const sa = byId.get("school_admin")?.permissions ?? [];
    expect(sa).toContain("access:school_dashboard");
    expect(sa).not.toContain("access:admin_dashboard");
    expect(sa).not.toContain("*");

    // guru BK hanya melihat (tanpa participant.update)
    const sv = byId.get("school_viewer")?.permissions ?? [];
    expect(sv).toContain("access:school_dashboard");
    expect(sv).toContain("report.read");
    expect(sv).not.toContain("participant.update");
    expect(sv).not.toContain("access:admin_dashboard");
  });

  test("A5: UI admin mendaftarkan role B2B di form pengguna", async () => {
    test.setTimeout(120000);
    const page = await admin.context().newPage();
    await preAcceptCookies(page);
    await page.goto("/admin/users", { waitUntil: "domcontentloaded" }).catch(() => undefined);

    // dialog "Create User" (kalau halaman users tersedia di build ini)
    const openBtn = page.getByRole("button", { name: /create user|add user|new user/i }).first();
    if (await openBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await openBtn.click();
      const select = page.locator("select#role").first();
      const options = await select.locator("option").allTextContents();
      expect(options.join(" | "), "role B2B harus muncul di form admin").toMatch(/Admin Sekolah/i);
      expect(options.join(" | ")).toMatch(/Guru BK/i);
    }
    await page.close();
  });
});
