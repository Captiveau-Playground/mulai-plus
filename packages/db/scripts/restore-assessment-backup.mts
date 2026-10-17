// Restore backup JSONL hasil wipe assessment ke DB (default: staging).
// Dijalankan dari packages/db supaya paket `postgres` bisa di-resolve.
//
//   bun packages/db/scripts/restore-assessment-backup.mts --dir docs/db-backup/staging-assessment-<ts>            # dry-run (lihat rencana)
//   bun packages/db/scripts/restore-assessment-backup.mts --dir docs/db-backup/staging-assessment-<ts> --apply    # benar-benar tulis
//
// Urutan insert mengikuti dependensi FK (parent dulu).
import postgres from "postgres";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const dirArg = args[args.indexOf("--dir") + 1];
const apply = args.includes("--apply");
if (!dirArg) {
  console.error("Pakai: bun packages/db/scripts/restore-assessment-backup.mts --dir <folder-backup> [--apply]");
  process.exit(1);
}
const dir = resolve(dirArg);
if (!existsSync(dir)) {
  console.error("Folder backup tidak ada:", dir);
  process.exit(1);
}

const ROOT = "/Users/novinardianyulianto/Works/Captiveau/mulai-plus";
const url = (await Bun.file(`${ROOT}/apps/server/.env`).text()).match(/DATABASE_URL="([^"]+)"/)?.[1];
const host = new URL(url).hostname;
const dbname = new URL(url).pathname.slice(1);
if (!/staging/i.test(host + dbname)) {
  console.error("BUKAN STAGING — dibatalkan:", host, dbname);
  process.exit(1);
}

// parent dulu supaya FK terpenuhi
const ORDER = [
  "questions", "question_options", "text_input_configs",
  "assessment_sessions", "assessment_answers", "assessment_results", "assessment_dimension_scores",
  "tmb_assessment_results", "tmb_recommendations", "tmb_ai_summaries", "tmb_test_answers",
];

const sql = postgres(url, { max: 1, connect_timeout: 15 });
console.log(`Target: ${dbname} @ ${host}${apply ? "" : "  (DRY-RUN)"}`);

for (const table of ORDER) {
  const file = join(dir, `${table}.jsonl`);
  if (!existsSync(file)) {
    console.log(`  ${table.padEnd(30)} (tidak ada file, dilewati)`);
    continue;
  }
  const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  if (rows.length === 0) {
    console.log(`  ${table.padEnd(30)} 0 baris`);
    continue;
  }
  const cols = Object.keys(rows[0]);
  const json = JSON.stringify(rows);
  if (!apply) {
    console.log(`  ${table.padEnd(30)} ${String(rows.length).padStart(5)} baris → akan dimasukkan (${cols.length} kolom)`);
    continue;
  }
  await sql.begin(async (tx) => {
    await tx`insert into ${tx(table)} ${tx(rows, ...cols)} on conflict do nothing`;
  });
  console.log(`  ${table.padEnd(30)} ${String(rows.length).padStart(5)} baris ✓`);
}
await sql.end();
if (!apply) console.log("\nDry-run selesai. Tambahkan --apply untuk menulis ke DB.");
