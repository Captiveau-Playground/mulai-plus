/**
 * Shared config + env helpers untuk AI service worker.
 *
 * Env (wrangler vars / secrets):
 *  - OPENAI_BASE_URL : Workers AI OpenAI-compatible endpoint
 *    (default: https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/v1)
 *  - OPENAI_API_KEY  : Cloudflare API token (scope "Workers AI: Run") — SECRET
 *  - OPENAI_MODEL    : model (default qwen3-30b-a3b-fp8 — murah + tool calling)
 *  - AI_API_KEY      : shared secret antara apps/server ↔ worker ini — SECRET
 *  - CORS_ORIGIN     : origin web (dipakai apps/server, disini cadangan)
 */
import type { Context } from "hono";

export type Env = {
  OPENAI_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  AI_API_KEY?: string;
  CORS_ORIGIN?: string;
  CF_ACCOUNT_ID?: string;
};

export type AppContext = Context<{ Bindings: Env }>;

export const DEFAULT_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";

export const CF_DEFAULT_ACCOUNT_ID = "7b23b1f8e20fd9cb2a7ab0fa6df7021d";

export const DEFAULT_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_DEFAULT_ACCOUNT_ID}/ai/v1`;

export function baseUrl(c: AppContext): string {
  return c.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
}

export function apiKey(c: AppContext): string {
  return c.env.OPENAI_API_KEY ?? "";
}

export function model(c: AppContext): string {
  return c.env.OPENAI_MODEL || DEFAULT_MODEL;
}

export function aiApiKey(c: AppContext): string {
  return c.env.AI_API_KEY ?? "";
}

export function corsOrigin(c: AppContext): string {
  return c.env.CORS_ORIGIN ?? "";
}
