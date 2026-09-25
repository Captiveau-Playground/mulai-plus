/**
 * MULAI+ AI Service — TypeScript (Hono) di Cloudflare Workers.
 *
 * Pengganti `apps/ai-python` (FastAPI). Jalur panggilan tetap sama:
 *   Next.js → apps/server (proxy /ai/*) → worker ini (POST /chat, dll)
 *
 * Kontrak streaming SAMA persis dengan frontend:
 *   `data: {full_reply, message_id, suggested_questions, remaining, ...}`
 *
 * Rencana fitur (port bertahap dari Python):
 *  - [x] SSE chat via Workers AI (OpenAI-compatible)
 *  - [ ] tool calling (search_universities, search_programs, passing grade)
 *  - [ ] persisten chat (chatbot_sessions/messages) via Hyperdrive + postgres.js
 *  - [ ] cache exact+fuzzy, quota per session, feedback, admin, lead, TMB summary
 *  - [ ] (fase lanjut) RAG Vectorize, Durable Object "student agent"
 */
import { Hono } from "hono";
import { adminRoute } from "./admin/routes";
import { initRag } from "./agent/sources/rag";
import { registerSqlSources } from "./agent/sources/sql-tools";
import { chatRoute } from "./chat/route";
import { streamRoute } from "./chat/stream-route";
import { aiApiKey, type Env } from "./config";
import { RateLimitDO } from "./do/rate-limit";

// Daftarkan source agent sekali per isolate (SQL sekarang, RAG menyusul).
registerSqlSources();
initRag(undefined);

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.text("OK"));

// Auth: shared secret antara apps/server ↔ worker AI (sama seperti python).
app.use("/api/*", async (c, next) => {
  const key = aiApiKey(c);
  if (!key) {
    return c.json({ error: "AI service not configured" }, 503);
  }
  const auth = c.req.header("Authorization") ?? "";
  if (auth !== `Bearer ${key}`) {
    return c.json({ error: "Unauthorized. Provide valid API key." }, 401);
  }
  await next();
});

app.route("/api", chatRoute);
app.route("/api", streamRoute);
app.route("/api/admin", adminRoute);

export { RateLimitDO };
export default app;
