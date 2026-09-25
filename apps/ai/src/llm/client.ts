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
import { apiKey, baseUrl, fastModel, model } from "../config";
import { fallbackMark, fallbackMode } from "./fallback";

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
  opts: { tools?: ToolDef[]; stream?: boolean; temperature?: number; model?: string } = {},
): Promise<{ body: ReadableStream<Uint8Array> | null; headers: Headers; status: number }> {
  const payload: Record<string, unknown> = {
    model: opts.model ?? model(c),
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
    signal: AbortSignal.timeout(20_000),
  });
  return { body: resp.body, headers: resp.headers, status: resp.status };
}

/** Non-streaming helper → parse JSON (dipakai tool loop / final answer). */
/** Non-streaming helper → parse JSON, dengan FALLBACK CHAIN (primary → fast). */
export async function llmChatJson(c: AppContext, messages: LlmMessage[], opts: { tools?: ToolDef[] } = {}) {
  const mode = await fallbackMode(c);
  const requestedModel = mode === "fast" ? fastModel(c) : model(c);

  const first = await llmChat(c, messages, { ...opts, model: requestedModel });
  let text = first.body ? await new Response(first.body).text() : "";

  if (first.status >= 400) {
    // Primary gagal → tandai & coba FAST seketika
    await fallbackMark(c, false);
    const second = await llmChat(c, messages, { ...opts, model: fastModel(c) });
    text = second.body ? await new Response(second.body).text() : "";
    const ok = second.status < 400;
    if (ok) await fallbackMark(c, true);
    const data = safeParse(text);
    if (!ok) throw new Error(`LLM HTTP ${second.status} — ${JSON.stringify(data).slice(0, 300)}`);
    return { status: second.status, data, modelUsed: fastModel(c) };
  }

  await fallbackMark(c, true);
  const data = safeParse(text);
  return { status: first.status, data, modelUsed: requestedModel };
}

function safeParse(text: string): Record<string, any> {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
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
