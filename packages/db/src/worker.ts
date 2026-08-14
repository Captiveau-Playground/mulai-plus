import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Cloudflare Workers variant of the database client.
 *
 * Node's `pg` driver does not run on Workers, so this uses the
 * `postgres` (porsager) driver over a Cloudflare **Hyperdrive** binding.
 * Hyperdrive handles connection pooling + caching to Supabase Postgres.
 *
 * Usage (in the worker entry):
 *   import { createWorkerDb } from "@mulai-plus/db/worker";
 *   const db = createWorkerDb(env.HYPERDRIVE);
 */
export function createWorkerDb(hyperdrive: { connectionString: string }) {
  const sql = postgres(hyperdrive.connectionString, {
    max: 1,
    prepare: false,
  });
  return drizzle(sql, { schema });
}

export type WorkerDb = ReturnType<typeof createWorkerDb>;
export { schema };
