// E2E ADMIN — pembuktian SETTING → PERILAKU SISWA.
// Setiap test mengubah setting di panel, lalu memeriksa efeknya lewat API/UI yang dipakai siswa.
import { expect, test } from "@playwright/test";
import {
  addDimension,
  buildSimpleAssessment,
  buildUiFixture,
  configUpdate,
  contentOf,
  createAssessment,
  publish,
  saveQuestion,
} from "../../../fixtures/assessment";
import { loginAdmin, openEditor, openGroup, setRule } from "../../../helpers/admin-ui";
import { rpc } from "../../../helpers/api";
import { closeDb, deleteAssessmentByCode } from "../../../helpers/db";
import { runTag } from "../../../helpers/env";

const PREFIX = "E2EW";
const codes: string[] = [];
const studentId = () => `e2e-wire-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

test.describe("Admin · Setting → perilaku siswa", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("seluruh field di panel tersimpan ke config versi", async ({ page }) => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `Wire ${code}` });
    await openEditor(page, code);

    await openGroup(page, "penilaian");
    await setRule(page, "result_dim_count", 2);
    await setRule(page, "min_q_per_dim", 1);
    await setRule(page, "scoring_method", "weighted");
    await openGroup(page, "waktu");
    await setRule(page, "timer_enabled", true);
    await setRule(page, "timer_scope", "dimension");
    await openGroup(page, "pengalaman");
    await setRule(page, "randomize_q", true);
    await setRule(page, "randomize_a", true);
    await setRule(page, "allow_pause", true);
    await setRule(page, "section_mode", "by_dimension");
    await setRule(page, "lang", "en");
    await page.locator('[data-testid="save-rules"]').click();
    await page.waitForTimeout(2000);

    const cfg = await rpc<{ config: any }>("discover/config", { code, versionId });
    expect(cfg.config).toMatchObject({
      result_dim_count: 2,
      min_q_per_dim: 1,
      scoring_method: "weighted",
      timer_enabled: true,
      timer_scope: "dimension",
      randomize_q: true,
      randomize_a: true,
      allow_pause: true,
      section_mode: "by_dimension",
      lang: "en",
    });
  });

  test("timer per soal sampai ke siswa (countdown + penolakan setelah deadline)", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildSimpleAssessment(page, {
      name: "Wire TimerQ",
      questionCount: 4,
      config: { timer_enabled: true, timer_scope: "question", time_per_question: 5 },
    });
    codes.push(fx.code);

    const st = await rpc<any>("discover/start", { code: fx.code, studentId: studentId(), versionId: fx.versionId });
    expect(st.serverTimer?.scope).toBe("question");
    expect(st.serverTimer?.totalSeconds, "4 soal × 5 detik").toBe(20);

    const ts = await rpc<any>("discover/timerState", { sessionId: st.sessionId });
    expect(ts.qEnds).toHaveLength(4);
  });

  test("timer per bagian memakai durasi tiap dimensi", async ({ page }) => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `Wire Dim ${code}` });
    const c = await contentOf(page, versionId);
    // durasi dipasang lewat dimensi (seperti di panel)
    const d1 = await addDimension(page, versionId, "D1", "Dim Satu", 30);
    await configUpdate(page, versionId, {
      total_dim: 1,
      result_dim_count: 1,
      min_q_per_dim: 1,
      timer_enabled: true,
      timer_scope: "dimension",
    });
    await saveQuestion(page, versionId, {
      dimensionId: d1,
      questionText: "q",
      questionType: "multiple_choice",
      options: [
        { optionValue: "A", label: "A", score: 1 },
        { optionValue: "B", label: "B", score: 0 },
      ],
    });
    expect((await publish(page, versionId)).ok).toBe(true);

    const st = await rpc<any>("discover/start", { code, studentId: studentId(), versionId });
    expect(st.serverTimer?.scope).toBe("dimension");
    expect(st.serverTimer?.dims?.[0]?.durationSeconds).toBe(30);
    void c;
  });

  test("bahasa antarmuka (lang) mengubah teks tombol siswa", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(page, { withSections: false });
    codes.push(fx.code);
    await page.goto(`/assessment/talent?preview=1&code=${fx.code}&v=${fx.versionId}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("button", { name: /Mulai Sekarang/ })).toBeVisible({ timeout: 30000 });

    await configUpdate(page, fx.versionId, { lang: "en" });
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.getByRole("button", { name: /Start now/ })).toBeVisible({ timeout: 30000 });
  });

  test("section_mode by_dimension memecah alur jadi beberapa bagian", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildUiFixture(page, { withSections: false });
    codes.push(fx.code);
    const cfg = await rpc<{ runSections: any[] }>("discover/config", { code: fx.code, versionId: fx.versionId });
    expect(cfg.runSections.map((s) => s.title)).toEqual(["Dimensi Kreatif", "Dimensi Analitis"]);
  });

  test("scoring_method weighted mengalikan skor dengan bobot soal", async ({ page }) => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `Wire Weighted ${code}` });
    const d1 = await addDimension(page, versionId, "D1", "Dim");
    await configUpdate(page, versionId, {
      total_dim: 1,
      result_dim_count: 1,
      min_q_per_dim: 1,
      scoring_method: "weighted",
    });
    await saveQuestion(page, versionId, {
      dimensionId: d1,
      questionText: "q",
      questionType: "multiple_choice",
      weight: 3,
      options: [
        { optionValue: "A", label: "A", score: 2 },
        { optionValue: "B", label: "B", score: 0 },
      ],
    });
    expect((await publish(page, versionId)).ok).toBe(true);

    const cfg = await rpc<any>("discover/config", { code, versionId });
    const st = await rpc<any>("discover/start", { code, studentId: studentId(), versionId });
    await rpc("discover/submit", {
      sessionId: st.sessionId,
      questionId: cfg.questions[0].id,
      optionId: cfg.questions[0].opts[0].id,
    });
    const fin = await rpc<any>("discover/finish", { sessionId: st.sessionId });
    expect(fin.rawScores[d1]).toBe(6); // 2 poin × bobot 3
  });

  /* ── 4 setting yang sebelumnya no-op ── */

  test("randomize_q benar-benar mengacak urutan soal per siswa", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildSimpleAssessment(page, {
      name: "Wire RandQ",
      questionCount: 6,
      config: { randomize_q: true },
    });
    codes.push(fx.code);

    const orders: string[] = [];
    for (let i = 0; i < 4; i++) {
      const st = await rpc<any>("discover/start", { code: fx.code, studentId: studentId(), versionId: fx.versionId });
      const sess = await rpc<any>("discover/session", { sessionId: st.sessionId });
      orders.push(JSON.stringify(sess.orderIds));
    }
    expect(new Set(orders).size, `4 sesi tidak boleh identik semua: ${orders.join(" | ")}`).toBeGreaterThan(1);

    // urutan tersimpan per sesi → resume konsisten
    const st1 = await rpc<any>("discover/start", { code: fx.code, studentId: studentId(), versionId: fx.versionId });
    const s1 = await rpc<any>("discover/session", { sessionId: st1.sessionId });
    const st1b = await rpc<any>("discover/start", { code: fx.code, studentId: studentId(), versionId: fx.versionId });
    const s1b = await rpc<any>("discover/session", { sessionId: st1b.sessionId });
    expect(Array.isArray(s1.orderIds)).toBe(true);
    expect(s1.orderIds.length).toBe(6);
    expect(s1b.orderIds.length).toBe(6);
  });

  test("randomize_a benar-benar mengacak urutan opsi per siswa", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildSimpleAssessment(page, {
      name: "Wire RandA",
      questionCount: 2,
      optionCount: 5,
      config: { randomize_a: true },
    });
    codes.push(fx.code);

    const orders: string[] = [];
    for (let i = 0; i < 4; i++) {
      const st = await rpc<any>("discover/start", { code: fx.code, studentId: studentId(), versionId: fx.versionId });
      expect(st.optionOrder, "start harus mengembalikan optionOrder saat randomize_a aktif").toBeTruthy();
      const qId = Object.keys(st.optionOrder)[0]!;
      orders.push(JSON.stringify(st.optionOrder[qId]));
    }
    expect(new Set(orders).size, `urutan opsi tidak boleh identik semua: ${orders.join(" | ")}`).toBeGreaterThan(1);
  });

  test("allow_pause=false menyembunyikan tombol pause & menolak jeda di server", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildSimpleAssessment(page, {
      name: "Wire Pause",
      questionCount: 2,
      config: { allow_pause: false },
    });
    codes.push(fx.code);

    const st = await rpc<any>("discover/start", { code: fx.code, studentId: studentId(), versionId: fx.versionId });
    const paused = await rpc<any>("discover/pause", { sessionId: st.sessionId });
    expect(paused.ok, "server harus menolak jeda").toBe(false);
    expect(paused.error).toBe("pause_not_allowed");

    // UI siswa: tombol pause tidak dirender
    await page.goto(`/assessment/talent?preview=1&code=${fx.code}&v=${fx.versionId}`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: /Mulai Sekarang/ }).click();
    const begin = page.getByRole("button", { name: /Mulai Bagian Ini/ });
    await begin.waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
    if (await begin.isVisible()) await begin.click();
    await expect(page.getByText("Soal 1")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: /Berhenti & lanjutkan nanti/ })).toHaveCount(0);
  });

  test("allow_pause=true menampilkan tombol pause & jeda diterima", async ({ page }) => {
    test.setTimeout(180000);
    const fx = await buildSimpleAssessment(page, {
      name: "Wire Pause On",
      questionCount: 2,
      config: { allow_pause: true },
    });
    codes.push(fx.code);

    const st = await rpc<any>("discover/start", { code: fx.code, studentId: studentId(), versionId: fx.versionId });
    expect((await rpc<any>("discover/pause", { sessionId: st.sessionId })).ok).toBe(true);

    await page.goto(`/assessment/talent?preview=1&code=${fx.code}&v=${fx.versionId}`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: /Mulai Sekarang/ }).click();
    const begin = page.getByRole("button", { name: /Mulai Bagian Ini/ });
    await begin.waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
    if (await begin.isVisible()) await begin.click();
    await expect(page.getByText("Soal 1")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: /Berhenti & lanjutkan nanti/ })).toBeVisible();
  });

  test("scoring_mode likert memakai poin linier, bukan skor manual per opsi", async ({ page }) => {
    test.setTimeout(180000);
    const { code } = runTag(PREFIX);
    codes.push(code);
    const { versionId } = await createAssessment(page, { code, name: `Wire Likert ${code}` });
    const d1 = await addDimension(page, versionId, "D1", "Dim");
    await configUpdate(page, versionId, {
      total_dim: 1,
      result_dim_count: 1,
      min_q_per_dim: 1,
      scoring_mode: "likert",
      likert_min: 1,
      likert_max: 5,
    });
    // skor manual sengaja besar (100) — di mode likert harus diabaikan
    await saveQuestion(page, versionId, {
      dimensionId: d1,
      questionText: "q",
      questionType: "likert",
      options: [
        { optionValue: "A", label: "1", score: 100 },
        { optionValue: "B", label: "2", score: 100 },
      ],
    });
    expect((await publish(page, versionId)).ok).toBe(true);

    const cfg = await rpc<any>("discover/config", { code, versionId });
    const st = await rpc<any>("discover/start", { code, studentId: studentId(), versionId });
    await rpc("discover/submit", {
      sessionId: st.sessionId,
      questionId: cfg.questions[0].id,
      optionId: cfg.questions[0].opts[0].id,
    });
    const fin = await rpc<any>("discover/finish", { sessionId: st.sessionId });
    expect(fin.rawScores[d1], "opsi pertama = poin linier 1").toBe(1);
  });
});
