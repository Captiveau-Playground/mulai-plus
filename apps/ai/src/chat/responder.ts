/**
 * Responder — port sederhana dari python engine/responder.py (tanpa tools dulu).
 * TODO: agent loop (tool calling), history, cache, quota.
 */
import type { AppContext } from "../config";
import { type LlmMessage, llmChatJson, llmFailureShortCircuit, llmRecordOutcome } from "../llm/client";
import { extractTopics, FALLBACK_REPLIES, SYSTEM_PROMPT } from "./prompt";

// Blok reasoning yang dikeluarkan sebagian model (mis. qwen3):  thinking…/response
const THINK_RE = /\s*thinking[\s\S]*?response\s*/;

export function stripThinking(content: string): string {
  return content.replace(THINK_RE, "").trim();
}

export interface ChatOutcome {
  kind: "reply" | "fallback";
  reply: string;
  suggested: string[];
}

const FALLBACK: [string, string[]] = ["Maaf, layanan sedang sibuk. Coba tanya lagi nanti ya! 🙏", ["Coba lagi"]];

export async function generateChatReply(c: AppContext, message: string, _sessionId?: string): Promise<ChatOutcome> {
  const pickFallback = (): [string, string[]] =>
    FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)] ?? FALLBACK;

  // Short-circuit: LLM baru gagal beruntun → balas fallback instan (tanpa nunggu).
  if (llmFailureShortCircuit()) {
    const [reply, suggested] = pickFallback();
    return { kind: "fallback", reply, suggested };
  }

  const messages: LlmMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: message },
  ];

  try {
    const { status, data } = await llmChatJson(c, messages);
    if (status !== 200) {
      llmRecordOutcome(false);
      throw new Error(`LLM HTTP ${status}`);
    }
    llmRecordOutcome(true);

    const content = data?.choices?.[0]?.message?.content ?? "";
    const reply = stripThinking(content) || pickFallback()[0];
    return { kind: "reply", reply, suggested: extractTopics(reply) };
  } catch (err) {
    llmRecordOutcome(false);
    console.error("[chat] LLM error:", (err as Error).message);
    const [reply, suggested] = pickFallback();
    return { kind: "fallback", reply, suggested };
  }
}
