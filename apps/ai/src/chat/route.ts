/**
 * Routes chatbot — port apps/ai-python/src/routes.py (core).
 *  - POST /chat    : SSE (kontrak sama dengan frontend)
 *  - GET  /quota   : sisa kuota
 *  - GET  /history : riwayat pesan
 *
 * Header dari apps/server proxy: Authorization (Bearer AI_API_KEY),
 * x-session-id, x-user-id (null = guest).
 */
import { Hono } from "hono";
import { z } from "zod";
import type { AppContext, Env } from "../config";
import * as store from "../db/chat-store";
import { exactCacheGet, exactCachePut } from "./cache";
import { generateChatReply } from "./responder";

const GUEST_LIMIT = 3;
const AUTH_LIMIT = 5;

const chatRoute = new Hono<{ Bindings: Env }>();

const ChatBody = z.object({
  message: z.string().min(1).max(4000),
  session_id: z.string().optional(),
});

type C = AppContext;

/** Sinkronisasi session: key = x-session-id || body.session_id. */
function sessionKey(c: C, bodySessionId?: string): string {
  return c.req.header("x-session-id") || bodySessionId || `anon-${Math.random().toString(36).slice(2, 12)}`;
}

function sse(event: Record<string, unknown>): Response {
  return new Response(`data: ${JSON.stringify(event)}\n\n`, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

chatRoute.post("/chat", async (c) => {
  const parsed = ChatBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const { message } = parsed.data;

  const isAuth = !!c.req.header("x-user-id");
  const limit = isAuth ? AUTH_LIMIT : GUEST_LIMIT;
  const key = sessionKey(c, parsed.data.session_id);

  // 1. Session + ban check
  const session = await store.getOrCreateSession(c, key, c.req.header("x-user-id") ?? null).catch(() => null);
  if (session && (session.banned || (await store.isBanned(c, key)))) {
    return c.json(
      { reply: "Akun ini telah dibatasi. Hubungi admin untuk info lebih lanjut.", remaining: 0, requires_auth: false },
      403,
    );
  }

  // 2. Cache exact (skip quota, seperti python)
  const cached = await exactCacheGet(c, message).catch(() => null);
  if (cached?.answer) {
    store.saveMessage(c, key, "user", message).catch(() => {});
    const m = await store.saveMessage(c, key, "assistant", cached.answer).catch(() => null);
    const used = await store.countMessages(c, key).catch(() => 0);
    return sse({
      session_id: key,
      message_id: m?.id ?? undefined,
      remaining: Math.max(0, limit - used),
      requires_auth: false,
      full_reply: cached.answer,
    });
  }

  // 3. Quota (atomic reserve SEBELUM LLM)
  const reserved = await store.reserveMessageSlot(c, key, limit).catch(() => 1);
  if (reserved === null) {
    return c.json({
      reply: isAuth ? "Kuota chat harian sudah habis. Coba lagi besok ya!" : "Chat gratis habis — login untuk lanjut.",
      remaining: 0,
      requires_auth: !isAuth,
    });
  }
  const remaining = Math.max(0, limit - reserved);

  // 4. History + LLM (tool loop)
  const history = await store.getHistory(c, key, 6).catch(() => []);
  const result = await generateChatReply(
    c as C,
    message,
    history.map((m) => ({ role: m.role, content: m.content })),
  );

  // 5. Persist + cache
  store.saveMessage(c, key, "user", message).catch(() => {});
  const assistant = await store
    .saveMessage(c, key, "assistant", result.reply, {
      prompt: result.promptTokens,
      completion: result.completionTokens,
      cost: result.cost,
    })
    .catch(() => null);
  if (result.reply) {
    // Simpan cache — pertanyaan identik sering diulang (hemat token).
    exactCachePut(c, message, result.reply, result.suggested, {
      prompt: result.promptTokens,
      completion: result.completionTokens,
    }).catch(() => {});
  }

  return sse({
    session_id: key,
    message_id: assistant?.id ?? undefined,
    remaining,
    requires_auth: false,
    full_reply: result.reply,
    suggested_questions: result.suggested,
  });
});

chatRoute.get("/quota", async (c) => {
  const isAuth = !!c.req.header("x-user-id");
  const key = c.req.header("x-session-id") ?? c.req.query("session_id") ?? "";
  if (!key) return c.json({ error: "missing session" }, 400);
  const used = await store.countMessages(c, key).catch(() => 0);
  const limit = isAuth ? AUTH_LIMIT : GUEST_LIMIT;
  return c.json({ remaining: Math.max(0, limit - used), limit, requires_auth: !isAuth });
});

chatRoute.get("/history", async (c) => {
  const key = c.req.header("x-session-id") ?? c.req.query("session_id") ?? "";
  if (!key) return c.json({ error: "missing session" }, 400);
  const messages = await store.getHistory(c, key, 20).catch(() => []);
  return c.json({ messages, total: messages.length });
});

export { chatRoute };
