import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { setDb } from "./provider";
import * as schema from "./schema";

/**
 * Cloudflare Workers variant of the database client.
 *
 * Node's `pg` driver does not run on Workers, so this uses the
 * `postgres` (porsager) driver over a Cloudflare **Hyperdrive** binding.
 * Hyperdrive handles connection pooling + caching to Supabase Postgres.
 *
 * Usage (in the worker entry):
 *   import { initWorkerDb } from "@mulai-plus/db/worker";
 *   const db = initWorkerDb(env.HYPERDRIVE);
 */
export function createWorkerDb(hyperdrive: { connectionString: string }) {
  const sql = postgres(hyperdrive.connectionString, {
    max: 1,
    prepare: false,
    // ⚠️ Do NOT call `end()` on these clients (connection churn kills
    // Hyperdrive sockets mid-query under concurrency). Instead rely on
    // idle_timeout to auto-close each request's connection ~10s later —
    // bounded leak, no pool exhaustion, no churn.
    connect_timeout: 10, // fail fast if Hyperdrive/Supabase unreachable
    idle_timeout: 10, // auto-close the per-request connection after 10s idle
  });
  return drizzle(sql, { schema });
}

export type WorkerDb = ReturnType<typeof createWorkerDb>;

/**
 * Create the worker db AND register it with the global provider
 * (used by routers through `@mulai-plus/db/db`).
 */
export function initWorkerDb(hyperdrive: { connectionString: string }): WorkerDb {
  const db = createWorkerDb(hyperdrive);
  setDb(db);
  return db;
}

export { schema };
