// E2E AUTH — assessment B2C: identitas pengerja tes TIDAK bisa dipalsukan.
//
// Sebelumnya semua endpoint `discover.*` adalah `publicProcedure` yang menerima
// `studentId`/`sessionId` mentah dari klien:
//   • siapa pun bisa `start({studentId: orangLain})` → mengerjakan tes atas nama orang lain,
//   • siapa pun bisa membaca `resultsFor/attempts/session` milik orang lain (data pribadi),
//   • siapa pun yang tahu `sessionId` bisa submit/finish sesi orang lain.
// Sekarang identitas diambil dari sesi login; klien hanya boleh memakai id sendiri
// (atau id `preview-*` untuk mode preview editor).
import { expect, test } from "@playwright/test";
import { preAcceptCookies } from "../../../helpers/auth";
import { cleanupTrack, newTrack, rpcAs, signUpAndLogin, uniqueId } from "../../../helpers/b2b";
import { closeDb } from "../../../helpers/db";

const PREFIX = "e2e-take";
const track = newTrack();

test.afterAll(async () => {
  // sesi/attempt yang dibuat lewat jalur sah tetap dibersihkan lewat id siswa
  await cleanupTrack(track);
  await closeDb();
});

test.describe("AUTH · assessment B2C (identitas pengerja)", () => {
  test("S1: siswa tidak bisa memulai/membaca tes atas nama siswa lain", async ({ page, browser }) => {
    test.setTimeout(120000);
    await preAcceptCookies(page);

    // dua akun siswa nyata
    const a = await signUpAndLogin(page, track, {
      name: "Siswa A",
      email: `${PREFIX}-a-${uniqueId()}@test.local`,
      prefix: PREFIX,
      tag: "a",
    });
    const ctxB = await (page.context().browser() as any).newContext();
    const pageB = await ctxB.newPage();
    await preAcceptCookies(pageB);
    const b = await signUpAndLogin(pageB, track, {
      name: "Siswa B",
      email: `${PREFIX}-b-${uniqueId()}@test.local`,
      prefix: PREFIX,
      tag: "b",
    });

    // A mencoba memakai identitas B
    const startAsB = await rpcAs<any>(page, "discover/start", { code: "TALENT", studentId: b.userId });
    expect(startAsB?.ok, "start atas nama orang lain harus ditolak").toBe(false);
    expect(startAsB.error).toBe("identity_mismatch");

    const resB = await rpcAs<any>(page, "discover/resultsFor", { code: "DISCOVER", studentId: b.userId });
    expect(resB?.ok, "membaca hasil orang lain harus ditolak").toBe(false);
    expect(resB.error).toBe("identity_mismatch");

    const attB = await rpcAs<any>(page, "discover/attempts", { studentId: b.userId });
    expect(attB?.ok, "membaca attempt orang lain harus ditolak").toBe(false);
    expect(attB.error).toBe("identity_mismatch");

    // ...dan identitas sendiri tetap boleh
    const own = await rpcAs<any>(page, "discover/attempts", { studentId: a.userId });
    expect(own?.ok ?? Array.isArray(own?.items ?? own), "membaca attempt sendiri boleh").toBeTruthy();

    await ctxB.close();
  });

  test("S2: sesi milik orang lain tidak bisa dibaca/diubah lewat sessionId", async ({ page, browser }) => {
    test.setTimeout(120000);
    await preAcceptCookies(page);

    // A memulai tes (jalur sah, identitas sendiri)
    const a = await signUpAndLogin(page, track, {
      name: "Siswa A2",
      email: `${PREFIX}-a2-${uniqueId()}@test.local`,
      prefix: PREFIX,
      tag: "a2",
    });
    const start = await rpcAs<any>(page, "discover/start", { code: "TALENT", studentId: a.userId });
    expect(start?.ok, `start sendiri harus sukses: ${JSON.stringify(start)}`).toBe(true);
    const sessionId = start.sessionId as string;
    expect(sessionId).toBeTruthy();

    // B (akun lain) mencoba membaca & mengubah sesi A
    const ctxB = await (page.context().browser() as any).newContext();
    const pageB = await ctxB.newPage();
    await preAcceptCookies(pageB);
    const b = await signUpAndLogin(pageB, track, {
      name: "Siswa B2",
      email: `${PREFIX}-b2-${uniqueId()}@test.local`,
      prefix: PREFIX,
      tag: "b2",
    });
    expect(b.userId).toBeTruthy();

    const read = await rpcAs<any>(pageB, "discover/session", { sessionId });
    expect(read?.ok, "membaca sesi orang lain harus ditolak").toBe(false);
    expect(read.error).toBe("forbidden");

    const submit = await rpcAs<any>(pageB, "discover/submit", {
      sessionId,
      questionId: "apa-saja",
      optionId: "apa-saja",
    });
    expect(submit?.ok, "submit ke sesi orang lain harus ditolak").toBe(false);
    expect(submit.error).toBe("forbidden");

    const fin = await rpcAs<any>(pageB, "discover/finish", { sessionId });
    expect(fin?.ok, "finish sesi orang lain harus ditolak").toBe(false);
    expect(fin.error).toBe("forbidden");

    // pemilik tetap bisa membaca sesinya
    const ownRead = await rpcAs<any>(page, "discover/session", { sessionId });
    expect(ownRead?.ok, "pemilik sesi tetap boleh membaca").toBe(true);

    await ctxB.close();
  });

  test("S3: mode preview (id preview-*) tetap jalan untuk editor", async ({ page }) => {
    test.setTimeout(120000);
    await preAcceptCookies(page);
    // `page.evaluate` butuh origin nyata (bukan about:blank) agar fetch cross-origin diproses
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // preview dipakai iframe editor; id preview tidak menyimpan hasil nyata
    const previewId = `preview-${uniqueId()}`;
    const st = await rpcAs<any>(page, "discover/start", { code: "TALENT", studentId: previewId });
    expect(st?.ok, `mode preview harus tetap bisa: ${JSON.stringify(st)}`).toBe(true);
    expect(st.sessionId).toBeTruthy();
  });
});
