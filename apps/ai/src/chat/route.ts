/**
 * Routes chatbot — user + policy guard (guardrail → ban → rate limit → quota → cache → agent).
 *
 * Header dari apps/server proxy: Authorization (Bearer), x-session-id, x-user-id (null=guest).
 */
import { Hono } from "hono";
import { z } from "zod";
import { record } from "../analytics/events";
import type { Env } from "../config";
import * as store from "../db/chat-store";
import { unsafe } from "../db/db";
import { ensureAiTables } from "../db/schema-init";
import { validateMessageInput } from "../policies/guardrails";
import { quotaPolicy } from "../policies/quota";
import { AUTH_RATE_LIMIT_PER_MIN, acquireRateLimitSlot, GUEST_RATE_LIMIT_PER_MIN } from "../policies/rate-limit";
import { exactCacheGet, exactCachePut } from "./cache";
import { generateChatReply } from "./responder";

const chatRoute = new Hono<{ Bindings: Env }>();

const ChatBody = z.object({ message: z.string().min(1).max(4000), session_id: z.string().optional() });
const FeedbackBody = z.object({ message_id: z.number(), feedback: z.enum(["up", "down", "none"]).nullable() });

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
  const message = parsed.data.message;

  const userId = c.req.header("x-user-id") ?? null;
  const isAuth = userId !== null;
  const key = c.req.header("x-session-id") || parsed.data.session_id || `anon-${crypto.randomUUID().slice(0, 12)}`;

  await ensureAiTables(c).catch(() => {});

  // 1. Guardrail input
  const g = validateMessageInput(message);
  if (!g.ok) {
    record(c, { sessionId: key, userId, event: "guardrail_blocked", data: { reason: g.reason } });
    return c.json({ error: `Input ditolak (${g.reason})` }, 400);
  }

  // 2. Session + ban (session & by-user)
  const session = await store.getOrCreateSession(c, key, userId).catch(() => null);
  const banned = session?.banned || (userId ? await store.isUserBanned(c, userId).catch(() => false) : false);
  if (banned) {
    record(c, { sessionId: key, userId, event: "guardrail_blocked", data: { reason: "banned" } });
    return c.json(
      { reply: "Akun ini telah dibatasi. Hubungi admin untuk info lebih lanjut.", remaining: 0, requires_auth: false },
      403,
    );
  }

  // 3. Rate limit: auth 15/mnt/user, guest 5/mnt/session
  const rlOk = await acquireRateLimitSlot(
    c,
    isAuth ? `u:${userId}` : `s:${key}`,
    isAuth ? AUTH_RATE_LIMIT_PER_MIN : GUEST_RATE_LIMIT_PER_MIN,
  );
  if (!rlOk) {
    record(c, { sessionId: key, userId, event: "rate_limited", data: { is_auth: isAuth } });
    return c.json({ error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit.", rate_limited: true }, 429);
  }

  // 4. Cache exact (skip quota, hemat token)
  const cached = await exactCacheGet(c, message).catch(() => null);
  if (cached?.answer) {
    record(c, { sessionId: key, userId, event: "cache_hit" });
    store.saveMessage(c, key, "user", message).catch(() => {});
    const m = await store.saveMessage(c, key, "assistant", cached.answer).catch(() => null);
    const used = await store.countMessages(c, key).catch(() => 0);
    return sse({
      session_id: key,
      message_id: m?.id ?? undefined,
      remaining: isAuth ? undefined : Math.max(0, quotaPolicy(false).max - used),
      requires_auth: false,
      full_reply: cached.answer,
    });
  }
  record(c, { sessionId: key, userId, event: "cache_miss" });

  // 5. Quota: guest dibatasi 3, auth unlimited (rate limit di atas yang jaga)
  let usedCount = 0;
  if (!isAuth) {
    const reserved = await store.reserveMessageSlot(c, key, quotaPolicy(false).max).catch(() => 1);
    if (reserved === null) {
      record(c, { sessionId: key, userId, event: "quota_exhausted" });
      return c.json(
        {
          reply: quotaPolicy(false).exhaustedMessage,
          remaining: 0,
          requires_auth: true,
          redirect_url: "/login?from=chat",
        },
        403,
      );
    }
    usedCount = reserved;
  } else {
    usedCount = await store.countMessages(c, key).catch(() => 0);
  }

  // 6. Agent (history + LLM + tools)
  const history = await store.getHistory(c, key, 6).catch(() => []);
  const result = await generateChatReply(c, {
    message,
    history: history.map((m) => ({ role: m.role, content: m.content })),
    sessionId: key,
    userId,
  });

  // 7. Persist + cache + analytics
  store.saveMessage(c, key, "user", message).catch(() => {});
  const assistant = await store
    .saveMessage(c, key, "assistant", result.reply, {
      prompt: result.promptTokens,
      completion: result.completionTokens,
      cost: result.cost,
    })
    .catch(() => null);

  record(c, {
    sessionId: key,
    userId,
    event: result.toolsUsed.length ? "reply_ok" : "reply_ok",
    data: { tools: result.toolsUsed },
  });
  for (const tool of result.toolsUsed) {
    record(c, { sessionId: key, userId, event: "tool_called", data: { tool } });
  }
  if (result.reply)
    exactCachePut(c, message, result.reply, result.suggested, {
      prompt: result.promptTokens,
      completion: result.completionTokens,
    }).catch(() => {});

  return sse({
    session_id: key,
    message_id: assistant?.id ?? undefined,
    remaining: isAuth ? undefined : Math.max(0, quotaPolicy(false).max - usedCount),
    requires_auth: false,
    full_reply: result.reply,
    suggested_questions: result.suggested,
    _debug: result.chatDebug,
  });
});

// ── quota / history / feedback / track ────────────────────────────
chatRoute.get("/quota", async (c) => {
  const isAuth = !!c.req.header("x-user-id");
  const key = c.req.header("x-session-id") ?? c.req.query("session_id") ?? "";
  if (!key) return c.json({ error: "missing session" }, 400);
  const used = await store.countMessages(c, key).catch(() => 0);
  if (isAuth) return c.json({ remaining: null, limit: "unlimited", requires_auth: false });
  return c.json({
    remaining: Math.max(0, quotaPolicy(false).max - used),
    limit: quotaPolicy(false).max,
    requires_auth: !isAuth,
  });
});

chatRoute.get("/history", async (c) => {
  const key = c.req.header("x-session-id") ?? c.req.query("session_id") ?? "";
  if (!key) return c.json({ error: "missing session" }, 400);
  const messages = await store.getHistory(c, key, 20).catch(() => []);
  return c.json({ messages, total: messages.length });
});

chatRoute.post("/feedback", async (c) => {
  const b = FeedbackBody.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "invalid body" }, 400);
  const { message_id, feedback } = b.data;
  const key = c.req.header("x-session-id") ?? "";
  const userId = c.req.header("x-user-id") ?? null;
  await store.setFeedback(c, message_id, feedback === "none" ? null : feedback).catch(() => {});
  record(c, { sessionId: key, userId, event: "feedback", data: { message_id, feedback } });
  return c.json({ ok: true });
});

chatRoute.post("/track/login-click", async (c) => {
  const key = c.req.header("x-session-id") ?? "";
  const userId = c.req.header("x-user-id") ?? null;
  if (!key) return c.json({ error: "missing session" }, 400);
  await unsafe(c, "UPDATE chatbot_sessions SET clicked_login = TRUE WHERE id = $1", [key]).catch(() => {});
  record(c, { sessionId: key, userId, event: "login_click" });
  return c.json({ ok: true });
});

export { chatRoute };
