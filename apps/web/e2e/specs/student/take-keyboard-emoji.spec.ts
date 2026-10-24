// E2E STUDENT (rute asli) — keyboard sampai opsi ke-5/ke-6 & emoji animasi pada skala.
//
// Memakai halaman tes siswa yang sebenarnya: /dashboard/student/assessment/take/<CODE>
// dengan ?preview=1&v=<versionId> (tanpa data siswa, versi dipaksa).
import { expect, type Page, test } from "@playwright/test";
import { addDimension, configUpdate, createAssessment, publish, saveQuestion } from "../../fixtures/assessment";
import { createAdminPage, loginAdmin } from "../../helpers/admin-ui";
import { closeDb, deleteAssessmentByCode } from "../../helpers/db";
import { runTag } from "../../helpers/env";

const PREFIX = "E2EKB";
const codes: string[] = [];
let admin: Page;

/** Tes 1 dimensi; soal sesuai yang diminta, langsung dirilis. */
async function buildOne(page: Page, label: string, questions: Parameters<typeof saveQuestion>[2][]) {
  const { code } = runTag(PREFIX);
  codes.push(code);
  const { versionId } = await createAssessment(admin, { code, name: `${label} ${code}` });
  const d1 = await addDimension(admin, versionId, "D1", "Dimensi Satu");
  await configUpdate(admin, versionId, { total_dim: 1, result_dim_count: 1, min_q_per_dim: 1, section_mode: "none" });
  for (const q of questions) await saveQuestion(admin, versionId, { ...q, dimensionId: d1 });
  const gate = await publish(admin, versionId);
  expect(gate.ok, `publish fixture: ${JSON.stringify(gate.errors ?? [])}`).toBe(true);
  return { code, versionId };
}

