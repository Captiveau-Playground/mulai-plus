import { auth } from "@mulai-plus/auth";
import type { Context as HonoContext } from "hono";
import { createContext as createContextCore } from "./context-core";

export type { AuthInstance } from "./context-core";

/**
 * Bun/VPS default — resolves the auth instance automatically.
 * Workers use `@mulai-plus/api/context-core` with an explicit auth instance.
 */
export function createContext({ context }: { context: HonoContext }) {
  return createContextCore({ context, auth });
}

export type Context = Awaited<ReturnType<typeof createContextCore>>;
