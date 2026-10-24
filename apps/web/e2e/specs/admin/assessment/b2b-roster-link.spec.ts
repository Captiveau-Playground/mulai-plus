// E2E B2B — M0 "Integritas data": hasil tes HARUS kembali ke roster sekolah.
//
// Regresi yang dijaga:
//  1. siswa yang mulai mengerjakan → roster jadi "in_progress" (guru bisa pantau)
//  2. selesai tes → roster otomatis "completed" + tertaut ke hasil TERBARU
//     (dulu tautan hanya ditulis engine lama yang tidak lagi dipakai → rekap kosong)
//  3. siswa yang sudah tes SEBELUM klaim undangan → ditautkan lewat backfill
//  4. status "completed" tanpa hasil (data tidak konsisten) → direset ke "invited"
//  5. rekap (exportRekap) memuat skor per dimensi, tanggal selesai & durasi
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, saveQuestion } from "../../../fixtures/assessment";
import { createAdminPage } from "../../../helpers/admin-ui";
import { adminRpc, rpc } from "../../../helpers/api";
import { closeDb, deleteAssessmentByCode, q } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EB2B";
const codes: string[] = [];
const schoolIds: string[] = [];
const studentIds: string[] = []; // siswa sintetis yang dibuat spec ini (untuk cleanup tertarget)
let admin: Page;
let fxMinat: { code: string; versionId: string };
let fxBakat: { code: string; versionId: string };

const sid = (tag: string) => {
  const id = `e2e-b2b-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  studentIds.push(id);
  return id;
};
const rid = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Assessment 1 dimensi + 1 soal PG. **Tidak** dirilis: gate hanya mengizinkan satu tes
 * minat/bakat LIVE untuk B2C, sedangkan alur B2B yang diuji cukup lewat versi draft
 * (start/finish selalu dipanggil dengan `versionId`). */
async function buildAssessment(page: Page, family: "minat" | "bakat", dimCode: string) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(page, { code, name: `B2B ${code}`, family });
  const dim = await addDimension(page, versionId, dimCode, `Dimensi ${dimCode}`);
  await configUpdate(page, versionId, {
    total_dim: 1,
    result_dim_count: 1,
    min_q_per_dim: 1,
    section_mode: "none",
    scoring_method: "sum",
  });
  await saveQuestion(page, versionId, {
    dimensionId: dim,
    questionText: "Soal M0",
    questionType: "multiple_choice",
    options: [
      { optionValue: "A", label: "Benar", score: 1 },
      { optionValue: "B", label: "Salah", score: 0 },
    ],
  });
  return { code, versionId };
}

/** Jalankan satu tes sampai selesai, kembalikan hasilnya. */
async function runTest(fx: { code: string; versionId: string }, studentId: string) {
  const cfg = await rpc<{ questions: any[] }>("discover/config", { code: fx.code, versionId: fx.versionId });
  const st = await rpc<any>("discover/start", { code: fx.code, studentId, versionId: fx.versionId });
  for (const question of cfg.questions) {
    const o = question.opts?.[0];
    if (o) await rpc("discover/submit", { sessionId: st.sessionId, questionId: question.id, optionId: o.id });
  }
  const fin = await rpc<any>("discover/finish", { sessionId: st.sessionId });
  expect(fin.ok, `finish harus ok: ${JSON.stringify(fin)}`).toBe(true);
  return { sessionId: st.sessionId as string, resultId: fin.resultId as string };
}

/** Buat sekolah + batch + roster lewat DB (cepat, tidak tergantung UI admin). */
async function seedRoster(opts: { name: string; userId?: string | null; status?: string; resultId?: string | null }) {
  const schoolId = rid();
  const batchId = rid();
  const rosterId = rid();
  schoolIds.push(schoolId);
  await q("insert into tmb_schools (id, name, status) values ($1, $2, 'aktif')", [schoolId, "Sekolah E2E B2B"]);
  await q(
    "insert into tmb_batches (id, school_id, name, class_name, major, invite_code) values ($1,$2,$3,'XII IPA 1','IPA',$4)",
    [batchId, schoolId, "Batch E2E", `E2E${Math.random().toString(36).slice(2, 7).toUpperCase()}`],
  );
  await q(
    `insert into tmb_batch_students (id, batch_id, name, email, status, user_id, result_id)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      rosterId,
      batchId,
      opts.name,
      `${rosterId}@test.local`,
      opts.status ?? "invited",
      opts.userId ?? null,
      opts.resultId ?? null,
    ],
  );
  return { schoolId, batchId, rosterId };
}

async function rosterOf(rosterId: string) {
  const rows = await q<{ status: string; result_id: string | null }>(
    "select status, result_id from tmb_batch_students where id = $1",
    [rosterId],
  );
  return rows[0]!;
}

/**
 * id hasil di pipeline LEGACY (`tmb_assessment_results`) — inilah yang ditautkan ke roster
 * dan dipakai halaman hasil/rekap. (`finish` mengembalikan id hasil ENGINE, beda baris.)
 */
async function legacyResultIdOf(userId: string) {
  const rows = await q<{ id: string }>(
    "select id from tmb_assessment_results where user_id = $1 order by created_at desc limit 1",
    [userId],
  );
  return rows[0]?.id ?? null;
}

