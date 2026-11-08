// E2E Assessment Engine — positive & negative scenarios (server RPC :3000 + DB)
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
const SID = `e2e-${Date.now()}`;
let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name} ${extra}`);
  } else {
    fail++;
    console.log(`  ❌ ${name} ${extra}`);
  }
};

async function rpc(path: string, input: unknown) {
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  const raw = await res.text();
  let j: any;
  try {
    j = JSON.parse(raw);
  } catch {
    j = null;
  }
  return j?.json ?? j ?? { http: res.status, raw: raw.slice(0, 200) };
}

async function takeTest(code: string) {
  const cfg = await rpc("discover/config", { code });
  const qs = (cfg.questions ?? []).filter((q: any) => q.isActive);
  const st = await rpc("discover/start", { code, studentId: SID });
  ok(`${code} start ok`, st?.ok === true && !!st.sessionId, `sid=${st.sessionId?.slice(0, 8)}`);
  let submitted = 0;
  for (const q of qs) {
    const o = q.opts[0];
    const r = await rpc("discover/submit", { sessionId: st.sessionId, questionId: q.id, optionId: o.id });
    if (r?.ok) submitted++;
    else {
      ok(`${code} submit#${q.id}`, false, JSON.stringify(r));
      break;
    }
  }
  ok(`${code} semua submit tersimpan (${qs.length})`, submitted === qs.length, `submitted=${submitted}`);
  // NEGATIVE: opsi huruf bukan id → option_mismatch (SELAGI sesi masih in_progress)
  const firstQ = qs[0];
  const letterSub2 = await rpc("discover/submit", { sessionId: st.sessionId, questionId: firstQ.id, optionId: "A" });
  ok(
    `${code} submit opsi huruf 'A' → option_mismatch`,
    letterSub2?.ok === false && letterSub2?.error === "option_mismatch",
    `err=${letterSub2?.error ?? JSON.stringify(letterSub2)}`,
  );
  const fin = await rpc("discover/finish", { sessionId: st.sessionId });
  return { qs: qs.length, fin, sessionId: st.sessionId, cfg };
}

