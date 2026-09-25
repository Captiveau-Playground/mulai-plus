import { createWorkerAuth } from "@mulai-plus/auth/worker";
import { db } from "@mulai-plus/db/db";
import { dbStorage } from "@mulai-plus/db/provider";
import { createWorkerDb, type WorkerDb } from "@mulai-plus/db/worker";
import { createApp } from "./app";
import { runAiHealthCheck, runAutoPublish } from "./cron-core";

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
  KV_CACHE?: unknown;
  AI_SERVICE?: { fetch(input: string | URL, init?: RequestInit): Promise<Response> };
  AI_SERVICE_URL?: string;
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
    // Kesehatan AI TIDAK butuh DB — jalankan duluan & independen (jangan ikut gagal kalau DB bermasalah).
    await runAiHealthCheck(env as Parameters<typeof runAiHealthCheck>[0]).catch(() => {});
    // Auto-publish artikel tiap 5 menit (butuh DB).
    return withFreshDb(env, async () => {
      await getRuntime();
      const minute = new Date().getUTCMinutes();
      if (minute % 5 === 0) {
        await runAutoPublish().catch((e: unknown) => console.error("[cron] autoPublish:", (e as Error).message));
      }
    });
  },
};
