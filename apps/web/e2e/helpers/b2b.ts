// Helper bersama untuk spec B2B (sekolah) — menghapus duplikasi `rpcAs`, id unik,
// pendaftaran+approval sekolah, seeding sekolah/kelas/roster, dan teardown.
//
// Aturan yang dijaga helper ini:
//  • setiap nilai yang dibuat dilacak di `Track` supaya teardown tertarget
//    (tidak pernah `LIKE` ke data bisnis);
//  • urutan hapus mengikuti FK (results → roster/batch → sekolah → org → akun);
//  • tidak ada `waitForTimeout`; semua menunggu lewat assertion pemanggil.
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { adminRpc, signUpViaApi } from "./api";
import { E2E_PASSWORD, loginUI } from "./auth";
import { deleteAssessmentByCode, q } from "./db";
import { API_URL } from "./env";

/** RPC yang memakai cookie sesi browser (bukan sesi admin). */
export async function rpcAs<T = any>(page: Page, path: string, json: unknown = {}): Promise<T> {
  return page.evaluate(
    async (arg: { base: string; path: string; json: unknown }) => {
      const res = await fetch(`${arg.base}/rpc/${arg.path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ json: arg.json }),
      });
      const text = await res.text();
      if (!text) return { status: res.status, defined: false } as any;
      try {
        const body = JSON.parse(text) as { json?: unknown };
        // oRPC mengirim payload di `json`; error middleware mengirim objek error
        return (body?.json ?? (body as any)) as any;
      } catch {
        // respons bukan JSON (HTML/teks) → tetap beri status agar bisa di-assert
        return { status: res.status, raw: text.slice(0, 200) } as any;
      }
    },
    { base: API_URL, path, json },
  ) as Promise<T>;
}

/** Id unik per nilai uji (`e2e-<ts>-<rand>`); aman untuk 3 worker paralel. */
export function uniqueId(prefix = "e2e"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Suffix 4 huruf untuk nama sekolah/kelas agar tidak bentrok antar worker. */
export function suffix(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

/** Email akun uji — domain `@test.local` (dijamin tidak dikirimi email sungguhan). */
export function testEmail(prefix: string, tag: string): string {
  return `${prefix}-${tag}-${Date.now()}-${suffix().toLowerCase()}@test.local`;
}

/**
 * Semua yang dibuat satu spec, agar teardown bisa tertarget.
 * Bentuknya sederhana supaya bisa dideklarasikan sekali di top-level spec.
 */
export interface Track {
  orgIds: string[];
  schoolIds: string[];
  batchIds: string[];
  rosterIds: string[];
  resultIds: string[];
  studentIds: string[]; // studentId sintetis untuk sesi engine
  codes: string[]; // kode assessment uji (dibuat lewat fixtures)
  emails: string[];
}

export function newTrack(): Track {
  return {
    orgIds: [],
    schoolIds: [],
    batchIds: [],
    rosterIds: [],
    resultIds: [],
    studentIds: [],
    codes: [],
    emails: [],
  };
}

/** Buat akun (API) lalu login lewat UI; email otomatis dilacak. */
export async function signUpAndLogin(
  page: Page,
  track: Track,
  opts: { name: string; email?: string; prefix: string; tag: string },
): Promise<{ email: string; userId: string | null }> {
  const email = opts.email ?? testEmail(opts.prefix, opts.tag);
  const created = await signUpViaApi(opts.name, email, E2E_PASSWORD);
  expect(created.ok, `signup gagal (${email}): ${created.raw}`).toBe(true);
  track.emails.push(email);
  await loginUI(page, email, E2E_PASSWORD);
  return { email, userId: created.userId ?? null };
}

/** Daftarkan sekolah lewat API (status pending). */
export async function registerSchool(
  page: Page,
  track: Track,
  opts: { name: string; picName?: string; picPhone?: string; picEmail?: string; ref?: string },
): Promise<{ ok: boolean; orgId?: string; error?: string }> {
  const r = await rpcAs<any>(page, "school/register", {
    name: opts.name,
    picName: opts.picName ?? "Budi BK",
    picPhone: opts.picPhone ?? "08123456789",
    picEmail: opts.picEmail ?? "bk@test.local",
    ...(opts.ref ? { ref: opts.ref } : {}),
  });
  if (r?.ok && r.orgId) track.orgIds.push(r.orgId);
  return r;
}

/**
 * Setujui pendaftaran dari admin MULAI+.
 * Sekolah legacy yang DIBUAT OTOMATIS dicatat ke track agar teardown bersih.
 */
export async function approveSchool(admin: Page, track: Track, orgId: string): Promise<any> {
  const appr = await adminRpc<any>(admin, "schoolAdmin/approve", { orgId });
  if (appr?.schoolId) track.schoolIds.push(appr.schoolId);
  return appr;
}

/** Seed baris `tmb_schools` langsung (jalur cepat untuk data awal). */
export async function seedTmbSchool(track: Track, name: string): Promise<string> {
  const id = uniqueId();
  track.schoolIds.push(id);
  await q("insert into tmb_schools (id, name, status) values ($1,$2,'aktif')", [id, name]);
  return id;
}

export interface SeedBatchOptions {
  schoolId: string;
  name?: string;
  className?: string;
  major?: string;
  graduationYear?: number;
  /** jadwal: `scheduled` + window relatif terhadap sekarang (jam). */
  windowStartHours?: number;
  windowEndHours?: number;
}

/** Seed satu kelas (batch) milik sekolah. */
export async function seedBatch(track: Track, opts: SeedBatchOptions): Promise<string> {
  const id = uniqueId();
  track.batchIds.push(id);
  const scheduled = opts.windowStartHours !== undefined || opts.windowEndHours !== undefined;
  const start = opts.windowStartHours !== undefined ? new Date(Date.now() + opts.windowStartHours * 3600_000) : null;
  const end = opts.windowEndHours !== undefined ? new Date(Date.now() + opts.windowEndHours * 3600_000) : null;
  await q(
    `insert into tmb_batches (id, school_id, name, class_name, major, invite_code, graduation_year, schedule_mode, window_start, window_end)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      id,
      opts.schoolId,
      opts.name ?? opts.className ?? "XII E2E",
      opts.className ?? "XII E2E",
      opts.major ?? "IPA",
      `E2E${suffix()}`,
      opts.graduationYear ?? null,
      scheduled ? "scheduled" : "anytime",
      start,
      end,
    ],
  );
  return id;
}

export interface SeedRosterOptions {
  name: string;
  email?: string | null;
  nis?: string | null;
  status?: "invited" | "in_progress" | "completed";
  userId?: string | null;
  resultId?: string | null;
}

/** Seed peserta (roster) di satu kelas. */
export async function seedRoster(track: Track, batchId: string, opts: SeedRosterOptions): Promise<string> {
  const id = uniqueId();
  track.rosterIds.push(id);
  await q(
    `insert into tmb_batch_students (id, batch_id, name, email, nis, status, user_id, result_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id,
      batchId,
      opts.name,
      opts.email ?? null,
      opts.nis ?? null,
      opts.status ?? "invited",
      opts.userId ?? null,
      opts.resultId ?? null,
    ],
  );
  return id;
}

export interface SeedResultOptions {
  hollandCode?: string;
  hollandScores?: Record<string, number>;
  ability?: Record<string, { correct: number; total: number }>;
  confidence?: number | string;
  differentiation?: string;
  /** Rekomendasi jurusan/karier berurutan sesuai rank. */
  majors?: string[];
  careers?: string[];
}

/** Seed hasil tes (+ rekomendasi) untuk satu peserta. */
export async function seedResult(track: Track, opts: SeedResultOptions = {}): Promise<string> {
  const id = uniqueId();
  track.resultIds.push(id);
  await q(
    `insert into tmb_assessment_results (id, user_id, holland_code, holland_scores, ability_scores, confidence_score, differentiation)
     values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7)`,
    [
      id,
      `e2e-result-${id}`,
      opts.hollandCode ?? "RIA",
      JSON.stringify(opts.hollandScores ?? { R: 5, I: 4, A: 3, S: 1, E: 0, C: 0 }),
      JSON.stringify({ scores: opts.ability ?? { verbal: { correct: 3, total: 4 } } }),
      String(opts.confidence ?? 80),
      opts.differentiation ?? "clear",
    ],
  );
  let rank = 1;
  for (const m of opts.majors ?? []) {
    await q("insert into tmb_recommendations (id, result_id, type, rank, item_name) values ($1,$2,'major',$3,$4)", [
      uniqueId(),
      id,
      rank++,
      m,
    ]);
  }
  let cRank = 1;
  for (const c of opts.careers ?? []) {
    await q("insert into tmb_recommendations (id, result_id, type, rank, item_name) values ($1,$2,'career',$3,$4)", [
      uniqueId(),
      id,
      cRank++,
      c,
    ]);
  }
  return id;
}

/**
 * Teardown tertarget: hanya baris yang dilacak `track` (tidak memakai pola LIKE).
 * Urutan mengikuti FK; tiap langkah dibungkus catch agar satu kegagalan tidak
 * menyisakan langkah lain (kegagalan dicatat ke console untuk audit).
 */
export async function cleanupTrack(track: Track): Promise<void> {
  const safe = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e: any) {
      console.warn(`[e2e cleanup] ${label} gagal: ${e?.message ?? e}`);
    }
  };

  if (track.orgIds.length || track.schoolIds.length) {
    await safe("cohort reports", () =>
      q(
        `delete from assessment_cohort_reports
         where org_id = any($1) or school_id = any($2)`,
        [track.orgIds, track.schoolIds],
      ),
    );
  }
  if (track.codes.length) {
    for (const code of track.codes) {
      await safe(`assessment ${code}`, () => deleteAssessmentByCode(code));
    }
  }
  if (track.resultIds.length) {
    await safe("recommendations", () =>
      q("delete from tmb_recommendations where result_id = any($1)", [track.resultIds]),
    );
    await safe("results", () => q("delete from tmb_assessment_results where id = any($1)", [track.resultIds]));
  }
  if (track.studentIds.length) {
    await safe("sessions", () => q("delete from assessment_sessions where student_id = any($1)", [track.studentIds]));
  }
  if (track.rosterIds.length) {
    await safe("roster", () => q("delete from tmb_batch_students where id = any($1)", [track.rosterIds]));
  }
  if (track.batchIds.length) {
    await safe("batches", () => q("delete from tmb_batches where id = any($1)", [track.batchIds]));
  }
  if (track.schoolIds.length) {
    // batch milik sekolah uji (mis. dari `school.cohortCreate`) ikut dibersihkan
    await safe("batches by school", () => q("delete from tmb_batches where school_id = any($1)", [track.schoolIds]));
  }
  if (track.orgIds.length) {
    await safe("orgs", () => q("delete from assessment_orgs where id = any($1)", [track.orgIds]));
  }
  if (track.schoolIds.length) {
    await safe("schools", () => q("delete from tmb_schools where id = any($1)", [track.schoolIds]));
  }
  if (track.emails.length) {
    await safe("users", () => q('delete from "user" where email = any($1)', [track.emails]));
  }
}

/** Baca state satu baris roster (untuk assertion yang butuh DB langsung). */
export async function rosterOf(
  id: string,
): Promise<{ status: string; userId: string | null; resultId: string | null }> {
  const [row] = await q<{ status: string; user_id: string | null; result_id: string | null }>(
    "select status, user_id, result_id from tmb_batch_students where id = $1",
    [id],
  );
  return { status: row?.status ?? "", userId: row?.user_id ?? null, resultId: row?.result_id ?? null };
}