const main = async () => {
  console.log("SID:", SID);
  // purge awal
  const p0 = await rpc("discover/purgeIncomplete", { studentId: SID });
  ok("purgeIncomplete awal", p0?.ok === true, `purged=${p0?.purged}`);

  // ——— NEGATIVE dulu (validasi RPC) ———
  console.log("\n— NEGATIVE —");
  const badStart = await rpc("discover/start", { code: "KODE-SALAH", studentId: SID });
  ok("start kode salah → ditolak", badStart?.ok === false, `err=${badStart?.error ?? JSON.stringify(badStart)}`);
  const emptyCfg = await rpc("discover/config", { code: "KODE-SALAH" });
  ok("config kode salah → tidak ada", !emptyCfg?.ok, `ok=${emptyCfg?.ok}`);
  const finUnknown = await rpc("discover/finish", { sessionId: "tidak-ada" });
  ok(
    "finish sesi asing → session_not_found",
    finUnknown?.ok === false && finUnknown?.error === "session_not_found",
    `err=${finUnknown?.error}`,
  );
  const rfOther = await rpc("discover/resultsFor", { code: "DISCOVER", studentId: "user-tidak-ada" });
  ok("resultsFor user asing → present false", rfOther?.present === false);

  // ——— DISCOVER (positif) ———
  console.log("\n— DISCOVER (minat) —");
  const d = await takeTest("DISCOVER");
  ok("DISCOVER finish ok", d.fin?.ok === true && d.fin?.already_completed !== true);
  ok("DISCOVER XP > 0", (d.fin?.xpEarned ?? 0) > 0, `xp=${d.fin?.xpEarned}`);
  ok(
    "DISCOVER profil RIASEC terisi",
    typeof d.fin?.profileCode === "string" && d.fin.profileCode.length >= 3,
    `profil=${d.fin?.profileCode}`,
  );
  // negatif: submit setelah selesai → session_closed
  const postQ = d.cfg.questions.find((q: any) => q.isActive);
  const postSub = await rpc("discover/submit", {
    sessionId: d.sessionId,
    questionId: postQ.id,
    optionId: postQ.opts[0].id,
  });
  ok(
    "submit setelah finish → session_closed",
    postSub?.ok === false && postSub?.error === "session_closed",
    `err=${postSub?.error ?? JSON.stringify(postSub)}`,
  );
  // negatif: finish dobel → already_completed
  const fin2 = await rpc("discover/finish", { sessionId: d.sessionId });
  ok("finish dobel → already_completed", fin2?.already_completed === true);

  // ——— TALENT (positif) ———
  console.log("\n— TALENT (bakat) —");
  const t = await takeTest("TALENT");
  ok("TALENT finish ok", t.fin?.ok === true && t.fin?.already_completed !== true);
  ok("TALENT XP > 0", (t.fin?.xpEarned ?? 0) > 0, `xp=${t.fin?.xpEarned}`);

  // ——— STATUS & ATTEMPT ———
  console.log("\n— STATUS ATTEMPT —");
  const rD = await rpc("discover/resultsFor", { code: "DISCOVER", studentId: SID });
  const rT = await rpc("discover/resultsFor", { code: "TALENT", studentId: SID });
  ok("resultsFor DISCOVER present", rD?.present === true, `profil=${rD?.profileCode}`);
  ok("resultsFor TALENT present", rT?.present === true);
  const att = await rpc("discover/attempts", { studentId: SID });
  const last = (att?.attempts ?? []).at(-1);
  ok(
    "attempts ada & terakhir lengkap",
    (att?.attempts?.length ?? 0) === 1 && last?.complete === true,
    `n=${att?.attempts?.length} complete=${last?.complete}`,
  );

  // ——— DB: kontrak hasil legacy (page result) ———
  console.log("\n— DB KONTRAK HASIL (page result) —");
  const row = (
    await DB`select id, holland_code, holland_scores::text hs, ability_scores::text ab, differentiation, confidence_score from tmb_assessment_results where user_id=${SID} order by created_at desc limit 1`
  )[0];
  ok("row attempt ada", !!row, row?.id);
  ok("holland terisi (3 huruf)", (row?.holland_code ?? "").replace(/-/g, "").length >= 3, `hc=${row?.holland_code}`);
  const ab = row?.ab ? JSON.parse(row.ab) : {};
  const hasScores = ab?.scores && Object.keys(ab.scores).length === 5;
  const hasLevels = ab?.levels && Object.keys(ab.levels).length === 5;
  ok("ability berformat {levels,scores}", !!ab?.levels && !!ab?.scores, `keys=${Object.keys(ab).join(",")}`);
  ok("ability.scores 5 dimensi", hasScores, `n=${Object.keys(ab?.scores ?? {}).length}`);
  ok("ability.levels 5 dimensi", hasLevels);
  const recoN = (await DB`select count(*) as c from tmb_recommendations where result_id=${row?.id}`)[0]?.c;
  ok("rekomendasi ditulis (>0)", (recoN ?? 0) > 0, `recos=${recoN}`);
  const majorN = (
    await DB`select count(*) as c from tmb_recommendations where result_id=${row?.id} and type='major'`
  )[0]?.c;
  ok("ada jurusan (major) dengan prodi", (majorN ?? 0) > 0, `majors=${majorN}`);
  const prodiRefs = (
    await DB`select prodi_refs from tmb_recommendations where result_id=${row?.id} and type='major' limit 1`
  )[0];
  const refs = prodiRefs?.prodi_refs ?? [];
  ok("major punya prodiRefs (kampus)", Array.isArray(refs) && refs.length > 0, `refs=${refs.length}`);
  ok("confidence bukan '0'", (row?.confidence_score ?? "0") !== "0", `conf=${row?.confidence_score}`);
  ok("differentiation ada", !!row?.differentiation, `diff=${row?.differentiation}`);

  console.log(`\nRESULT: PASS=${pass} FAIL=${fail}`);
  process.exit(fail ? 1 : 0);
};
main().catch((e) => {
  console.error("E2E crashed:", e);
  process.exit(2);
});
