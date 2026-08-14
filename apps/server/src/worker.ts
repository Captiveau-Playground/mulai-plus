import { createWorkerAuth } from "@mulai-plus/auth/worker";
import { db } from "@mulai-plus/db/db";
import { setDb } from "@mulai-plus/db/provider";
import { createWorkerDb, type WorkerDb } from "@mulai-plus/db/worker";
import { createApp } from "./app";
import { runAutoPublish } from "./cron-core";

/**
 * Cloudflare Workers runtime entry.
 *
 * IMPORTANT: the postgres-js client (via Hyperdrive) is created FRESH per
 * request/scheduled run and registered through the provider (`@mulai-plus/db/db`).
 * Reusing a single client across requests triggers Cloudflare's
 * "Cannot perform I/O on behalf of a different request" error, because the
 * socket (Writable stream) is bound to the request context that created it.
 *
 * The app + auth are built once (cached), but every `db` query they issue goes
 * through the provider proxy → resolves to the CURRENT request's fresh client.
 */

export interface Env {
  HYPERDRIVE: { connectionString: string };
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

/** Register a fresh Hyperdrive-backed client for the current request. */
function useFreshDb(env: Env) {
  setDb(createWorkerDb(env.HYPERDRIVE));
}

export default {
  async fetch(request: Request, env: Env) {
    useFreshDb(env);
    const { app } = await getRuntime();
    return app.fetch(request, env);
  },
  async scheduled(_controller: unknown, env: Env) {
    useFreshDb(env);
    await getRuntime(); // ensures auth is initialized (uses the fresh db)
    await runAutoPublish();
  },
};
