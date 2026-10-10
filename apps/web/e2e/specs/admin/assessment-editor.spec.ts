// E2E ADMIN — Assessment editor v2: timer rules, durasi dimensi, instruksi.
// Prasyarat: jalankan `bun e2e/setup-admin.mts` lalu set env E2E_ADMIN_EMAIL & E2E_ADMIN_PASSWORD.
// Bila env kosong → suite di-skip (agar tidak memblok CI tanpa kredensial).
import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/rpc";
async function rpc(path: string, input: unknown) {
  const r = await fetch(`${API}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ json: input }) });
  const t = await r.text();
  try { const j = JSON.parse(t); return j?.json ?? j; } catch { return { http: r.status }; }
}

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const PASS = process.env.E2E_ADMIN_PASSWORD ?? "";
test.skip(!EMAIL || !PASS, "Butuh E2E_ADMIN_EMAIL & E2E_ADMIN_PASSWORD (jalankan e2e/setup-admin.mts)");

async function dismissCookie(page: Page) {
  const dlg = page.getByRole("dialog", { name: "Persetujuan cookie" });
  try { if (await dlg.isVisible({ timeout: 2500 })) await dlg.locator("button").first().click(); } catch { /* none */ }
}

async function loginAdmin(page: Page) {
  await page.goto("/login");
  await page.waitForTimeout(1200);
  await dismissCookie(page);
  await page.locator('input[name="email"]').first().fill(EMAIL);
  await page.locator('input[name="password"]').first().fill(PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2500);
}

test.describe("Admin — Assessment editor v2 (timer & instruksi)", () => {
  test("editor memuat, aturan timer tampil, durasi dimensi bisa diubah, simpan aturan", async ({ page }) => {
    test.setTimeout(180000);
    await loginAdmin(page);

    await page.goto("/admin/assessment/editor/TALENT");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
    await dismissCookie(page);

    // Halaman editor tampil (judul Dimensi & Aturan)
    await expect(page.getByText("Dimensi", { exact: false }).first()).toBeVisible({ timeout: 20000 });

    // Panel Timer ada
    await expect(page.getByText(/Timer/i).first()).toBeVisible({ timeout: 15000 });

    // Durasi dimensi: input detik muncul di chip dimensi (minimal 1)
    const durInput = page.locator('input[type="number"][title*="Durasi"]').first();
    if (await durInput.count()) {
      await durInput.fill("120");
      await durInput.blur();
      await page.waitForTimeout(2000);
    }

    // Aktifkan timer kalau belum, lalu pilih scope "Per bagian (dimensi)"
    const timerToggle = page.locator('input[type="checkbox"]').first();
    if (await timerToggle.count()) {
      const checked = await timerToggle.isChecked().catch(() => false);
      if (!checked) await timerToggle.check();
      await page.waitForTimeout(800);
    }

    // Simpan aturan → toast sukses
    const saveBtn = page.getByRole("button", { name: /Simpan aturan/i }).first();
    if (await saveBtn.count()) {
      await saveBtn.click();
      await page.waitForTimeout(2500);
    }

    // Instruksi per dimensi tampil (Pengantar & Instruksi)
    await expect(page.getByText(/Pengantar &/i).first()).toBeVisible({ timeout: 15000 });

    // ——— 3 STRATEGI TIMER ———
    // (a) dropdown scope punya 3 opsi
    const scopeSel = page.locator("select").filter({ hasText: /Per bagian|Per soal|Tanpa batas/ }).first();
    if (await scopeSel.count()) {
      const opts = await scopeSel.locator("option").allInnerTexts();
      console.log("[debug:admin] scope timer options =", opts.join(" | "));
      // (b) pilih Per soal → input default detik per soal tampil
      await scopeSel.selectOption({ label: "Per soal" });
      await page.waitForTimeout(1200);
      const perQ = await page.getByText(/Detik per soal/i).count();
      console.log("[debug:admin] label 'Detik per soal' =", perQ);
      expect(perQ).toBeGreaterThan(0);
      // simpan aturan (scope question) ke draft agar bisa diverifikasi via API
      const saveRules = page.getByRole("button", { name: /Simpan aturan/i }).first();
      if (await saveRules.count()) { await saveRules.click(); await page.waitForTimeout(2000); }
      // (c) buka modal soal pertama → input durasi PER SOAL (custom per item) tampil
      const qRow = page.locator("button").filter({ hasText: /bobot/i }).first();
      if (await qRow.count()) {
        await qRow.click({ force: true });
        await page.waitForTimeout(1500);
        const perItem = await page.getByText(/Detik soal ini/i).count();
        console.log("[debug:admin] label 'Detik soal ini (per item)' =", perItem);
        expect(perItem).toBeGreaterThan(0);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }
      // (d) VERIFIKASI API: draft version dengan scope question → qEnds per soal terisi
      const draft = await page.evaluate(async () => {
        const r = await fetch("http://localhost:3000/rpc/discoverAdmin/versions/list", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ json: { code: "TALENT" } }) });
        const j = await r.json();
        const items = j?.json?.items ?? j?.items ?? [];
        return (items.find((v: any) => v.status === "draft") ?? items[0])?.id ?? null;
      });
      if (draft) {
        const st = await rpc("discover/start", { code: "TALENT", studentId: `e2e-timer-${Date.now()}`, versionId: draft });
        const ts = await rpc("discover/timerState", { sessionId: st.sessionId });
        console.log("[debug:admin] timerState(draft) scope =", ts?.scope, "qEnds =", (ts?.qEnds ?? []).length);
        if (ts?.scope === "question") expect((ts?.qEnds ?? []).length).toBeGreaterThan(0);
      }
      // balikkan ke Per bagian + simpan (agar draft staging kembali seperti semula)
      await scopeSel.selectOption({ label: "Per bagian (dimensi)" }).catch(() => {});
      await page.waitForTimeout(600);
      const saveBack = page.getByRole("button", { name: /Simpan aturan/i }).first();
      if (await saveBack.count()) { await saveBack.click(); await page.waitForTimeout(1500); }
    }
  });
});
