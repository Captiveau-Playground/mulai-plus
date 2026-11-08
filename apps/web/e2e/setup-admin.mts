// Utilitas: siapkan akun ADMIN untuk e2e (buat user + promote role='admin').
//
//   bun e2e/setup-admin.mts
//
// Biasanya TIDAK perlu dijalankan manual — spec admin memanggil ensureAdmin() yang
// melakukan hal yang sama secara otomatis (idempotent). Script ini berguna untuk
// menyiapkan kredensial tetap dari terminal / CI.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Cari repo root (yang punya apps/server/.env) dengan menelusuri ke atas. */
function findRepoRoot(): string {
  let dir = HERE;
  for (let i = 0; i < 8; i++) {
    if (existsSync(resolve(dir, "apps/server/.env"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`repo root tidak ditemukan dari ${HERE}`);
}

function databaseUrl(): string {
  if (process.env.E2E_DB_URL) return process.env.E2E_DB_URL;
  const envPath = resolve(findRepoRoot(), "apps/server/.env");
  const m = readFileSync(envPath, "utf8").match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (!m?.[1]) throw new Error(`DATABASE_URL tidak ditemukan di ${envPath}`);
  return m[1].trim();
}

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000";
const email = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@test.local";
const password = process.env.E2E_ADMIN_PASSWORD ?? "E2ePass!234";

const res = await fetch(`${API_URL}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: "http://localhost:3001" },
  body: JSON.stringify({ name: "E2E Admin", email, password }),
});
const raw = await res.text();
let parsed: any = null;
try {
  parsed = JSON.parse(raw);
} catch {
  /* respons bukan JSON (mis. user sudah ada) */
}

const db = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
await db.connect();

let userId: string | undefined = parsed?.user?.id;
if (!userId) {
  const found = await db.query(`select id from "user" where email = $1 limit 1`, [email]);
  userId = found.rows[0]?.id;
}
if (!userId) {
  console.error("Gagal membuat/menemukan user admin. Respons API:", raw.slice(0, 200));
  await db.end();
  process.exit(1);
}

await db.query(`update "user" set role = 'admin' where id = $1`, [userId]);
const role = (await db.query(`select role from "user" where id = $1`, [userId])).rows[0]?.role;
await db.end();

if (role !== "admin") {
  console.error(`Promote gagal — role sekarang: ${role}`);
  process.exit(1);
}

console.log("ADMIN SIAP");
console.log(`E2E_ADMIN_EMAIL=${email}`);
console.log(`E2E_ADMIN_PASSWORD=${password}`);
