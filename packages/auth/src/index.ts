import { db } from "@mulai-plus/db";
import { createAuth } from "./create-auth";

export type { Auth } from "better-auth";
export { createAuth };

/** Bun/VPS runtime instance (default). Workers use `@mulai-plus/auth/worker`. */
export const auth = await createAuth(db);
