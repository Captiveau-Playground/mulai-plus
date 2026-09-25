/**
 * Trial Phase 1 — streaming dengan protokol AI SDK 5 (parts).
 * Endpoint: POST /api/chat/stream (dipakai useChat di halaman trial /trial/chat)
 *
 * Wire format (SSE, satu object JSON per baris `data:`; protokol UIMessage v4 @ai-sdk/react):
 *   {"type":"tool-input-start",     "toolCallId":...,"toolName":...}                    (jika ada)
 *   {"type":"tool-input-delta",     "toolCallId":...,"inputTextDelta":"{...}"}
 *   {"type":"tool-input-available", "toolCallId":...,"toolName":...,"input":{...}}
 *   {"type":"tool-output-available","toolCallId":...,"output":...}
 *   {"type":"text-start","id":...}
 *   {"type":"text-delta","id":...,"delta":"..."}
 *   {"type":"text-end","id":...}
 *   {"type":"finish","id":...,"finishReason":"stop"}
 *
 * Alur: guardrail/quota/cache sama; call-1 (tools, non-stream) → tool parts,
 * call-2 STREAM → text deltas → finish. Persist & cache setelah selesai.
 */
import { Hono } from "hono";
import { z } from "zod";
import { type AgentContext, dispatchTool, toolDefinitions } from "../agent/registry";
import { record } from "../analytics/events";
import type { Env } from "../config";
import { DEFAULT_FAST_MODEL, DEFAULT_MODEL } from "../config";
import * as store from "../db/chat-store";
import { ensureAiTables } from "../db/schema-init";
import { allowRequest } from "../do/access";
import { dailyStub } from "../do/access-daily";
import { type LlmMessage, llmChatJson, llmChatStream } from "../llm/client";
import { validateMessageInput } from "../policies/guardrails";
import { quotaPolicy } from "../policies/quota";
import { AUTH_RATE_LIMIT_PER_MIN, GUEST_RATE_LIMIT_PER_MIN } from "../policies/rate-limit";
import { exactCacheGet, exactCachePut } from "./cache";
import { extractTopics, SYSTEM_PROMPT } from "./prompt";

const streamRoute = new Hono<{ Bindings: Env }>();
const MsgItem = z.object({
  role: z.string(),
  content: z.string().nullable().optional(),
  text: z.string().optional(),
  parts: z.array(z.unknown()).optional(),
});
// Terima body useChat v4 ({id, messages:[...]}) maupun legacy {message}
const Body = z
  .object({
    message: z.string().max(4000).optional(),
    messages: z.array(MsgItem).optional(),
    session_id: z.string().optional(),
    // Tier model tersamar (dari UI): cepat | seimbang | maksimal
    model: z.enum(["simple", "smart", "premium"]).optional(),
  })
  .transform((d) => {
    let msg = d.message?.trim() ?? "";
    if (!msg && Array.isArray(d.messages)) {
      for (const m of [...d.messages].reverse()) {
        if (m.role !== "user") continue;
        if (typeof m.content === "string" && m.content.trim()) {
          msg = m.content.trim();
          break;
        }
        const parts = (m.parts ?? []) as { kind?: string; type?: string; text?: string }[];
        const t = parts
          .filter((p) => (p.kind ?? p.type) === "text")
          .map((p) => p.text ?? "")
          .join("")
          .trim();
        if (t) {
          msg = t;
          break;
        }
        if (m.text?.trim()) {
          msg = m.text.trim();
          break;
        }
      }
    }
    return { message: msg, session_id: d.session_id, model: d.model };
  })
  .refine((d) => d.message.length >= 1 && d.message.length <= 4000, { message: "message wajib 1..4000 char" });
const TIER_MODELS: Record<string, string> = {
  simple: DEFAULT_FAST_MODEL, // glm-4.7-flash
  smart: DEFAULT_MODEL, // qwen3-30b
  premium: "@cf/openai/gpt-oss-120b", // gpt-oss-120b
};
// Kuota harian per tier (per user): -1 = unlimited. Preview env overridable.
const TIER_QUOTA: Record<string, number> = {
  simple: Number(process.env.QUOTA_SIMPLE ?? -1),
  smart: Number(process.env.QUOTA_SMART ?? -1),
  premium: Number(process.env.QUOTA_PREMIUM ?? 5),
};
const part = (o: Record<string, unknown>) => `data: ${JSON.stringify(o)}\n\n`;

