import { AsyncLocalStorage } from "node:async_hooks";

/**
 * DB provider — holds whichever drizzle instance is active.
 *
 * - Bun/VPS: a single shared instance registered at module load via `setDb`
 *   (node-postgres pool is safe to share across requests).
 * - Cloudflare Workers: a FRESH client per request, bound to the request's
 *   async context via `dbStorage` (`AsyncLocalStorage`). This is required
 *   because:
 *     1. A socket created in one request context cannot be used in another
 *        ("Cannot perform I/O on behalf of a different request").
 *     2. A plain global `setDb` RACES when requests run concurrently in the
 *        same isolate — request A's queries could resolve to request B's
 *        client → cross-request context errors / "Failed query" 500s.
 *   Workers wrap every request/scheduled run in `dbStorage.run(client, ...)`
 *   (see apps/server/src/worker.ts), so each request's query tree sees its
 *   own client.
 */

export const dbStorage = new AsyncLocalStorage<unknown>();

let globalCurrent: unknown = null;

export function setDb(db: unknown) {
  const scoped = dbStorage.getStore();
  if (scoped !== undefined) {
    // Inside a request-scoped context (Workers): bind there, not globally.
    dbStorage.enterWith(db);
  } else {
    // Bun/VPS + tests: register the global active instance.
    globalCurrent = db;
  }
}

export function getDb(): unknown {
  const scoped = dbStorage.getStore();
  if (scoped !== undefined) return scoped;
  if (!globalCurrent) {
    throw new Error(
      "db provider is not initialized — call setDb(db) (Bun) or initWorkerDb(hyperdrive) (Workers) before use",
    );
  }
  return globalCurrent;
}
