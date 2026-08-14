import * as Sentry from "@sentry/bun";

Sentry.init({
  dsn: "https://eec617f779cd9df7b34a8f9701d97e82@o4511585856258048.ingest.us.sentry.io/4511585880834048",
  enableLogs: true,
  tracesSampleRate: 1.0,
});

import { utimes } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { auth } from "@mulai-plus/auth";
import { env } from "@mulai-plus/env/server";
import { createApp } from "./app";
import { runAutoPublish } from "./cron";

/**
 * Bun/VPS runtime entry.
 *
 * Runtime-specific bits live here (NOT in ./app):
 * - Sentry (bun) init
 * - `/api/system/restart` (touches the entry file → bun --watch reloads)
 * - 5-minute cron via setInterval
 * - Bun server export `{ port, fetch }`
 *
 * Cloudflare Workers uses ./worker.ts instead.
 */
const app = createApp({
  captureError: (error) => Sentry.captureException(error),
  authInstance: auth,
});

// System Restart Endpoint for Admins (Bun-only — touch entry file to reload)
app.post("/api/system/restart", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user || session.user.role !== "admin") {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  try {
    const currentFile = fileURLToPath(import.meta.url);
    const now = new Date();
    await utimes(currentFile, now, now);
    return c.json({ success: true, message: "Server restarting..." });
  } catch (error) {
    console.error("Failed to restart server:", error);
    return c.json({ success: false, message: "Failed to restart server" }, 500);
  }
});

// ── Cron: Auto-publish scheduled articles every 5 minutes (Bun) ──
setInterval(
  () => {
    runAutoPublish().catch((err) => console.error("[Cron] Fatal:", err));
  },
  5 * 60 * 1000,
);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
