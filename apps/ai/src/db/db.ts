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

/** Eksekusi query dengan retry 1x (pool di-reset jika koneksi bermasalah). */
export async function unsafe(c: AppContext, sqlText: string, params: unknown[] = []): Promise<Record<string, any>[]> {
  try {
    return (await getSql(c).unsafe(sqlText, params as never[])) as Record<string, any>[];
  } catch (_e) {
    // Reset pool & coba sekali lagi (transient: Hyperdrive/aksio koneksi drop)
    _sql?.end().catch(() => {});
    _sql = undefined;
    _connKey = undefined;
    const rows = await getSql(c).unsafe(sqlText, params as never[]);
    return rows as Record<string, any>[];
  }
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
