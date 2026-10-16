// Autentikasi untuk e2e: dismiss cookie banner, login UI, dan bootstrap akun admin.
import type { Page } from "@playwright/test";
import { signUpViaApi } from "./api";
import { promoteToAdmin, q, userRole } from "./db";
import { API_URL } from "./env";

export const E2E_PASSWORD = "E2ePass!234";

const CONSENT_KEY = "mulaiplus_ga_consent";

/**
 * Setujui cookie sebelum halaman dimuat (modal consent muncul setelah delay ~1,1 dtk dan
 * menutupi seluruh halaman, sehingga klik pada tombol bisa terhalang).
 */
export async function preAcceptCookies(page: Page) {
  await page.addInitScript((key: string) => {
    try {
      localStorage.setItem(key, "accepted");
      sessionStorage.setItem("mcc-last-shown", String(Date.now()));
    } catch {
      /* localStorage tidak tersedia */
    }
  }, CONSENT_KEY);
}

export async function dismissCookie(page: Page) {
  const dlg = page.getByRole("dialog", { name: "Persetujuan cookie" });
  try {
    // modal tampil setelah delay → tunggu sebentar sebelum memutuskan tidak ada
    await dlg.waitFor({ state: "visible", timeout: 3000 });
    const accept = dlg.getByRole("button", { name: /Ya, saya setuju|Terima|Setuju/i }).first();
    if (await accept.isVisible().catch(() => false)) await accept.click({ timeout: 5000 });
    else await dlg.locator("button").first().click({ timeout: 5000 });
    await dlg.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
  } catch {
    /* tidak ada dialog */
  }
}

/** Login lewat UI (form /login) lalu pastikan sesi aktif. */
export async function loginUI(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(800);
  await dismissCookie(page);
  await page.locator('input[name="email"]').first().fill(email, { timeout: 15000 });
  await page.locator('input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2500);
}

export interface AdminAccount {
  email: string;
  password: string;
  userId: string;
}

/**
 * Pastikan ada akun admin untuk e2e (idempotent).
 * - Bila E2E_ADMIN_EMAIL di-set → pakai itu (tetap dipastikan role='admin').
 * - Bila tidak → pakai akun default e2e-admin@test.local (dibuat sekali, dipakai ulang).
 */
export async function ensureAdmin(): Promise<AdminAccount> {
  const password = process.env.E2E_ADMIN_PASSWORD || E2E_PASSWORD;
  const email = process.env.E2E_ADMIN_EMAIL || "e2e-admin@test.local";

  let userId: string | undefined;
  const created = await signUpViaApi("E2E Admin", email, password);
  if (created.ok) userId = created.userId;
  if (!userId) {
    const rows = await q<{ id: string }>(`select id from "user" where email = $1 limit 1`, [email]);
    userId = rows[0]?.id;
  }
  if (!userId) throw new Error(`akun admin e2e tidak bisa dibuat/ditemukan (${email}): ${created.raw}`);

  if ((await userRole(userId)) !== "admin") await promoteToAdmin(userId);
  const role = await userRole(userId);
  if (role !== "admin") throw new Error(`promote admin gagal (email=${email}, role=${role})`);

  return { email, password, userId };
}

/** Buat user siswa baru + login (dipakai test sisi user). */
export async function createStudent(page: Page, tag: string) {
  const email = `e2e-student-${tag}@test.local`;
  const created = await signUpViaApi("E2E Student", email, E2E_PASSWORD);
  if (!created.ok || !created.userId) throw new Error(`gagal membuat siswa e2e: ${created.raw}`);
  await loginUI(page, email, E2E_PASSWORD);
  return { email, password: E2E_PASSWORD, userId: created.userId };
}

/**
 * Lewati gerbang profil siswa (sekolah + jenjang + 1 sosial) via RPC memakai sesi browser.
 * Dipakai halaman /dashboard/student/assessment.
 */
export async function completeStudentProfile(page: Page) {
  await page.evaluate(async (base: string) => {
    const h = { "content-type": "application/json" };
    await fetch(`${base}/rpc/user/updateProfile`, {
      method: "POST",
      headers: h,
      credentials: "include",
      body: JSON.stringify({ json: { school: "SMA Negeri 1 Jakarta", educationLevel: "SMA" } }),
    });
    await fetch(`${base}/rpc/user/updateProfile`, {
      method: "POST",
      headers: h,
      credentials: "include",
      body: JSON.stringify({ json: { socialMedia: { instagram: "https://instagram.com/e2e-test" } } }),
    });
  }, API_URL);
}
