/**
 * Admin routes chatbot (/api/admin/*) — dikunci dua lapis:
 *  1. apps/server proxy requireAdmin (session role admin) → teruskan
 *  2. worker ini tetap cek Bearer AI_API_KEY (middleware global /api/*)
 *
 * Kontrak mengikuti python routes.py (stats, sessions, credit, ban, notes,
 * reset-usage, funnel, cache-stats) supaya dashboard admin bisa colok.
 */
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../config";
import { getHistory } from "../db/chat-store";
import { query, queryOne } from "../db/db";
import { ensureAiTables } from "../db/schema-init";

const adminRoute = new Hono<{ Bindings: Env }>();

// ── stats ──────────────────────────────────────────────
adminRoute.get("/stats", async (c) => {
  await ensureAiTables(c).catch(() => {});
  const [sessions, messages, events, todayMsg, todaySess, cost] = await Promise.all([
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_messages"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_events"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_messages WHERE created_at >= date_trunc('day', now())"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions WHERE last_active >= date_trunc('day', now())"),
    queryOne<{ s: string }>(c, "SELECT COALESCE(SUM(cost),0) s FROM chatbot_messages"),
  ]);
  return c.json({
    total_sessions: Number(sessions?.n ?? 0),
    total_messages: Number(messages?.n ?? 0),
    total_events: Number(events?.n ?? 0),
    today_messages: Number(todayMsg?.n ?? 0),
    today_sessions: Number(todaySess?.n ?? 0),
    total_cost: Number(cost?.s ?? 0),
  });
});

// ── sessions (list + search) ───────────────────────────
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
            (SELECT COUNT(*) FROM chatbot_messages m WHERE m.session_id = s.id) as total_messages,
            (SELECT COUNT(*) FROM chatbot_events e WHERE e.session_id = s.id) as total_events
     FROM chatbot_sessions s
     ${where}
     ORDER BY s.last_active DESC NULLS LAST
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, page * perPage],
  );
  const totalRow = await queryOne<{ n: string }>(c, `SELECT COUNT(*) n FROM chatbot_sessions s ${where}`, params);
  return c.json({ sessions, total: Number(totalRow?.n ?? 0), page, per_page: perPage });
});

// ── session detail + messages ──────────────────────────
adminRoute.get("/sessions/:id", async (c) => {
  const id = c.req.param("id");
  const session = await queryOne(c, "SELECT * FROM chatbot_sessions WHERE id = $1", [id]);
  if (!session) return c.json({ error: "Session tidak ditemukan" }, 404);
  const messages = await getHistory(c, id, 10_000);
  return c.json({ ...session, messages });
});

// ── credit / ban / notes / reset (PUT) ─────────────────
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

const BanBody = z.object({ banned: z.boolean(), reason: z.string().optional() });
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

const NotesBody = z.object({ notes: z.string().nullable() });
adminRoute.put("/sessions/:id/notes", async (c) => {
  const b = NotesBody.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "invalid body" }, 400);
  await query(c, "UPDATE chatbot_sessions SET notes = $1 WHERE id = $2", [b.data.notes, c.req.param("id")]);
  return c.json({ ok: true });
});

const ResetBody = z.object({ count: z.number().default(0) });
adminRoute.put("/sessions/:id/reset-usage", async (c) => {
  const b = ResetBody.safeParse(await c.req.json().catch(() => null));
  if (!b.success) return c.json({ error: "invalid body" }, 400);
  await query(c, "UPDATE chatbot_sessions SET message_count = $1 WHERE id = $2", [b.data.count, c.req.param("id")]);
  return c.json({ ok: true });
});

// ── funnel ─────────────────────────────────────────────
adminRoute.get("/funnel", async (c) => {
  await ensureAiTables(c).catch(() => {});
  const [total, guests, hitLimit, clickedLogin, converted] = await Promise.all([
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions WHERE is_auth = FALSE"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions WHERE is_auth = FALSE AND message_count >= 3"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions WHERE clicked_login = TRUE"),
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_sessions WHERE is_auth = FALSE AND user_id IS NOT NULL"),
  ]);
  const guestTotal = Number(guests?.n ?? 0);
  const guestConverted = Number(converted?.n ?? 0);
  return c.json({
    total_sessions: Number(total?.n ?? 0),
    guest_total: guestTotal,
    guest_hit_limit: Number(hitLimit?.n ?? 0),
    guest_clicked_login: Number(clickedLogin?.n ?? 0),
    guest_converted: guestConverted,
    conversion_rate: guestTotal ? Math.round((guestConverted / guestTotal) * 1000) / 10 : 0,
  });
});

// ── cache-stats + event summary ────────────────────────
adminRoute.get("/cache-stats", async (c) => {
  const [total, hits] = await Promise.all([
    queryOne<{ n: string }>(c, "SELECT COUNT(*) n FROM chatbot_cache"),
    queryOne<{ s: string }>(c, "SELECT COALESCE(SUM(hit_count),0) s FROM chatbot_cache"),
  ]);
  return c.json({ entries: Number(total?.n ?? 0), total_hits: Number(hits?.s ?? 0) });
});

// ringkasan event (signal chunks) — analytics utama
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
