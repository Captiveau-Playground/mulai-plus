// Resolusi konfigurasi environment untuk e2e.
// Prioritas: env var → file apps/server/.env (DATABASE_URL).
//
// Catatan: Playwright men-transpile TS spec ke CommonJS, jadi jangan pakai import.meta.
// Repo root dicari dengan menelusuri ke atas dari cwd (ditemukan dari folder apps/server).
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000";
export const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:3001";
export const RPC_URL = `${API_URL}/rpc`;

/** Cari folder repo root (yang punya apps/server/.env) mulai dari cwd lalu naik. */
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(resolve(dir, "apps/server/.env"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`repo root tidak ditemukan dari cwd=${process.cwd()} (butuh apps/server/.env)`);
}

let cachedDbUrl: string | null = null;

/** DATABASE_URL untuk assertion/seed langsung ke DB. */
export function databaseUrl(): string {
  if (cachedDbUrl) return cachedDbUrl;
  if (process.env.E2E_DB_URL) {
    cachedDbUrl = process.env.E2E_DB_URL;
    return cachedDbUrl;
  }
  const envPath = resolve(findRepoRoot(), "apps/server/.env");
  const raw = readFileSync(envPath, "utf8");
  const m = raw.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (!m?.[1]) throw new Error(`DATABASE_URL tidak ditemukan di ${envPath} maupun env E2E_DB_URL`);
  cachedDbUrl = m[1].trim();
  return cachedDbUrl;
}

/** Prefix unik per test run supaya data uji tidak saling tabrakan & mudah dibersihkan. */
export function runTag(prefix: string) {
  const t = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  return { tag: t, code: `${prefix}${t}`.slice(0, 40) };
}
