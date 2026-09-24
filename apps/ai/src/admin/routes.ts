/**
 * Admin routes chatbot (/api/admin/*) — kontrak menyesuaikan UI web
 * (oRPC router packages/api/src/routers/ai.ts + halaman chatbot-analytics/users).
 *
 * Auth dua lapis: apps/server requireAdmin (session admin) → worker ini cek Bearer.
 */
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../config";
import { query, queryOne } from "../db/db";
import { ensureAiTables } from "../db/schema-init";

const adminRoute = new Hono<{ Bindings: Env }>();

/** remaining: guest = 3-count; auth = null (unlimited); credit_limit override. */
const remainingExpr = `
  GREATEST(0, CASE
    WHEN s.credit_limit IS NOT NULL THEN
      CASE WHEN s.credit_limit = -1 THEN NULL ELSE s.credit_limit - s.message_count END
    WHEN s.is_auth THEN NULL
    ELSE 3 - s.message_count
  END)`;

// ── stats (cocok interface Stats di UI) ─────────────────────
adminRoute.get("/stats", async (c) => {
  await ensureAiTables(c).catch(() => {});
  const [sessions, guestSessions, messages, todayMsg, todaySess, costRow, topRows, recentRows] = await Promise.all([
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions WHERE is_auth = FALSE"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_messages"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_messages WHERE created_at >= date_trunc('day', now())"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions WHERE last_active >= date_trunc('day', now())"),
    queryOne<{ s: string; p: string; co: string }>(
      c,
      "SELECT COALESCE(SUM(cost),0) s, COALESCE(SUM(prompt_tokens),0) p, COALESCE(SUM(completion_tokens),0) co FROM chatbot_messages",
    ),
    query(
      c,
      "SELECT content question, COUNT(*) count FROM chatbot_messages WHERE role = 'user' GROUP BY content ORDER BY count DESC LIMIT 10",
    ),
    query(
      c,
      `SELECT m.content question, COALESCE(s.is_auth, FALSE) is_auth
       FROM chatbot_messages m LEFT JOIN chatbot_sessions s ON s.id = m.session_id
       WHERE m.role = 'user' ORDER BY m.id DESC LIMIT 50`,
    ),
  ]);
  const total = Number(sessions?.n ?? 0);
  const guest = Number(guestSessions?.n ?? 0);
  return c.json({
    total_sessions: total,
    guest_sessions: guest,
    auth_sessions: total - guest,
    total_messages: Number(messages?.n ?? 0),
    today_messages: Number(todayMsg?.n ?? 0),
    today_sessions: Number(todaySess?.n ?? 0),
    recent_questions: recentRows.map((r) => ({ question: r.question, is_auth: !!r.is_auth })),
    top_questions: topRows.map((r) => ({ question: r.question, count: Number(r.count) })),
    total_cost: Number(costRow?.s ?? 0),
    total_prompt_tokens: Number(costRow?.p ?? 0),
    total_completion_tokens: Number(costRow?.co ?? 0),
  });
});

