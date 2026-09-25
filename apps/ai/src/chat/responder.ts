/**
 * Responder — agent pipeline (modular).
 *
 * Alur:
 *   1. messages = system + history + user
 *   2. LLM melihat TOOL dari registry (agent/sources) — SQL sekarang, RAG nanti
 *   3. tool_calls → dispatchTool (registry) → hasil → call lagi (jawaban akhir)
 *   4. bersihkan reasoning, ambil topics, hitung token
 *   5. provider gagal → retry tanpa tools → fallback reply (guardrail)
 */

import { type AgentContext, dispatchTool, toolDefinitions } from "../agent/registry";
import type { AppContext } from "../config";
import { kvMark, kvShortCircuit } from "../llm/circuit-kv";
import { type LlmMessage, llmChatJson, llmFailureShortCircuit, llmRecordOutcome } from "../llm/client";
import { extractTopics, FALLBACK_REPLIES, SYSTEM_PROMPT } from "./prompt";

const THINK_RE = /\s*thinking[\s\S]*?response\s*/;

export function stripThinking(content: string): string {
  return content.replace(THINK_RE, "").trim();
}

export interface ChatResult {
  reply: string;
  suggested: string[];
  promptTokens: number;
  completionTokens: number;
  cost: number;
  toolsUsed: string[];
  chatDebug?: string;
}

const COST_INPUT_PER_1M = 0.14;
const COST_OUTPUT_PER_1M = 0.28;

const FALLBACK: [string, string[]] = ["Maaf, layanan sedang sibuk. Coba tanya lagi nanti ya! 🙏", ["Coba lagi"]];

type HistoryItem = { role: string; content: string };

export async function generateChatReply(
  c: AppContext,
  opts: { message: string; history?: HistoryItem[]; sessionId: string; userId: string | null },
): Promise<ChatResult> {
  const { message, history, sessionId, userId } = opts;
  const pickFallback = (): [string, string[]] =>
    FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)] ?? FALLBACK;

  const debug = c.env.OPENAI_DEBUG === "1";
  if (!debug && ((await kvShortCircuit(c)) ?? llmFailureShortCircuit())) {
    const [reply, suggested] = pickFallback();
    return { reply, suggested, promptTokens: 0, completionTokens: 0, cost: 0, toolsUsed: [] };
  }

  const cleanHistory: LlmMessage[] = (history ?? [])
    .filter((h) => (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
    .slice(-6)
    .map((h) => ({ role: h.role as LlmMessage["role"], content: h.content }));

  const messages: LlmMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...cleanHistory,
    { role: "user", content: message },
  ];

  const ctx: AgentContext = { c, sessionId, userId };
  const toolsUsed: string[] = [];
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    let resp = await llmChatJson(c, messages, { tools: toolDefinitions() });
    if (resp.status !== 200) {
      llmRecordOutcome(false);
      await kvMark(c, false);
      throw new Error(`LLM HTTP ${resp.status}`);
    }
    llmRecordOutcome(true);
    await kvMark(c, true);
    promptTokens += resp.data?.usage?.prompt_tokens ?? 0;
    completionTokens += resp.data?.usage?.completion_tokens ?? 0;

    const msg = resp.data?.choices?.[0]?.message;
    let content = msg?.content ?? "";

    if (msg?.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: msg.tool_calls.map((tc: any) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      });

      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments ?? "{}");
        } catch {
          /* args kosong */
        }
        toolsUsed.push(tc.function.name);
        const result = await dispatchTool(ctx, tc.function.name, args);
        messages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }

      resp = await llmChatJson(c, messages);
      if (resp.status !== 200) throw new Error(`LLM HTTP ${resp.status}`);
      promptTokens += resp.data?.usage?.prompt_tokens ?? 0;
      completionTokens += resp.data?.usage?.completion_tokens ?? 0;
      content = resp.data?.choices?.[0]?.message?.content ?? "";
    }

    const reply = stripThinking(content) || pickFallback()[0];
    return {
      reply,
      suggested: extractTopics(reply),
      promptTokens,
      completionTokens,
      cost: (promptTokens / 1_000_000) * COST_INPUT_PER_1M + (completionTokens / 1_000_000) * COST_OUTPUT_PER_1M,
      toolsUsed,
    };
  } catch (err) {
    llmRecordOutcome(false);
    void kvMark(c, false);
    console.error("[chat] LLM error:", (err as Error).message);
    const [reply, suggested] = pickFallback();
    return { reply, suggested, promptTokens, completionTokens, cost: 0, toolsUsed, chatDebug: (err as Error).message };
  }
}
