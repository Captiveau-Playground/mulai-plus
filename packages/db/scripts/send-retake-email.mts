/**
 * Kirim email "Tes Minat Bakat sudah diperbarui — ayo coba lagi".
 *
 *   cd packages/db
 *   bun scripts/send-retake-email.mts --preview                 # tulis /tmp/retake-email.html
 *   bun scripts/send-retake-email.mts --list                    # daftar penerima (tanpa kirim)
 *   bun scripts/send-retake-email.mts --limit=50 --send --yes   # kirim sungguhan (batch)
 *
 * Penerima = user yang PUNYA hasil tes lama di `tmb_assessment_results` dan belum
 * punya hasil di engine baru (`assessment_results`). Akun uji (@test.local dll.) otomatis
 * dilewati oleh email guard.
 */
import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });
const { db } = await import("../src");
const { sql } = await import("drizzle-orm");
const { getAssessmentRetakeHtml } = await import("../../api/src/lib/email/templates/assessment-retake");
const { mail } = await import("../../api/src/lib/mail");
const { shouldSkipEmail } = await import("../../api/src/lib/email-guard");

const args = new Set(process.argv.slice(2));
const has = (f: string) => args.has(f);
const val = (p: string) => [...args].find((a) => a.startsWith(`${p}=`))?.split("=")[1];

const PREVIEW = has("--preview");
const LIST = has("--list");
const SEND = has("--send");
const YES = has("--yes");
const LIMIT = Number(val("--limit") ?? 200);
const APP = (process.env.APP_URL ?? "https://mulaiplus.id").replace(/\/$/, "");

const q = async (s: any) => ((await db.execute(s)).rows ?? []) as any[];

async function main() {
  if (PREVIEW) {
    const html = getAssessmentRetakeHtml({
      name: "Nadia",
      oldCode: "I-A-S",
      url: `${APP}/dashboard/student/assessment`,
    });
    await Bun.write("/tmp/retake-email.html", html);
    console.log("preview → /tmp/retake-email.html");
    return;
  }

  const rows = await q(sql`
    select u.id, u.name, u.email, r.holland_code,
           (select count(*)::int from assessment_results ar where ar.session_id in
              (select s.id from assessment_sessions s where s.student_id = u.id)) as engine_results
    from "user" u
    join lateral (
      select holland_code from tmb_assessment_results t
      where t.user_id = u.id order by t.created_at desc limit 1
    ) r on true
    where coalesce(u.email, '') <> ''
    order by u.created_at desc
    limit ${LIMIT}`);

  const targets = rows.filter((r: any) => Number(r.engine_results ?? 0) === 0);
  console.log(`kandidat: ${rows.length} · belum pernah pakai engine baru: ${targets.length} (limit ${LIMIT})`);

  if (LIST || !SEND) {
    for (const t of targets.slice(0, 30)) console.log(`  • ${t.email} (${t.holland_code ?? "-"})`);
    if (!SEND) console.log("\n(dry) tambahkan --send --yes untuk benar-benar mengirim.");
    return;
  }
  if (!YES) {
    console.error("✗ --send butuh --yes (mengirim email ke pengguna sungguhan).");
    process.exit(1);
  }

  let sent = 0;
  let skipped = 0;
  for (const t of targets) {
    if (shouldSkipEmail(t.email)) {
      skipped++;
      continue;
    }
    const html = getAssessmentRetakeHtml({
      name: t.name,
      oldCode: t.holland_code,
      url: `${APP}/dashboard/student/assessment`,
    });
    const res = await mail.send({
      to: t.email,
      subject: "Tes Minat Bakat MULAI+ sudah versi baru — coba lagi, yuk!",
      html,
    });
    if (res.success) sent++;
    else console.error("gagal:", t.email, res.error);
    await new Promise((r) => setTimeout(r, 120)); // hindari rate limit Resend
  }
  console.log(`selesai · terkirim ${sent} · dilewati ${skipped}`);
}

await main();
process.exit(0);
