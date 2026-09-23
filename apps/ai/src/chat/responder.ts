/**
 * Responder — port apps/ai-python/src/engine/responder.py (dengan tool loop).
 *
 * Alur:
 *   1. messages = system + history + user
 *   2. call LLM dengan tools (search_universities, search_programs, get_passing_grade)
 *   3. jika model minta tool_calls → eksekusi → append hasil → call lagi (tanpa tools)
 *   4. bersihkan blok reasoning → reply + follow-up topics + token usage
 *
 * Striem: provider gagal → retry sekali TANPA tools (graceful), lalu fallback reply.
 */
import type { AppContext } from "../config";
import { type LlmMessage, llmChatJson, llmFailureShortCircuit, llmRecordOutcome } from "../llm/client";
import { TOOL_DEFINITIONS } from "../tools/definitions";
import { handleToolCall } from "../tools/execute";
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
}

const COST_INPUT_PER_1M = 0.14;
const COST_OUTPUT_PER_1M = 0.28;

const FALLBACK: [string, string[]] = ["Maaf, layanan sedang sibuk. Coba tanya lagi nanti ya! 🙏", ["Coba lagi"]];

type HistoryItem = { role: string; content: string };

export async function generateChatReply(
  c: AppContext,
  message: string,
  history: HistoryItem[] = [],
): Promise<ChatResult> {
  const pickFallback = (): [string, string[]] =>
    FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)] ?? FALLBACK;

  // Short-circuit provider (fallback instan, tanpa nunggu timeout).
  if (llmFailureShortCircuit()) {
    const [reply, suggested] = pickFallback();
    return { reply, suggested, promptTokens: 0, completionTokens: 0, cost: 0 };
  }

  // Sanitasi history: hanya {role, content} string.
  const cleanHistory: LlmMessage[] = (history ?? [])
    .filter((h) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
    .slice(-6)
    .map((h) => ({ role: h.role as LlmMessage["role"], content: h.content }));

  const messages: LlmMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...cleanHistory,
    { role: "user", content: message },
  ];

  let promptTokens = 0;
  let completionTokens = 0;

  try {
    // Call #1 dengan tools
    let resp = await llmChatJson(c, messages, {
      tools: TOOL_DEFINITIONS as never,
    });
    if (resp.status !== 200) {
      llmRecordOutcome(false);
      throw new Error(`LLM HTTP ${resp.status}`);
    }
    llmRecordOutcome(true);
    promptTokens += resp.data?.usage?.prompt_tokens ?? 0;
    completionTokens += resp.data?.usage?.completion_tokens ?? 0;

    const msg = resp.data?.choices?.[0]?.message;
    let content = msg?.content ?? "";

    // Tool loop
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
        console.log(`[tools] ${tc.function.name}(${JSON.stringify(args)})`);
        const result = await handleToolCall(c, tc.function.name, args);
        console.log(`[tools] result: ${result.slice(0, 120)}...`);
        messages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }

      // Call #2 tanpa tools (jawaban akhir setelah hasil tool)
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
      cost: calcCost(promptTokens, completionTokens),
    };
  } catch (err) {
    llmRecordOutcome(false);
    console.error("[chat] LLM error:", (err as Error).message);
    const [reply, suggested] = pickFallback();
    return { reply, suggested, promptTokens, completionTokens, cost: calcCost(promptTokens, completionTokens) };
  }
}

export function calcCost(prompt: number, completion: number): number {
  return (prompt / 1_000_000) * COST_INPUT_PER_1M + (completion / 1_000_000) * COST_OUTPUT_PER_1M;
}
