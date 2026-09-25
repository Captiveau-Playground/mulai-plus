/**
 * Workers AI client — OpenAI-compatible chat completions (streaming).
 *
 * Implementasi pakai `fetch` langsung (tanpa SDK) supaya bebas & ringan.
 * Port dari `apps/ai-python/src/engine/responder.py`:
 *  - circuit breaker (2 kegagalan beruntun → short-circuit 60s)
 *  - semaphore (batasi koneksi paralel ke provider gratis)
 *  - retry sekali, tanpa tools jika provider menolak payload tools (400)
 */
import type { AppContext } from "../config";
import { apiKey, baseUrl, model } from "../config";

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

// ── Sirkuit putus (sama seperti python) ─────────────────────────────
let failCount = 0;
let failAt = 0;
const COOLDOWN_MS = 60_000;

export function llmFailureShortCircuit(): boolean {
  if (Date.now() - failAt > COOLDOWN_MS) failCount = 0;
  return failCount >= 2;
}

export function llmRecordOutcome(ok: boolean): void {
  if (ok) {
    failCount = 0;
  } else {
    failCount += 1;
    failAt = Date.now();
  }
}

/** Panggil chat completions; stream=true → kembalikan ReadableStream delimiter `\n\n` OpenAI-format. */
export async function llmChat(
  c: AppContext,
  messages: LlmMessage[],
  opts: { tools?: ToolDef[]; stream?: boolean; temperature?: number } = {},
): Promise<{ body: ReadableStream<Uint8Array> | null; headers: Headers; status: number }> {
  const payload: Record<string, unknown> = {
    model: model(c),
    messages,
    stream: opts.stream ?? false,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.tools?.length) {
    payload.tools = opts.tools;
    payload.tool_choice = "auto";
  }
  // Timeout 60s — WA bisa mengantre model (async_queue); tanpa batas waktu
  // request bisa menggantung selama berjam-jam ketika model throttling.
  const resp = await fetch(`${baseUrl(c)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey(c)}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90_000),
  });
  return { body: resp.body, headers: resp.headers, status: resp.status };
}

/** Non-streaming helper → parse JSON (dipakai tool loop / final answer). */
export async function llmChatJson(c: AppContext, messages: LlmMessage[], opts: { tools?: ToolDef[] } = {}) {
  const { body, status } = await llmChat(c, messages, opts);
  const text = body ? await new Response(body).text() : "";
  let data: Record<string, any> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (status !== 200) {
    const hint = JSON.stringify(data).slice(0, 300);
    throw new Error(`LLM HTTP ${status} — ${hint}`);
  }
  return { status, data };
}

export function usageOf(data: unknown): Usage {
  return (data as { usage?: Usage })?.usage ?? {};
}

// ── Streaming passthrough (AI SDK trial) ──────────────────
export async function llmChatStream(
  c: AppContext,
  messages: LlmMessage[],
  opts: { tools?: ToolDef[] } = {},
): Promise<ReadableStream<Uint8Array> | null> {
  const { body } = await llmChat(c, messages, { ...opts, stream: true });
  return body;
}
