/**
 * DB provider — pg-free module that holds whichever drizzle instance is active
 * for the current runtime. Routers read through `@mulai-plus/db/db` (proxy);
 * this lets the same code run on Bun/VPS (pg) and Cloudflare Workers
 * (postgres-js + Hyperdrive) without any handler changes.
 */

let current: unknown = null;

export function setDb(db: unknown) {
  current = db;
}

export function getDb(): unknown {
  if (!current) {
    throw new Error(
      "db provider is not initialized — call setDb(db) (Bun) or initWorkerDb(hyperdrive) (Workers) before use",
    );
  }
  return current;
}
