/**
 * POST /api/chat — SSE streaming (kontrak sama persis dengan frontend).
 *
 * Frontend (chatbot-widget) membaca baris:
 *   `data: {full_reply, message_id, suggested_questions, remaining, ...}`
 *
 * Alur (skeleton — tools & persistence menyusul):
 *   1. validasi body {message, session_id}
 *   2. short-circuit LLM kalau provider baru gagal (fallback ramah)
 *   3. panggil Workers AI (qwen3-30b)
 *   4. bersihkan blok reasoning (thinking...), ambil follow-up topics
 *   5. kirim SATU event akhir `data:{full_reply,...}` (pattern akhir python)
 *
 * TODO (port dari python): tool calling loop + history + quota + simpan DB.
 */
import { Hono } from "hono";
import { z } from "zod";
import { generateChatReply } from "./responder";

const chatRoute = new Hono<{ Bindings: any }>();

const ChatRequest = z.object({
  message: z.string().min(1).max(4000),
  session_id: z.string().optional(),
});

chatRoute.post("/chat", async (c) => {
  const body = ChatRequest.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: "Invalid request", detail: body.error.flatten() }, 400);
  }

  const outcome = await generateChatReply(c as any, body.data.message, body.data.session_id);

  if (outcome.kind === "fallback") {
    // JSON path (frontend handle application/json)
    return c.json({
      reply: outcome.reply,
      message_id: crypto.randomUUID(),
      suggested_questions: outcome.suggested,
      remaining: null,
    });
  }

  const event = {
    full_reply: outcome.reply,
    message_id: crypto.randomUUID(),
    suggested_questions: outcome.suggested,
    remaining: null,
  };

  // SSE: satu event akhir (pattern python). Token-streaming menyusul.
  return new Response(`data: ${JSON.stringify(event)}\n\n`, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
});

export { chatRoute };