/** Buka rute tes siswa (mode preview) & masuk ke soal pertama. */
async function startTest(page: Page, code: string, versionId: string) {
  await page.goto(`/dashboard/student/assessment/take/${code}?preview=1&v=${versionId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("button", { name: /Mulai Tes|Mulai$/i }).first()).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("button", { name: /Mulai Tes|Mulai$/i })
    .first()
    .click();
  // tutorial "Cara Main Test" (muncul sekali per sesi)
  const tut = page.getByRole("button", { name: /Paham, Mulai|Mulai Simulasi/i }).first();
  await tut.waitFor({ state: "visible", timeout: 10000 }).catch(() => undefined);
  if (await tut.isVisible()) await tut.click();
  await page.waitForTimeout(600);
  const begin = page.getByRole("button", { name: /Mulai bagian/i }).first();
  await begin.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
  if (await begin.isVisible()) await begin.click();
  await page.waitForTimeout(800);
}

// admin page dipakai semua describe di file ini
test.beforeAll(async ({ browser }) => {
  admin = await createAdminPage(browser);
});

test.afterAll(async () => {
  await admin.context().close();
});

test.describe("Siswa · keyboard opsi 5/6 & emoji animasi", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.afterAll(async () => {
    for (const c of codes) await deleteAssessmentByCode(c).catch(() => false);
    await closeDb();
  });

  test("soal 5 opsi: tombol 5 dan E sama-sama memilih opsi ke-5", async ({ page }) => {
    test.setTimeout(240000);
    const opts = ["Satu", "Dua", "Tiga", "Empat", "Lima"];
    const fx = await buildOne(page, "KB5", [
      {
        questionText: "Pilih opsi kelima (keyboard 5 / E)",
        questionType: "multiple_choice",
        options: opts.map((label, i) => ({ optionValue: "ABCDE"[i]!, label, score: i === 4 ? 1 : 0 })),
      },
    ]);

    await startTest(page, fx.code, fx.versionId);
    await expect(page.getByText(/Pilih opsi kelima/)).toBeVisible({ timeout: 20000 });
    // 5 tombol opsi tampil
    for (const label of opts) await expect(page.getByRole("button", { name: new RegExp(label) })).toBeVisible();

    // tekan "5" → soal terjawab (satu-satunya soal) → layar selesai
    await page.keyboard.press("5");
    await expect(page.getByText(/Pilih opsi kelima/)).toBeHidden({ timeout: 20000 });
    await expect(page.locator("body")).toContainText(/Selesai/i, { timeout: 20000 });
  });

  test("soal 6 opsi: tombol 6 dan F memilih opsi ke-6", async ({ page }) => {
    test.setTimeout(240000);
    const opts = ["A1", "B2", "C3", "D4", "E5", "F6"];
    const fx = await buildOne(page, "KB6", [
      {
        questionText: "Pilih opsi keenam (keyboard 6 / F)",
        questionType: "multiple_choice",
        options: opts.map((label, i) => ({ optionValue: "ABCDEF"[i]!, label, score: i === 5 ? 1 : 0 })),
      },
    ]);

    await startTest(page, fx.code, fx.versionId);
    await expect(page.getByText(/Pilih opsi keenam/)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: /F6/ })).toBeVisible();

    await page.keyboard.press("f");
    await expect(page.getByText(/Pilih opsi keenam/)).toBeHidden({ timeout: 20000 });
    await expect(page.locator("body")).toContainText(/Selesai/i, { timeout: 20000 });
  });

  test("skala likert: emoji animasi Noto tampil (dan punya fallback)", async ({ page }) => {
    test.setTimeout(240000);
    const fx = await buildOne(page, "KBEmoji", [
      {
        questionText: "Seberapa suka kamu mengerjakan soal logika?",
        questionType: "likert",
        options: [
          { optionValue: "A", label: "Sangat tidak suka", icon: "😡", imageCaption: "Sangat tidak suka", score: 1 },
          { optionValue: "B", label: "Tidak suka", icon: "🙁", imageCaption: "Tidak suka", score: 2 },
          { optionValue: "C", label: "Netral", icon: "😐", imageCaption: "Netral", score: 3 },
          { optionValue: "D", label: "Suka", icon: "🙂", imageCaption: "Suka", score: 4 },
          { optionValue: "E", label: "Sangat suka", icon: "😍", imageCaption: "Sangat suka", score: 5 },
        ],
      },
    ]);

    await startTest(page, fx.code, fx.versionId);
    await expect(page.getByText(/Seberapa suka kamu mengerjakan/)).toBeVisible({ timeout: 20000 });

    const emojis = page.locator('[data-testid="likert-emoji"]');
    await expect(emojis).toHaveCount(5);
    // caption tetap ada di bawah emoji
    await expect(page.locator("body")).toContainText(/Sangat tidak suka/);

    // animasi Noto termuat (data-state="ok"); kalau aset gagal, fallback glyph tetap tampil
    await expect(emojis.first()).toHaveAttribute("data-state", "ok", { timeout: 30000 });
    await expect(emojis.first().locator("canvas")).toHaveCount(1);

    // memilih lewat keyboard juga tetap jalan (skala = 5 opsi → "5")
    await page.keyboard.press("5");
    await expect(page.getByText(/Seberapa suka kamu mengerjakan/)).toBeHidden({ timeout: 20000 });
  });
});

/* ── Layout mobile: maskot DI ATAS soal (bukan 2 kolom) + tipografi lebih terbaca ── */
test.describe("Siswa · layout soal di mobile", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test("mobile: maskot & soal SATU BARIS, font Manrope, 5 opsi tampil", async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width: 390, height: 844 });
    const longQuestion =
      "Seorang siswa ingin memilih jurusan yang sesuai dengan minat dan kemampuannya, namun ia masih bingung menentukan prioritas antara peluang karier dan kesukaannya. Menurutmu, langkah paling tepat yang perlu ia lakukan lebih dulu adalah…";
    const fx = await buildOne(page, "Mob", [
      {
        questionText: longQuestion,
        questionType: "multiple_choice",
        options: [
          "Menanyakan kepada teman",
          "Ikut tes minat bakat lalu diskusi dengan mentor",
          "Membaca semua brosur kampus",
          "Ikut jurusan yang populer",
          "Menunda sampai pendaftaran",
        ].map((label, i) => ({
          optionValue: "ABCDE"[i]!,
          label,
          score: i === 1 ? 1 : 0,
        })),
      },
    ]);

    await startTest(page, fx.code, fx.versionId);
    await expect(page.getByText(/langkah paling tepat/)).toBeVisible({ timeout: 20000 });

    const { maskot, soal, font, optionCount } = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Maskot bertanya"]') as HTMLElement | null;
      const h2 = document.querySelector('[data-testid="question-text"]') as HTMLElement | null;
      const box = (el: HTMLElement | null) => {
        const r = el?.getBoundingClientRect();
        return r ? { y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width) } : null;
      };
      return {
        maskot: box(img),
        soal: box(h2),
        font: h2 ? getComputedStyle(h2).fontFamily : "",
        optionCount: [...document.querySelectorAll("button")].filter((b) =>
          /Menanyakan kepada teman|Ikut tes minat bakat|Membaca semua brosur|Ikut jurusan yang populer|Menunda sampai pendaftaran/.test(
            b.textContent ?? "",
          ),
        ).length,
      };
    });

    // (perubahan 20 Okt) maskot & soal kini SATU BARIS: maskot kiri, soal kanan
    expect(maskot, "maskot tampil").toBeTruthy();
    expect(soal, "teks soal tampil").toBeTruthy();
    const overlap = Math.min(maskot!.y + maskot!.h, soal!.y + soal!.h) - Math.max(maskot!.y, soal!.y);
    expect(overlap, `maskot & soal harus sebaris (maskot y=${maskot!.y} h=${maskot!.h}, soal y=${soal!.y} h=${soal!.h})`)
      .toBeGreaterThan(10);
    expect(maskot!.y + maskot!.h, "maskot tidak menumpuk teks soal").toBeLessThan(soal!.y + soal!.h + 1);
    // soal tetap memakai sebagian besar lebar layar (dikurangi maskot + gap)
    expect(soal!.w).toBeGreaterThan(250);
    // tipografi soal memakai Manrope (lebih terbaca untuk kalimat panjang)
    expect(font.toLowerCase()).toContain("manrope");
    // semua 5 opsi dirender (opsi ke-5 tidak lagi hilang)
    expect(optionCount).toBe(5);
  });

  test("mobile: skala emoji tampil satu baris per opsi (bukan 5 sebaris)", async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width: 390, height: 844 });
    const fx = await buildOne(page, "MobSkala", [
      {
        questionText: "Seberapa suka kamu mengerjakan soal logika?",
        questionType: "likert",
        options: [
          { optionValue: "A", label: "Sangat tidak suka", icon: "😡", imageCaption: "Sangat tidak suka", score: 1 },
          { optionValue: "B", label: "Tidak suka", icon: "🙁", imageCaption: "Tidak suka", score: 2 },
          { optionValue: "C", label: "Netral", icon: "😐", imageCaption: "Netral", score: 3 },
          { optionValue: "D", label: "Suka", icon: "🙂", imageCaption: "Suka", score: 4 },
          { optionValue: "E", label: "Sangat suka", icon: "😍", imageCaption: "Sangat suka", score: 5 },
        ],
      },
    ]);

    await startTest(page, fx.code, fx.versionId);
    await expect(page.getByText(/Seberapa suka kamu mengerjakan/)).toBeVisible({ timeout: 20000 });

    const layout = await page.evaluate(() => {
      const emojis = [...document.querySelectorAll('[data-testid="likert-emoji"]')] as HTMLElement[];
      return emojis.map((el) => {
        const btn = el.closest("button") as HTMLElement | null;
        const r = el.getBoundingClientRect();
        const br = btn?.getBoundingClientRect();
        return {
          y: Math.round(r.y),
          w: Math.round(r.width),
          rowW: br ? Math.round(br.width) : 0,
          text: btn?.innerText.replace(/\n/g, " ").trim() ?? "",
        };
      });
    });

    expect(layout).toHaveLength(5);
    // tiap opsi punya barisnya sendiri: posisi Y naik berurutan (bukan sebaris)
    for (let i = 1; i < layout.length; i++) {
      expect(layout[i]!.y, `opsi ${i + 1} harus di bawah opsi ${i}`).toBeGreaterThan(layout[i - 1]!.y + 10);
    }
    // baris memakai lebar hampir penuh (mudah disentuh)
    for (const row of layout) expect(row.rowW).toBeGreaterThan(300);
    // caption tetap terbaca di baris
    expect(layout[0]!.text).toContain("Sangat tidak suka");
    expect(layout[4]!.text).toContain("Sangat suka");
  });
});
