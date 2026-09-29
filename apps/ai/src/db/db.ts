/**
 * DB access via Hyperdrive (production) atau DATABASE_URL (local/dev).
 * Memakai `postgres` (postgres.js) — kompatibel Workers + nodejs_compat.
 *
 * PENTING: pool dibuat SEKALI per isolate (module-level), bukan per-request —
 * objek env di Workers baru tiap request, jadi caching di sana bikin koneksi
 * dibuka-buka terus (flaky). Pakai singleton + retry 1x jika koneksi drop.
 */
import postgres from "postgres";
import type { AppContext } from "../config";

type Sql = ReturnType<typeof postgres>;

let _sql: Sql | undefined;
let _connKey: string | undefined;

function connectionString(c: AppContext): string {
  const envRec = c.env as Record<string, unknown>;
  const conn =
    (envRec.HYPERDRIVE as { connectionString?: string } | undefined)?.connectionString ??
    (envRec.DATABASE_URL as string | undefined);
  if (!conn) {
    throw new Error("Database belum dikonfigurasi (HYPERDRIVE / DATABASE_URL)");
  }
  return conn;
}

/** Singleton postgres instance per isolate (di-hash oleh connection string). */
export function getSql(c: AppContext): Sql {
  const conn = connectionString(c);
  if (_sql && _connKey === conn) return _sql;
  _sql?.end().catch(() => {});
  _sql = postgres(conn, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  _connKey = conn;
  return _sql;
}

const DB_TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("DbTimeout")), DB_TIMEOUT_MS))]);
}

function resetPool() {
  _sql?.end().catch(() => {});
  _sql = undefined;
  _connKey = undefined;
}

function isTransient(err: unknown): boolean {
  const m = (err as Error)?.message ?? "";
  return (
    /CONNECTION_ENDED|ECONN|connection|socket|timeout|ETIMEDOUT|terminat/i.test(m) ||
    (err as any)?.code === "CONNECTION_ENDED"
  );
}

/** Eksekusi query dengan retry (3x + backoff) + timeout — tahan terhadap Hyperdrive flaky. */
export async function unsafe(c: AppContext, sqlText: string, params: unknown[] = []): Promise<Record<string, any>[]> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await withTimeout(getSql(c).unsafe(sqlText, params as never[]));
    } catch (err) {
      lastErr = err;
      if (attempt < 3 && isTransient(err)) {
        resetPool();
        await new Promise((r) => setTimeout(r, 150 * attempt));
        continue;
      }
      if (attempt < 3) {
        // kesalahan lain: reset & coba sekali lagi
        resetPool();
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }
  throw lastErr;
}

/** Eksekusi query read-only. */
export async function query(c: AppContext, sqlText: string, params: unknown[] = []): Promise<Record<string, any>[]> {
  return unsafe(c, sqlText, params);
}

/** Query tunggal baris pertama (atau null). */
export async function queryOne<T = Record<string, any>>(
  c: AppContext,
  sqlText: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await unsafe(c, sqlText, params);
  return (rows[0] as T | undefined) ?? null;
}
