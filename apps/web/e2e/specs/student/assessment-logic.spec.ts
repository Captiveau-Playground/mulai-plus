// E2E — Logika Pilih Test (notice 4 state + kartu pause/30-30)
// Menciptakan user unik via API, login via UI, mendorong state engine via RPC (public), lalu memeriksa UI.
import { expect, test, type Page } from "@playwright/test";

const RPC = "http://localhost:3000/rpc";
const EMAIL_D = (s: string) => `e2e-${s}@test.local`;

async function rpc(path: string, input: unknown) {
  const res = await fetch(`${RPC}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ json: input }) });
  const raw = await res.text();
  let j: any = null;
  try { j = JSON.parse(raw); } catch { /* noop */ }
  return j?.json ?? j ?? { http: res.status, raw: raw.slice(0, 120) };
}

async function completeTest(sid: string, code: string) {
  const cfg = await rpc("discover/config", { code });
  const qs: any[] = (cfg.questions ?? []).filter((q: any) => q.isActive);
  const types = new Set(qs.map((q) => q.questionType));
  console.log(`[debug:${code}] types=${[...types].join(",")} nQs=${qs.length} optsSample=${JSON.stringify(qs[0]?.opts?.slice(0, 1) ?? null)}`);
  const st = await rpc("discover/start", { code, studentId: sid });
  let subOK = 0;
  for (const q of qs) {
    const o = q.opts?.[0];
    if (o) { const r = await rpc("discover/submit", { sessionId: st.sessionId, questionId: q.id, optionId: o.id }); if (r?.ok) subOK++; }
    else if (q?.questionType === "text_input") { // soal isian: jawab angka → tersimpan & terhitung
      const r = await rpc("discover/submitText", { sessionId: st.sessionId, questionId: q.id, textAnswer: "1" });
      if (r?.ok) subOK++;
    }
  }
  const fin = await rpc("discover/finish", { sessionId: st.sessionId });
  console.log(`[debug:${code}] submitted=${subOK}/${qs.length} finish=${JSON.stringify(fin)?.slice(0, 260)}`);
}

async function partial(sid: string, code: string, n: number): Promise<string> {
  const cfg = await rpc("discover/config", { code });
  const qs: any[] = (cfg.questions ?? []).filter((q: any) => q.isActive);
  const st = await rpc("discover/start", { code, studentId: sid });
  for (let i = 0; i < n; i++) {
    const q = qs[i];
    const o = q?.opts?.[0];
    if (o) await rpc("discover/submit", { sessionId: st.sessionId, questionId: q.id, optionId: o.id });
  }
  return st.sessionId;
}

async function createUser(tag: string) {
  const email = EMAIL_D(tag);
  const res = await fetch("http://localhost:3000/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3001" },
    body: JSON.stringify({ name: "E2E " + tag, email, password: "E2ePass!234" }),
  });
  const raw = await res.text();
  let j: any = null;
  try { j = JSON.parse(raw); } catch { /* noop */ }
  const user = j?.user ?? {};
  return { email, password: "E2ePass!234", id: user?.id ?? "", raw: raw.slice(0, 200) };
}

async function dismissCookie(page: Page) {
  const dlg = page.getByRole("dialog", { name: "Persetujuan cookie" });
  try {
    if (await dlg.isVisible({ timeout: 2500 })) {
      const btn = dlg.locator("button").first();
      await btn.click({ timeout: 5000 });
    }
  } catch { /* tidak ada dialog */ }
}

async function loginUI(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);
  await dismissCookie(page);
  // mungkin redirect kalau sudah login (fresh context → form tampil)
  const emailField = page.locator('input[name="email"]').first();
  await emailField.fill(email, { timeout: 10000 });
  await page.locator('input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  // tunggu login sukses → dashboard atau muncul menu user
  await page.waitForTimeout(2500);
  await page.goto("/dashboard");
  await page.waitForTimeout(1200);
}

async function dismissDevDialog(page: Page) {
  const x = page.getByRole("button", { name: "Tutup" }).first();
  try { if (await x.isVisible({ timeout: 2000 })) await x.click(); } catch { /* none */ }
}

test.describe("Assessment logic — Pilih Test", () => {
  test("notice 4 states & kartu pause/30-30", async ({ page }) => {
    test.setTimeout(180000);
    const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const created = await createUser(tag);
    const { email, password } = created;
    const studentId: string = created.id ?? "";
    expect(studentId, `signup gagal — respons: ${created.raw}`).toBeTruthy();

    await loginUI(page, email, password);

    await page.goto("/dashboard/student/assessment");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    // lewati gerbang profil: seed sekolah+jenjang & 1 sosial (via RPC dengan cookie sesi)
    await page.evaluate(async () => {
      const h = { "content-type": "application/json" };
      await fetch("http://localhost:3000/rpc/user/updateProfile", { method: "POST", headers: h, credentials: "include", body: JSON.stringify({ json: { school: "SMA Negeri 1 Jakarta", educationLevel: "SMA" } }) });
      await fetch("http://localhost:3000/rpc/user/updateProfile", { method: "POST", headers: h, credentials: "include", body: JSON.stringify({ json: { socialMedia: { instagram: "https://instagram.com/e2e-test" } } }) });
    });
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await dismissDevDialog(page);

    const gateVisible = await page.getByText("Langkah 1 dari 2").isVisible().catch(() => false);
    if (gateVisible) {
      const dump = await page.evaluate(() => document.body.innerText.slice(0, 400));
      throw new Error("Gerbang profil masih tampil: " + dump);
    }

    // STATE 0 — belum ada tes
    await expect(page.getByText(/Mulai Tes Minat/)).toBeVisible({ timeout: 20000 });

    // STATE 1 — minat selesai
    await completeTest(studentId, "DISCOVER");
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Lanjutkan Tes Bakat/)).toBeVisible({ timeout: 15000 });

    // STATE 2 — keduanya selesai → Lihat Rekomendasi
    await completeTest(studentId, "TALENT");
    const dbg = await rpc("discover/attempts", { studentId });
    console.log("[debug] attempts:", JSON.stringify(dbg)?.slice(0, 400));
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Lihat/).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Selesai/).first()).toBeVisible(); // kartu menampilkan status selesai

    // ——— SYNC ke halaman hasil v1: konten harus TERISI ———
    await page.goto("/dashboard/student/assessment/result");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
    console.log("[debug:result] url=", page.url());
    await expect(async () => {
      const t = await page.evaluate(() => document.body.innerText);
      if (!t.includes("Jurusan yang Cocok")) throw new Error("belum: " + t.slice(0, 300));
    }).toPass({ timeout: 20000 });
    await expect(page.getByText("Karier yang Cocok")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Profil Kemampuan")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/belum tersedia/)).not.toBeVisible({ timeout: 5000 }); // ability terisi, bukan placeholder
    const hit = await page.locator("text=/Kedokteran|Teknik|Ekonomi|Manajemen|Keperawatan|Informatika|Hukum/").count();
    console.log("[debug:result] nama jurusan tampil =", hit);
    expect(hit).toBeGreaterThan(0);
    // PETA REKOMENDASI (SCR) — dibangun dari majors/careers, tanpa AI
    await expect(page.getByText("Peta Rekomendasi")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/klik node prodi/)).toBeVisible({ timeout: 15000 });
    // ——— REALISME ANGKA & RINGKASAN ———
    const pcts = await page.evaluate(() => Array.from(document.body.innerText.matchAll(/(\d+(?:\.\d+)?)%/g)).map((m) => parseFloat(m[1] ?? "0")));
    console.log("[debug:result] persen =", pcts.join(","));
    expect(Math.max(0, ...pcts)).toBeLessThanOrEqual(100); // tidak ada kecocokan > 100% (regresi 333%)
    // Ringkasan AI: fallback deber-grounded (bukan cheerleader 'kombinasi unik')
    await page.waitForTimeout(2500);
    await expect.poll(() => page.evaluate(() => document.body.innerText)).not.toContain("kombinasi unik");
    const aiSec = await page.getByText("Ringkasan AI").count();
    console.log("[debug:result] bagian Ringkasan AI hadir =", aiSec);
    await page.goto("/dashboard/student/assessment");

    // STATE 3 — pause: attempt baru minat 3/30
    const ses = await partial(studentId, "DISCOVER", 3);
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Lanjutkan · 3\/30/)).toBeVisible({ timeout: 15000 });

    // STATE 4 — isi sampai 30 tanpa finish → 'Selesaikan Test · 30/30'
    const cfg = await rpc("discover/config", { code: "DISCOVER" });
    const qs: any[] = (cfg.questions ?? []).filter((q: any) => q.isActive);
    for (let i = 3; i < qs.length; i++) {
      const o = qs[i]?.opts?.[0];
      if (o) await rpc("discover/submit", { sessionId: ses, questionId: qs[i].id, optionId: o.id });
    }
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Selesaikan Test · 30\/30/)).toBeVisible({ timeout: 15000 });

    // bersihkan partial
    await rpc("discover/abandon", { studentId, code: "DISCOVER" });
  });
});

test.describe("Assessment — timer & instruksi (user)", () => {
  test("intro menampilkan aturan timer + pengantar; heartbeat timerState valid", async ({ page }) => {
    test.setTimeout(180000);
    const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const created = await createUser(tag);
    const { email, password } = created;
    const studentId: string = created.id ?? "";
    expect(studentId, `signup gagal — ${created.raw}`).toBeTruthy();
    await loginUI(page, email, password);
    await page.goto("/dashboard/student/assessment");
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      const h = { "content-type": "application/json" };
      await fetch("http://localhost:3000/rpc/user/updateProfile", { method: "POST", headers: h, credentials: "include", body: JSON.stringify({ json: { school: "SMA Negeri 1 Jakarta", educationLevel: "SMA" } }) });
      await fetch("http://localhost:3000/rpc/user/updateProfile", { method: "POST", headers: h, credentials: "include", body: JSON.stringify({ json: { socialMedia: { instagram: "https://instagram.com/e2e" } } }) });
    });

    // Sesi TALENT baru (timer aktif) → cek timerState dari server
    const st = await rpc("discover/start", { code: "TALENT", studentId });
    const ts = await rpc("discover/timerState", { sessionId: st.sessionId });
    console.log("[debug:timer] timerState =", JSON.stringify(ts)?.slice(0, 200));
    expect(ts.ok).toBe(true);
    if (ts.scope === "dimension") {
      expect(Array.isArray(ts.dims)).toBe(true);
      expect(ts.dims.length).toBeGreaterThan(0);
      expect(ts.dims.every((d: any) => !!d.endISO)).toBe(true);
    }

    // UI: halaman intro menampilkan aturan waktu
    await page.goto("/dashboard/student/assessment/take/TALENT");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
    const hasRules = await page.getByText("Aturan waktu").count();
    const hasPerBagian = await page.getByText(/detik \/ bagian/).count();
    console.log("[debug:timer] aturan waktu =", hasRules, "| chip durasi =", hasPerBagian);
    if (ts.scope === "dimension") {
      await expect(page.getByText("Aturan waktu")).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(/detik \/ bagian/).first()).toBeVisible({ timeout: 15000 });
    }
    // countdown tampil di top bar setelah masuk soal
    const mulai = page.getByRole("button", { name: /Mulai Tes/i }).first();
    if (await mulai.count()) { await mulai.click(); await page.waitForTimeout(2500); }
    const mulaiBagian = page.getByRole("button", { name: /Mulai bagian/i }).first();
    if (await mulaiBagian.count()) { await mulaiBagian.click(); await page.waitForTimeout(2500); }
    const chip = await page.getByText(/^\d{1,2}:\d{2}$/).count();
    console.log("[debug:timer] countdown chip =", chip);
    expect(chip).toBeGreaterThan(0);
  });
});
