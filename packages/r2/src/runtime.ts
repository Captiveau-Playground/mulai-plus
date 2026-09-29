/**
 * R2 runtime context (Cloudflare Worker binding) — diprioritaskan diatas S3 keys.
 *
 * Worker: binding R2 (`env.MEDIA_BUCKET`) otomatis milik akun yang sama dengan
 * token deploy (novin@mulaiplus.id / 7b23b1f8...) → migrasi penuh tanpa API key.
 * Bun/VPS/local: tidak ada binding → fallback S3 (env R2_*).
 */
import { AsyncLocalStorage } from "node:async_hooks";

export type R2ObjectLike = {
  key: string;
  size: number;
  uploaded: Date;
  httpMetadata?: { contentType?: string } | null;
  httpEtag?: string | null;
};

export type R2BindingLike = {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | string,
    opts?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<void>;
  createSignedUrl(key: string, opts: { expirySeconds: number }): Promise<string>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<{
    objects: R2ObjectLike[];
    truncated?: boolean;
    cursor?: string;
  }>;
};

export type R2RuntimeContext = {
  binding?: R2BindingLike;
  bucketName?: string;
  publicUrl?: string;
};

const r2Storage = new AsyncLocalStorage<R2RuntimeContext>();

/** Jalankan fn dengan konteks R2 (binding + bucket/publicUrl dari env). */
export function runWithR2<T>(ctx: R2RuntimeContext | undefined, fn: () => T): T {
  return ctx ? r2Storage.run(ctx, fn) : fn();
}

/** Konteks R2 aktif (per-request di Worker; undefined di Bun). */
export function activeR2Context(): R2RuntimeContext | null {
  return r2Storage.getStore() ?? null;
}