streamRoute.post("/chat/stream", async (c) => {
  const parsed = Body.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const { message } = parsed.data;

  const userId = c.req.header("x-user-id") ?? null;
  const isAuth = userId !== null;
  const key = c.req.header("x-session-id") || parsed.data.session_id || `anon-${crypto.randomUUID().slice(0, 12)}`;
  // UI kirim tier via query ?model= (aman lewat transport)
  const tier = parsed.data.model ?? c.req.query("model") ?? "smart";
  await ensureAiTables(c).catch(() => {});

  const modelOverride = TIER_MODELS[tier] ?? DEFAULT_MODEL;

  const g = validateMessageInput(message);
  if (!g.ok) return c.json({ error: `Input ditolak (${g.reason})` }, 400);

  const session = await store.getOrCreateSession(c, key, userId).catch(() => null);
  if (session?.banned || (userId ? await store.isUserBanned(c, userId).catch(() => false) : false)) {
    return c.json({ reply: "Akun ini telah dibatasi. Hubungi admin.", remaining: 0 }, 403);
  }

  let rlOk = true;
  try {
    rlOk = await allowRequest(
      c,
      isAuth ? `u:${userId}` : `s:${key}`,
      isAuth ? AUTH_RATE_LIMIT_PER_MIN : GUEST_RATE_LIMIT_PER_MIN,
      isAuth ? `u:${userId}` : `s:${key}`,
    );
  } catch {
    rlOk = false;
  }
  if (!rlOk) return c.json({ error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit.", rate_limited: true }, 429);

  // Cache hit → text part tunggal (cepat)
  const cached = await exactCacheGet(c, message).catch(() => null);
  if (cached?.answer) {
    await record(c, { sessionId: key, userId, event: "cache_hit" });
    await store.saveMessage(c, key, "user", message).catch(() => {});
    await store.saveMessage(c, key, "assistant", cached.answer).catch(() => {});
    const id = `msg-${Date.now()}`;
    const enc = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(ct) {
          ct.enqueue(enc.encode(part({ type: "text-start", id, role: "assistant" })));
          ct.enqueue(enc.encode(part({ type: "text-delta", id, delta: cached.answer })));
          ct.enqueue(enc.encode(part({ type: "text-end", id })));
          ct.enqueue(enc.encode(part({ type: "finish", id, finishReason: "stop" })));
          ct.close();
        },
      }),
      { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" } },
    );
  }
  record(c, { sessionId: key, userId, event: "cache_miss" });

  // Quota harian per tier model (auth; kala DO tersedia)
  if (isAuth && userId) {
    const limit = TIER_QUOTA[tier] ?? -1;
    if (limit > 0) {
      const stub = dailyStub(c, `u:${userId}`);
      let allowed = true;
      if (stub) {
        try {
          allowed = await stub.checkDaily(tier, limit);
        } catch {
          allowed = true;
        }
      }
      if (!allowed) {
        return c.json(
          {
            error: `Kuota model "${tier}" hari ini habis (${limit} pesan). Ganti ke model lain ya.`,
            quota_exhausted: true,
            model: tier,
            reply: `Kuota model "${tier}" hari ini habis (${limit} pesan). Ganti ke model lain ya.`,
          },
          429,
        );
      }
    }
  }

  // Quota guest
  if (!isAuth) {
    const reserved = await store.reserveMessageSlot(c, key, quotaPolicy(false).max).catch(() => 1);
    if (reserved === null) {
      await record(c, { sessionId: key, userId, event: "quota_exhausted" });
      return c.json({ reply: quotaPolicy(false).exhaustedMessage, remaining: 0, requires_auth: true }, 403);
    }
    void reserved;
  } else {
    void store.countMessages(c, key).catch(() => 0);
  }

  const history = await store.getHistory(c, key, 6).catch(() => []);
  const messages: LlmMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history
      .filter((h) => (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
      .map((h) => ({ role: h.role as LlmMessage["role"], content: h.content })),
    { role: "user", content: message },
  ];
  const ctx: AgentContext = { c, sessionId: key, userId };
  const id = `msg-${Date.now()}`;

  // Call-1: tools (non-stream) → bangun toolParts + messages
  let toolParts = "";
  let llmError = "";
  try {
    const resp1 = await llmChatJson(c, messages, { tools: toolDefinitions(), model: modelOverride });
    if (resp1.status !== 200) throw new Error(`LLM HTTP ${resp1.status}`);
    const msg = resp1.data?.choices?.[0]?.message;
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
      let buf = "";
      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments ?? "{}");
        } catch {
          /* noop */
        }
        const toolCallId = tc.id ?? `call_${Math.random().toString(36).slice(2, 10)}`;
        buf += part({ type: "tool-input-start", toolCallId, toolName: tc.function.name });
        buf += part({ type: "tool-input-delta", toolCallId, inputTextDelta: tc.function.arguments ?? "{}" });
        buf += part({ type: "tool-input-available", toolCallId, toolName: tc.function.name, input: args });
        const result = await dispatchTool(ctx, tc.function.name, args);
        buf += part({ type: "tool-output-available", toolCallId, output: { text: result } });
        messages.push({ role: "tool", tool_call_id: toolCallId, content: result });
        await record(c, { sessionId: key, userId, event: "tool_called", data: { tool: tc.function.name } });
      }
      toolParts = buf;
      await record(c, { sessionId: key, userId, event: "reply_ok" });
    }
  } catch (err) {
    llmError = "Maaf, layanan sedang sibuk. Coba tanya lagi nanti ya! 🙏";
    console.error("[chat/stream] LLM error:", (err as Error).message);
  }

  // Stream final (call-2) — toolParts dikirim lebih dulu (id sama dgn tool parts)
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(ct) {
        try {
          if (toolParts) ct.enqueue(enc.encode(toolParts));

          let finalText = llmError;
          if (!finalText) {
            ct.enqueue(enc.encode(part({ type: "text-start", id, role: "assistant" })));
            const body = await llmChatStream(c, messages, { model: modelOverride });
            const reader = body?.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            while (reader) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() ?? "";
              for (const line of lines) {
                const s = line.trim();
                if (!s.startsWith("data:")) continue;
                const raw = s.slice(5).trim();
                if (raw === "[DONE]") continue;
                try {
                  const j = JSON.parse(raw);
                  // Workers AI kadang kirim delta.content sebagai ANGKA (protokol quirk)
                  const rawC = j?.choices?.[0]?.delta?.content;
                  const piece = rawC == null ? "" : typeof rawC === "string" ? rawC : String(rawC);
                  if (piece) {
                    finalText += piece;
                    ct.enqueue(enc.encode(part({ type: "text-delta", id, delta: piece })));
                  }
                } catch {
                  /* skip */
                }
              }
            }
            ct.enqueue(enc.encode(part({ type: "text-end", id })));
          } else {
            ct.enqueue(enc.encode(part({ type: "text-start", id, role: "assistant" })));
            ct.enqueue(enc.encode(part({ type: "text-delta", id, delta: finalText })));
            ct.enqueue(enc.encode(part({ type: "text-end", id })));
          }

          ct.enqueue(enc.encode(part({ type: "finish", id, finishReason: "stop" })));
          ct.close();

          // persist + cache — via waitUntil supaya TETAP jalan setelah response streaming selesai
          // (tanpa ini, workerd mematikan konteks request begitu body close → pesan tidak tersimpan).
          const execCtx2 = (c as unknown as { executionCtx?: { waitUntil: (p: Promise<unknown>) => void } })
            .executionCtx;
          const finalTextSnap = finalText || "…";
          const persist = async () => {
            await store.saveMessage(c, key, "user", message).catch(() => null);
            await store.saveMessage(c, key, "assistant", finalTextSnap).catch(() => null);
            if (finalText) await exactCachePut(c, message, finalText, extractTopics(finalText), {}).catch(() => {});
          };
          if (execCtx2) execCtx2.waitUntil(persist());
          else void persist();
        } catch (err) {
          console.error("[chat/stream] stream err:", (err as Error).message);
          ct.enqueue(enc.encode(part({ type: "error", id, error: "stream error" })));
          ct.close();
        }
      },
    }),
    { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" } },
  );
});

export { streamRoute };
