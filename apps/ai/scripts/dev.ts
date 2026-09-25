/**
 * Local dev runner — inject `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`
 * dari `.dev.vars` (DATABASE_URL = staging Supabase) lalu jalankan `wrangler dev`.
 *
 * Kenapa perlu: `wrangler dev --env staging` butuh emulasi Hyperdrive lokal;
 * tanpa var ini error "local Postgres connection string" (bisa kita lihat di turbо dev).
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const devVarsPath = path.join(CWD, ".dev.vars");

function loadDevVars(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  } catch {
    /* .dev.vars optional — biarkan wrangler yang error terang */
  }
  return out;
}

const vars = loadDevVars(devVarsPath);

const env: Record<string, string | undefined> = { ...process.env } as Record<string, string | undefined>;
if (vars.DATABASE_URL) {
  env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE = vars.DATABASE_URL;
}
// Secret lokal (openai/ai) dibaca wrangler dari .dev.vars otomatis.

const child = spawn("./node_modules/.bin/wrangler", ["dev", "--env", "staging"], { cwd: CWD, env, stdio: "inherit" });

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error("gagal spawn wrangler:", err.message);
  process.exit(1);
});
