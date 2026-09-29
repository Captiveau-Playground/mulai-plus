import type { WorkerDb } from "@mulai-plus/db/worker";
import { createAuth } from "./create-auth";

/**
 * Build Better Auth for Cloudflare Workers.
 *
 * The Hyperdrive binding is only available inside the request/scheduled
 * handler, so create this lazily per runtime instance (see apps/server/src/worker.ts).
 */
export function createWorkerAuth(database: WorkerDb) {
  // WorkerDb (postgres-js driver) is structurally compatible with the
  // node-postgres Drizzle client — both expose the same schema-typed queries.
  return createAuth(database as unknown as Parameters<typeof createAuth>[0]);
}
