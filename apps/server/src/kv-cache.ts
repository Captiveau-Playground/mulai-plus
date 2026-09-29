/**
 * Project 1 — KV cache pada HTTP layer (rpc read-heavy).
 *
 * Kenapa di sini (bukan wrapper prosedur): dispatcher oRPC tidak membaca ulang
 * `.handler` setelah prosedur dibungkus, jadi wrapping prosedur tidak efektif.
 * Cache di HTTP layer pasti jalan + tidak konsumsi body request asli (clone).
 *
 * Hanya aktif ketika binding KV_CACHE ada (Workers). VPS/Bun: lewat (tanpa cache).
 */
import type { Context } from "hono";

const CACHEABLE = new Set([
  "publicListUniversities",
  "publicListStudyPrograms",
  "publicSearchPrograms",
  "publicSearchPassingGrade",
  "publicGetUniversitySlugs",
  "publicGetProgramSlugs",
  "publicGetAllProdiForSitemap",
  "publicGetUniversity",
  "publicGetStudyProgram",
]);

const TTL_BY_PROC: Record<string, number> = {
  publicGetAllProdiForSitemap: 86_400,
  publicGetUniversitySlugs: 3_600,
  publicGetProgramSlugs: 3_600,
  publicGetUniversity: 3_600,
  publicGetStudyProgram: 3_600,
};

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type KVLike = {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string, opts: { expirationTtl: number }): Promise<void>;
};

export async function kvRpcCache(c: Context, next: () => Promise<void>): Promise<Response | undefined> {
  const kv = (c.env as { KV_CACHE?: KVLike }).KV_CACHE;
  const path = c.req.path;
  const proc = path.split("/").pop() ?? "";

  if (!kv || c.req.method !== "POST" || !CACHEABLE.has(proc)) {
    await next();
    return;
  }

  const bodyText = await c.req.raw.clone().text();
  const key = `rpc:${proc}:${await sha256(bodyText)}`;
  const ttl = TTL_BY_PROC[proc] ?? 300;

  try {
    const hit = (await kv.get(key, "json")) as unknown;
    if (hit !== null && hit !== undefined) {
      c.header("x-kv-cache", "hit");
      return c.json(hit);
    }
    await next();
    if (c.res.status === 200) {
      const data = await c.res.clone().json();
      c.header("x-kv-cache", "miss");
      await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
    }
    return;
  } catch {
    c.header("x-kv-cache", "err");
    await next();
    return;
  }
}
