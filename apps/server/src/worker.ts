import { createWorkerAuth } from "@mulai-plus/auth/worker";
import { createWorkerDb, type WorkerDb } from "@mulai-plus/db/worker";
import { createApp } from "./app";
import { runAutoPublish } from "./cron-core";

/**
 * Cloudflare Workers runtime entry.
 *
 * - `fetch` → Hono app (same routes as the Bun runtime)
 * - `scheduled` → Cron Trigger every 5 minutes (auto-publish scheduled articles)
 *
 * The Hyperdrive binding is only available inside handlers, so the
 * db + auth + app are built lazily and cached per isolate.
 *
 * No `/api/system/restart` here (no process to restart on Workers) — that
 * endpoint simply 404s, which is the correct behavior.
 */

export interface Env {
  HYPERDRIVE: { connectionString: string };
}

let cached: { db: WorkerDb; app: ReturnType<typeof createApp> } | null = null;

async function getRuntime(env: Env) {
  if (!cached) {
    const db = createWorkerDb(env.HYPERDRIVE);
    const workerAuth = await createWorkerAuth(db);
    const app = createApp({ authInstance: workerAuth });
    cached = { db, app };
  }
  return cached;
}

export default {
  async fetch(request: Request, env: Env) {
    const { app } = await getRuntime(env);
    return app.fetch(request, env);
  },
  async scheduled(_controller: unknown, env: Env) {
    const { db } = await getRuntime(env);
    await runAutoPublish(db as unknown as Parameters<typeof runAutoPublish>[0]);
  },
};