const backfill = (batchId: string) => adminRpc<any>(admin, "tmbAdmin/students/backfillRosterLinks", { batchId });

test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
  fxMinat = await buildAssessment(admin, "minat", "R");
  fxBakat = await buildAssessment(admin, "bakat", "VERBAL");
});

test.afterAll(async () => {
  if (schoolIds.length) {
    await q("delete from tmb_batches where school_id = any($1)", [schoolIds]).catch(() => undefined);
  }
  if (schoolIds.length) {
    await q("delete from tmb_batches where school_id = any($1)", [schoolIds]).catch(() => undefined);
  }
  for (const id of schoolIds) await q("delete from tmb_schools where id = $1", [id]).catch(() => undefined);
  for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
  // bersihkan hasil percobaan — HANYA siswa yang dibuat spec ini (test paralel!)
  if (studentIds.length) {
    await q(
      "delete from tmb_recommendations where result_id in (select id from tmb_assessment_results where user_id = any($1))",
      [studentIds],
    ).catch(() => undefined);
    await q("delete from tmb_assessment_results where user_id = any($1)", [studentIds]).catch(() => undefined);
  }
  await closeDb();
  await admin.context().close();
});

test.describe("B2B · hasil tes kembali ke roster sekolah", () => {
  test("mulai tes → roster 'in_progress'; selesai → 'completed' + tertaut hasil terbaru", async () => {
    test.setTimeout(180000);
    const student = sid("auto");
    const { batchId, rosterId } = await seedRoster({ name: "Siswa Auto", userId: student });
    expect((await rosterOf(rosterId)).status).toBe("invited");

    // mulai sesi → status roster berubah
    const cfg = await rpc<{ questions: any[] }>("discover/config", {
      code: fxMinat.code,
      versionId: fxMinat.versionId,
    });
    const st = await rpc<any>("discover/start", {
      code: fxMinat.code,
      studentId: student,
      versionId: fxMinat.versionId,
    });
    await expect.poll(async () => (await rosterOf(rosterId)).status, { timeout: 15000 }).toBe("in_progress");

    // selesaikan tes
    for (const question of cfg.questions) {
      const o = question.opts?.[0];
      if (o) await rpc("discover/submit", { sessionId: st.sessionId, questionId: question.id, optionId: o.id });
    }
    const fin = await rpc<any>("discover/finish", { sessionId: st.sessionId });
    expect(fin.ok).toBe(true);

    const after = await rosterOf(rosterId);
    expect(after.status).toBe("completed");
    expect(after.result_id, "roster harus tertaut ke hasil pipeline legacy").toBe(await legacyResultIdOf(student));

    // backfill tidak mengubah apa pun (sudah benar)
    const bf = await backfill(batchId);
    expect(bf.sudahBenar).toBeGreaterThanOrEqual(1);
    expect(bf.ditautkan).toBe(0);
  });

  test("siswa yang tes SEBELUM klaim undangan ditautkan lewat backfill", async () => {
    test.setTimeout(180000);
    const student = sid("telat");
    // tes dulu (belum ada roster)
    await runTest(fxMinat, student);
    const expected = await legacyResultIdOf(student);
    expect(expected, "hasil legacy harus terbentuk setelah finish").toBeTruthy();

    // baru dibuatkan roster + diklaim
    const { batchId, rosterId } = await seedRoster({ name: "Siswa Telat", userId: student, status: "invited" });
    expect((await rosterOf(rosterId)).result_id).toBeNull();

    const bf = await backfill(batchId);
    expect(bf.ditautkan).toBe(1);

    const after = await rosterOf(rosterId);
    expect(after.result_id).toBe(expected);
    expect(after.status).toBe("completed");
  });

  test("status 'completed' tanpa hasil sama sekali → direset ke 'invited'", async () => {
    test.setTimeout(180000);
    const { batchId, rosterId } = await seedRoster({
      name: "Siswa Konsisten",
      userId: sid("kosong"),
      status: "completed",
    });
    const bf = await backfill(batchId);
    expect(bf.direset).toBeGreaterThanOrEqual(1);
    expect((await rosterOf(rosterId)).status).toBe("invited");
  });

  test("rekap memuat skor per dimensi, tanggal selesai & durasi", async () => {
    test.setTimeout(180000);
    const studentBakat = sid("bakat");
    const seeded = await seedRoster({ name: "Siswa Bakat", userId: studentBakat });
    await runTest(fxBakat, studentBakat);

    const rekap = await adminRpc<any>(admin, "tmbAdmin/students/exportRekap", { batchId: seeded.batchId });
    const row = (rekap.rows ?? []).find((r: any) => r.nama === "Siswa Bakat");
    expect(row, "baris rekap harus ada").toBeTruthy();
    expect(row.status).toBe("completed");
    expect(row.kelas).toBe("XII IPA 1");
    expect(row.jurusan).toBe("IPA");
    // skor kemampuan per dimensi (bakat → dimensi "verbal")
    expect(row.verbal, "skor dimensi verbal harus terisi").toBe("1/1");
    expect(row.numerical).toBe("");
    expect(row.selesai, "tanggal selesai harus terisi").not.toBe("");
    expect(row.jumlahTimeout).toBe(0);
    // kolom Holland tetap ada (kosong untuk tes bakat)
    expect(row.hollandCode).toBe("");
    expect(row).toHaveProperty("durasiDetik");
  });
});