// ── sessions list (cocok interface Session di UI) ────────────
adminRoute.get("/sessions", async (c) => {
  const page = Number(c.req.query("page") ?? 0);
  const perPage = Number(c.req.query("per_page") ?? 20);
  const search = c.req.query("search") ?? "";
  const bannedOnly = c.req.query("banned_only") === "true";

  const conds: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    conds.push(`(s.id ILIKE $${params.length} OR s.user_id ILIKE $${params.length})`);
  }
  if (bannedOnly) conds.push("s.banned = TRUE");
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const sessions = await query(
    c,
    `SELECT s.*,
            u.name as user_name, u.email as user_email, u.image as user_image,
            (SELECT COUNT(*) FROM chatbot_messages m WHERE m.session_id = s.id) as total_messages,
            COALESCE((SELECT SUM(cost) FROM chatbot_messages m WHERE m.session_id = s.id), 0) as total_cost,
            ${remainingExpr} as remaining
     FROM chatbot_sessions s
     LEFT JOIN "user" u ON u.id = s.user_id
     ${where}
     ORDER BY s.last_active DESC NULLS LAST
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, page * perPage],
  );
  const totalRow = await queryOne<{ n: string }>(c, `SELECT COUNT(*) n FROM chatbot_sessions s ${where}`, params);
  return c.json({
    sessions: sessions.map((s: any) => ({ ...s, total_cost: Number(s.total_cost ?? 0) })),
    total: Number(totalRow?.n ?? 0),
    page,
    per_page: perPage,
  });
});

// ── session detail + messages ────────────────────────────────
adminRoute.get("/sessions/:id", async (c) => {
  const id = c.req.param("id");
  const session = await queryOne(
    c,
    `SELECT s.*, u.name as user_name, u.email as user_email, u.image as user_image,
            ${remainingExpr} as remaining
     FROM chatbot_sessions s
     LEFT JOIN "user" u ON u.id = s.user_id
     WHERE s.id = $1`,
    [id],
  );
  if (!session) return c.json({ error: "Session tidak ditemukan" }, 404);
  const messages = await query(
    c,
    `SELECT id, role, content, prompt_tokens, completion_tokens, model, cost, feedback, created_at
     FROM chatbot_messages WHERE session_id = $1 ORDER BY id ASC`,
    [id],
  );
  const costRow = await queryOne<{ s: string }>(
    c,
    "SELECT COALESCE(SUM(cost),0) s FROM chatbot_messages WHERE session_id = $1",
    [id],
  );
  return c.json({
    ...session,
    messages,
    total_messages: messages.length,
    total_cost: Number(costRow?.s ?? 0),
  });
});

// ── credit / ban / notes / reset (payload sesuai router oRPC) ─
const CreditBody = z.object({ credit_limit: z.number().nullable() });
adminRoute.put("/sessions/:id/credit", async (c) => {
  const b = CreditBody.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "invalid body" }, 400);
  await query(c, "UPDATE chatbot_sessions SET credit_limit = $1 WHERE id = $2", [
    b.data.credit_limit,
    c.req.param("id"),
  ]);
  return c.json({ ok: true });
});

const BanBody = z.object({ banned: z.boolean(), reason: z.string().nullable().optional() });
adminRoute.put("/sessions/:id/ban", async (c) => {
  const b = BanBody.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "invalid body" }, 400);
  const { banned, reason } = b.data;
  await query(
    c,
    banned
      ? "UPDATE chatbot_sessions SET banned = TRUE, banned_at = NOW(), banned_reason = $1 WHERE id = $2"
      : "UPDATE chatbot_sessions SET banned = FALSE, banned_at = NULL, banned_reason = NULL WHERE id = $1",
    banned ? [reason ?? null, c.req.param("id")] : [c.req.param("id")],
  );
  return c.json({ ok: true });
});

const NotesBody = z.object({ notes: z.string().nullable().optional() });
adminRoute.put("/sessions/:id/notes", async (c) => {
  const b = NotesBody.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "invalid body" }, 400);
  await query(c, "UPDATE chatbot_sessions SET notes = $1 WHERE id = $2", [b.data.notes ?? null, c.req.param("id")]);
  return c.json({ ok: true });
});

const ResetBody = z.object({ message_count: z.number().default(0) });
adminRoute.put("/sessions/:id/reset-usage", async (c) => {
  const b = ResetBody.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "invalid body" }, 400);
  await query(c, "UPDATE chatbot_sessions SET message_count = $1 WHERE id = $2", [
    b.data.message_count,
    c.req.param("id"),
  ]);
  return c.json({ ok: true });
});

// ── funnel (format python) ───────────────────────────────────
adminRoute.get("/funnel", async (c) => {
  await ensureAiTables(c).catch(() => {});
  const [total, guests, hitLimit, clicked, converted] = await Promise.all([
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions WHERE is_auth = FALSE"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions WHERE is_auth = FALSE AND message_count >= 3"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions WHERE clicked_login = TRUE"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions WHERE is_auth = FALSE AND user_id IS NOT NULL"),
  ]);
  const guestTotal = Number(guests?.n ?? 0);
  const guestClicked = Number(clicked?.n ?? 0);
  const guestConverted = Number(converted?.n ?? 0);
  return c.json({
    total_sessions: Number(total?.n ?? 0),
    guest_total: guestTotal,
    guest_hit_limit: Number(hitLimit?.n ?? 0),
    guest_clicked_login: guestClicked,
    guest_converted: guestConverted,
    conversion_rate: guestTotal ? Math.round((guestConverted / guestTotal) * 1000) / 10 : 0,
    click_rate: guestTotal ? Math.round((guestClicked / guestTotal) * 1000) / 10 : 0,
  });
});

// ── cache-stats + events (bonus observability) ──────────────
adminRoute.get("/cache-stats", async (c) => {
  const [total, hits] = await Promise.all([
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_cache"),
    queryOne<{ s: string }>(c, "SELECT COALESCE(SUM(hit_count),0) s FROM chatbot_cache"),
  ]);
  return c.json({ entries: Number(total?.n ?? 0), total_hits: Number(hits?.s ?? 0) });
});

adminRoute.get("/events", async (c) => {
  await ensureAiTables(c).catch(() => {});
  const rows = await query(
    c,
    `SELECT event, COUNT(*) n
     FROM chatbot_events
     WHERE created_at >= COALESCE($1::timestamptz, now() - interval '7 days')
     GROUP BY event ORDER BY n DESC`,
    [c.req.query("since") ? new Date(c.req.query("since") as string) : null],
  );
  return c.json({ events: rows });
});

export { adminRoute };
