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
