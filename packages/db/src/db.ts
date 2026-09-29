import type { db as BunDb } from "./index";
import { getDb } from "./provider";
import * as schema from "./schema";

export * from "drizzle-orm";
export { schema };

/**
 * Runtime-swappable db proxy (pg-free).
 *
 * Routers import `db` from this module (`@mulai-plus/db/db`) instead of
 * `@mulai-plus/db` so the Cloudflare Workers bundle never pulls `pg`.
 * Every `db.xxx` call forwards to the active instance:
 *   - Bun/VPS → `@mulai-plus/db` index calls `setDb(db)` at module load.
 *   - Workers → `initWorkerDb(hyperdrive)` calls `setDb(db)` at startup.
 */
export const db = new Proxy({} as typeof BunDb, {
  get: (_target, prop: PropertyKey) => {
    const current = getDb() as Record<PropertyKey, unknown>;
    return current[prop];
  },
});
