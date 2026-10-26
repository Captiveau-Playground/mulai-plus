import { env } from "@mulai-plus/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { setDb } from "./provider";
import * as schema from "./schema";

const { Pool } = pg;

const globalForDb = globalThis as unknown as {
  pool: pg.Pool | undefined;
};

// Use a connection pool to maintain persistent connections
// This reduces the overhead of establishing new connections and DNS lookups
// which helps prevent "DNSException: getaddrinfo ETIMEOUT" errors
const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  });

/**
 * (stability) Postgres/Neon menutup koneksi idle kapan saja. Tanpa listener
 * `error` pada pool, `pg` memancarkan event 'error' yang tidak tertangani →
 * Node menghentikan proses (API mati di tengah request). Kejadian nyata:
 * server dev/API crash saat suite e2e berjalan. Di sini error dicatat dan
 * pool otomatis membuat koneksi baru pada query berikutnya.
 */
pool.on("error", (err) => {
  console.error("[db] koneksi idle bermasalah (pool tetap hidup):", (err as Error)?.message ?? err);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });

// Register as the active instance for the runtime-swappable proxy (@mulai-plus/db/db)
setDb(db);

export * from "drizzle-orm";
export { schema };
