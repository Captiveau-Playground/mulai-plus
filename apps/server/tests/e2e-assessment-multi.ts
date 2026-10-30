// E2E #2 — MULTI-ATTEMPT + STATUS SEMANTIK (1st / retest / incomplete) + ISIAN LENGKAP
import { neon } from "@neondatabase/serverless";

const API = "http://localhost:3000/rpc";
// ⚠️ Kredensial TIDAK boleh ditulis di source — nilai aslinya pernah bocor ke GitHub
// (alert Neon) dan harus dirotasi. Ambil dari env:
//   bun --env-file=../.env tests/e2e-assessment.ts
const DB_URL = (process.env.DATABASE_URL ?? "").trim().replace(/^["']|["']$/g, "");
if (!DB_URL) {
  console.error("DATABASE_URL kosong — jalankan dengan --env-file=apps/server/.env");
  process.exit(1);
}
if (/prod/i.test(DB_URL) || !/staging/i.test(DB_URL)) {
  console.error("Script ini hanya untuk DB staging (dibatalkan).");
  process.exit(1);
}
const DB = neon(DB_URL);
const SID = `e2e-multi-${Date.now()}`;
let pass = 0;
let fail = 0;
const ok = (n: string, c: boolean, x = "") => {
  c ? (pass++, console.log(`  ✅ ${n} ${x}`)) : (fail++, console.log(`  ❌ ${n} ${x}`));
};
async function rpc(p: string, i: unknown) {
  const r = await fetch(`${API}/${p}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: i }),
  });
  const t = await r.text();
  let j: any;
  try {
    j = JSON.parse(t);
  } catch {
    j = null;
  }
  return j?.json ?? j ?? { http: r.status, raw: t.slice(0, 160) };
}
async function take(code: string) {
  const cfg = await rpc("discover/config", { code });
  const qs = (cfg.questions ?? []).filter((q: any) => q.isActive);
  const st = await rpc("discover/start", { code, studentId: SID });
  let _n = 0;
  for (const q of qs) {
    const o = q.opts[0];
    const r = await rpc("discover/submit", { sessionId: st.sessionId, questionId: q.id, optionId: o.id });
    if (r?.ok) _n++;
  }
  const fin = await rpc("discover/finish", { sessionId: st.sessionId });
  return { st, fin, qs: qs.length };
}
const main = async () => {
  console.log("SID:", SID, "\n");

  // ——— ATTEMPT #1: minat → bakat → lengkap ———
  console.log("— ATTEMPT #1 (minat) —");
  const d1 = await take("DISCOVER");
  ok("minat1 finish + XP", d1.fin?.ok && (d1.fin?.xpEarned ?? 0) > 0, `xp=${d1.fin?.xpEarned}`);
  let rf = await rpc("discover/resultsFor", { code: "TALENT", studentId: SID });
  ok("CTA: TALENT belum selesai → lanjut", rf?.present === false);
  rf = await rpc("discover/resultsFor", { code: "DISCOVER", studentId: SID });
  ok("DISCOVER selesai ✓", rf?.present === true, `profil=${rf?.profileCode}`);

  console.log("\n— ATTEMPT #1 (bakat) → lengkap —");
  const t1 = await take("TALENT");
  ok("bakat1 finish + XP", t1.fin?.ok && (t1.fin?.xpEarned ?? 0) > 0, `xp=${t1.fin?.xpEarned}`);
  rf = await rpc("discover/resultsFor", { code: "TALENT", studentId: SID });
  ok("TALENT selesai ✓", rf?.present === true);
  let att = await rpc("discover/attempts", { studentId: SID });
  ok(
    "history 1 attempt, lengkap",
    att?.attempts?.length === 1 && att.attempts[0].complete === true,
    `n=${att?.attempts?.length}`,
  );

  // ——— RETEST: DISCOVER lagi → attempt #2 (belum lengkap) ———
  console.log("\n— RETEST: attempt #2 (minat) —");
  const d2 = await take("DISCOVER");
  ok("minat2 finish + XP", d2.fin?.ok && (d2.fin?.xpEarned ?? 0) > 0, `xp=${d2.fin?.xpEarned}`);
  rf = await rpc("discover/resultsFor", { code: "TALENT", studentId: SID });
  ok("CTA retest: TALENT attempt baru belum → lanjut", rf?.present === false);
  rf = await rpc("discover/resultsFor", { code: "DISCOVER", studentId: SID });
  ok("DISCOVER (attempt2) selesai ✓", rf?.present === true);
  att = await rpc("discover/attempts", { studentId: SID });
  ok(
    "history 2 attempt (1 len, 2 in-progress)",
    att?.attempts?.length === 2 && att.attempts[0].complete && !att.attempts[1].complete,
    `n=${att?.attempts?.length}`,
  );
  const mid = (
    await DB`select holland_code, ability_scores::text ab from tmb_assessment_results where user_id=${SID} order by created_at desc limit 1`
  )[0];
  ok("attempt2 punya holland", (mid?.holland_code ?? "").length >= 3, `hc=${mid?.holland_code}`);
  ok("attempt2 TANPA ability", !mid?.ab || mid.ab === "null", `ab=${mid?.ab?.slice(0, 40)}`);

  // ——— LANJUT attempt #2: bakat → lengkap ———
  console.log("\n— ATTEMPT #2 (bakat) → lengkap —");
  const t2 = await take("TALENT");
  ok("bakat2 finish + XP", t2.fin?.ok && (t2.fin?.xpEarned ?? 0) > 0, `xp=${t2.fin?.xpEarned}`);
  rf = await rpc("discover/resultsFor", { code: "TALENT", studentId: SID });
  ok("TALENT (attempt2) selesai ✓", rf?.present === true);
  att = await rpc("discover/attempts", { studentId: SID });
  ok(
    "history 2 attempt, keduanya lengkap",
    att?.attempts?.length === 2 && att.attempts.every((a: any) => a.complete),
    `n=${att?.attempts?.length}`,
  );

  // ——— ISIAN LENGKAP: attempt terbaru penuh ———
  console.log("\n— ISIAN LENGKAP (attempt #2) —");
  const row = (
    await DB`select id, holland_code, holland_scores::text hs, ability_scores::text ab, differentiation, confidence_score from tmb_assessment_results where user_id=${SID} order by created_at desc limit 1`
  )[0];
  const ab = row?.ab ? JSON.parse(row.ab) : {};
  ok("holland 3 huruf", (row?.holland_code ?? "").length >= 3, `hc=${row?.holland_code}`);
  ok(
    "holland scores 6 dimensi",
    Object.keys(JSON.parse(row?.hs ?? "{}")).length === 6,
    `keys=${Object.keys(JSON.parse(row?.hs ?? "{}")).length}`,
  );
  ok("ability {levels,scores} lengkap", !!ab?.levels && !!ab?.scores, `keys=${Object.keys(ab).join(",")}`);
  ok("ability.scores 5 dim", Object.keys(ab?.scores ?? {}).length === 5);
  ok("confidence != 0", (row?.confidence_score ?? "0") !== "0", `conf=${row?.confidence_score}`);
  ok("differentiation ada", !!row?.differentiation, `diff=${row?.differentiation}`);
  const recoAll =
    await DB`select type, item_name, confidence, prodi_refs::text refs from tmb_recommendations where result_id=${row?.id} order by rank`;
  const majors = recoAll.filter((r: any) => r.type === "major");
  const careers = recoAll.filter((r: any) => r.type === "career");
  ok("recos: majors>=3", majors.length >= 3, `majors=${majors.length}`);
  ok("recos: careers>=3", careers.length >= 3, `careers=${careers.length}`);
  ok(
    "majors punya prodiRefs (kampus)",
    majors.every((m: any) => JSON.parse(m.refs ?? "[]").length > 0),
    `prodiRefs=[${majors.map((m: any) => JSON.parse(m.refs ?? "[]").length).join(",")}]`,
  );
  ok(
    "majors confidence angka",
    majors.every((m: any) => m.confidence > 0),
  );
  ok(
    "karier menyambung ke kategori major",
    careers.every((c: any) => majors.some((m: any) => m.category_key === c.category_key)),
  );

  console.log(`\nRESULT: PASS=${pass} FAIL=${fail}`);
  process.exit(fail ? 1 : 0);
};
main().catch((e) => {
  console.error("E2E2 crash:", e);
  process.exit(2);
});
