// E2E M5.1 — notifikasi in-app + dedupe:
//  • sekolah disetujui → PIC dapat notifikasi
//  • pengingat kelas (jadwal ≤3 hari, peserta tertinggal) → notifikasi admin sekolah, tidak dobel
//  • kelas 100% selesai → notifikasi admin sekolah
import { expect, test } from "@playwright/test";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, signUpViaApi } from "../../../helpers/api";
import { E2E_PASSWORD, loginUI, preAcceptCookies } from "../../../helpers/auth";
import { closeDb, q } from "../../../helpers/db";
import { API_URL } from "../../../helpers/env";

const PREFIX = "e2e-notif";
const orgIds: string[] = [];
const schoolIds: string[] = [];
const emails: string[] = [];
const userIds: string[] = [];

const rid = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

/** Sekolah (menunggu approval) + kelas dengan jadwal berakhir 2 hari lagi. */
async function seedSchoolWithSchedule(name: string) {
  const schoolId = rid();
  const batchId = rid();
  schoolIds.push(schoolId);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [schoolId, name]);
  const start = new Date(Date.now() - 86400000).toISOString();
  const end = new Date(Date.now() + 2 * 86400000).toISOString();
  await q(
    `insert into tmb_batches (id, school_id, name, class_name, major, invite_code, schedule_mode, window_start, window_end)
     values ($1,$2,'XII NOTIF','XII NOTIF','IPA',$3,'scheduled',$4,$5)`,
    [batchId, schoolId, `E2E${suffix()}`, start, end],
  );
  await q(
    "insert into tmb_batch_students (id, batch_id, name, email, status) values ($1,$2,'Belum Mulai','a@test.local','invited')",
    [rid(), batchId],
  );
  return { schoolId, batchId };
}

test.afterAll(async () => {
  for (const id of orgIds) await q("delete from assessment_orgs where id = $1", [id]).catch(() => undefined);
  for (const id of schoolIds) await q("delete from tmb_schools where id = $1", [id]).catch(() => undefined);
  if (userIds.length) await q("delete from notification where user_id = any($1)", [userIds]).catch(() => undefined);
  if (emails.length) await q('delete from "user" where email = any($1)', [emails]).catch(() => undefined);
  await closeDb();
});

test.describe("M5.1 · notifikasi otomatis", () => {
  test("persetujuan sekolah & pengingat kelas masuk ke notifikasi PIC (tanpa dobel)", async ({ page, browser }) => {
    test.setTimeout(300000);
    const admin = await createAdminPage(browser);
    await preAcceptCookies(page);

    const nama = `SMA Notif ${suffix()}`;
    const fx = await seedSchoolWithSchedule(nama);

    // PIC mendaftar
    const email = `${PREFIX}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
    const created = await signUpViaApi("PIC Notif", email, E2E_PASSWORD);
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

    const [u] = await q('select id from "user" where email = $1', [email]);
    userIds.push(u.id);

    // sebelum approve: belum ada notifikasi "sudah aktif"
    expect(await q("select id from notification where dedupe_key = $1", [`school-approved:${reg.orgId}`])).toHaveLength(
      0,
    );

    // approve → notifikasi masuk
    expect((await adminRpc<any>(admin, "schoolAdmin/approve", { orgId: reg.orgId })).ok).toBe(true);
    const approved = await q("select title, type from notification where dedupe_key = $1", [
      `school-approved:${reg.orgId}`,
    ]);
    expect(approved).toHaveLength(1);
    expect(approved[0].type).toBe("success");

    // PIC melihat notifikasi lewat API (yang dipakai lonceng)
    const list = await rpcAs<any>(page, "notification/list", {});
    const items: any[] = Array.isArray(list) ? list : (list?.items ?? list?.data ?? []);
    expect(items.some((n: any) => /sudah aktif/i.test(n.title ?? ""))).toBe(true);

    // roda pengingat: kelas berakhir ≤3 hari & 1 peserta tertinggal
    const run1 = await adminRpc<any>(admin, "schoolAdmin/runReminders", { windowDays: 3 });
    expect(run1.ok, JSON.stringify(run1)).toBe(true);
    expect(run1.notified).toBeGreaterThanOrEqual(1);
    const reminderKey = `batch-reminder:${fx.batchId}:`;
    const rem1 = await q("select id from notification where dedupe_key like $1", [`${reminderKey}%`]);
    expect(rem1.length).toBe(1);

    // jalankan lagi → dedupe (tidak menambah baris)
    await adminRpc<any>(admin, "schoolAdmin/runReminders", { windowDays: 3 });
    const rem2 = await q("select id from notification where dedupe_key like $1", [`${reminderKey}%`]);
    expect(rem2.length).toBe(1);

    // kelas 100% selesai → notifikasi "100% selesai" (idempoten)
    await q("update tmb_batch_students set status = 'completed' where batch_id = $1", [fx.batchId]);
    const done1 = await adminRpc<any>(admin, "schoolAdmin/notifyBatchComplete", { batchId: fx.batchId });
    expect(done1.ok).toBe(true);
    expect(done1.completed).toBe(true);
    expect(done1.notified).toBe(1);
    const done2 = await adminRpc<any>(admin, "schoolAdmin/notifyBatchComplete", { batchId: fx.batchId });
    expect(done2.notified).toBe(0);
    const doneRows = await q("select title from notification where dedupe_key like $1", [
      `batch-complete:${fx.batchId}%`,
    ]);
    expect(doneRows.length).toBe(1);
    expect(doneRows[0].title).toMatch(/100% selesai/i);

    await admin.context().close();
  });
});
