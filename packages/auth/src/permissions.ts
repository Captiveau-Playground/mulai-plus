import { db } from "@mulai-plus/db";
import { getAdminUserIds as getAdminUserIdsCore, getRoles as getRolesCore } from "./permissions-core";

/**
 * Bun/VPS wrapper — defaults to the pg-backed db instance.
 * Workers use the pg-free core directly (see `@mulai-plus/auth/worker`).
 */
export const getRoles = (client: typeof db = db) => getRolesCore(client);
export const getAdminUserIds = (client: typeof db = db) => getAdminUserIdsCore(client);

export * from "./permissions-core";
