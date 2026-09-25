import { createWorkerAuth } from "@mulai-plus/auth/worker";
import { db } from "@mulai-plus/db/db";
import { dbStorage } from "@mulai-plus/db/provider";
import { createWorkerDb, type WorkerDb } from "@mulai-plus/db/worker";
import { createApp } from "./app";
import { runAutoPublish } from "./cron-core";

/**
 * Cloudflare Workers runtime entry.
 *
 * Each request/scheduled run gets a FRESH postgres-js client (via Hyperdrive),
 * bound to the request's async context through AsyncLocalStorage (`dbStorage`).
 * Required because:
 *   1. A socket created in one request context cannot be used in another —
 *      reusing a single client across requests triggers Cloudflare's
 *      "Cannot perform I/O on behalf of a different request" error (verified).
 *   2. A plain global `setDb` races when requests run concurrently in one
 *      isolate — request A's queries could resolve to request B's client.
 *
 * ⚠️ The client is NOT closed explicitly (`end()` per request caused
 * "write CONNECTION_CLOSED hyperdrive.local" under concurrency — connection
 * churn). Instead `idle_timeout: 10` (see @mulai-plus/db/worker) auto-closes
 * each client's idle connection ~10s after the request, keeping the
 * Hyperdrive pool from exhausting without the churn.
 *
 * The app + auth are built once (cached), but every `db` query they issue goes
 * through the provider proxy → resolves to the CURRENT request's client.
 */

export interface Env {
  HYPERDRIVE: { connectionString: string };
  /** Binding KV cache (Project 1) — opsional; VPS tidak punya. */
  KV_CACHE?: unknown;
}

let cached: { app: ReturnType<typeof createApp> } | null = null;

/** Build the app + auth once. Auth queries route through the db provider proxy. */
async function getRuntime() {
  if (!cached) {
    const workerAuth = await createWorkerAuth(db as unknown as WorkerDb);
    const app = createApp({ authInstance: workerAuth });
    cached = { app };
  }
  return cached;
}

/** Run a handler with a fresh per-request client bound to its async context. */
function withFreshDb<T>(env: Env, fn: () => Promise<T>): Promise<T> {
  const dbInstance = createWorkerDb(env.HYPERDRIVE);
  return dbStorage.run(dbInstance, fn);
}

export default {
  async fetch(request: Request, env: Env) {
    return withFreshDb(env, async () => {
      const { app } = await getRuntime();
      return await app.fetch(request, env);
    });
  },
  async scheduled(_controller: unknown, env: Env) {
    return withFreshDb(env, async () => {
      await getRuntime(); // ensures auth is initialized (uses the fresh db)
      await runAutoPublish();
    });
  },
};
