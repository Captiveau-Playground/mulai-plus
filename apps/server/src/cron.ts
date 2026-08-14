import { db } from "@mulai-plus/db";
import { runAutoPublish as runAutoPublishCore } from "./cron-core";

/**
 * Bun/VPS wrapper — defaults to the pg-backed db instance.
 * Workers use `cron-core` directly with the Hyperdrive client.
 */
export const runAutoPublish = (client: typeof db = db) => runAutoPublishCore(client);
