"""
Chatbot database operations.

Manages sessions, messages, feedback, and cost tracking persistently.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

import asyncpg

from src.config import settings

_pool: asyncpg.Pool | None = None


def _clean_dsn(dsn: str) -> str:
    """Remove unsupported query params from DSN for asyncpg compat."""
    if "?pgbouncer=" in dsn:
        dsn = dsn.split("?pgbouncer=")[0]
    if "?" in dsn and "=" not in dsn.split("?")[-1]:
        dsn = dsn.split("?")[0]
    return dsn


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=_clean_dsn(settings.database_url),
            min_size=1,
            max_size=3,
            command_timeout=10,
            statement_cache_size=0,
        )
    return _pool


async def create_tables():
    """Create tables if not exist (run on startup/idempotent).
    Tables are also created by Drizzle migrations; this ensures
    the AI service can operate even before migrations run.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS chatbot_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                is_auth BOOLEAN DEFAULT FALSE,
                message_count INTEGER DEFAULT 0,
                credit_limit INTEGER DEFAULT NULL,
                banned BOOLEAN DEFAULT FALSE,
                banned_at TIMESTAMPTZ DEFAULT NULL,
                banned_reason TEXT DEFAULT NULL,
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                last_active TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_user
                ON chatbot_sessions(user_id);
        """)
        # Migration: add columns if they don't exist (idempotent for existing tables)
        for col in [
            "ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS credit_limit INTEGER",
            "ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE",
            "ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ",
            "ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS banned_reason TEXT",
            "ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS notes TEXT",
        ]:
            try:
                await conn.execute(col)
            except Exception:
                pass  # some cols may already exist

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS chatbot_messages (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                prompt_tokens INTEGER DEFAULT 0,
                completion_tokens INTEGER DEFAULT 0,
                model TEXT,
                cost NUMERIC(10,8) DEFAULT 0,
                feedback TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_chatbot_messages_session
                ON chatbot_messages(session_id);
            CREATE INDEX IF NOT EXISTS idx_chatbot_messages_created
                ON chatbot_messages(created_at);
        """)


async def get_or_create_session(session_id: str, user_id: Optional[str] = None) -> dict[str, Any]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM chatbot_sessions WHERE id = $1", session_id
        )
        if row:
            return dict(row)
        is_auth = user_id is not None
        await conn.execute(
            "INSERT INTO chatbot_sessions (id, user_id, is_auth) VALUES ($1, $2, $3)",
            session_id, user_id, is_auth,
        )
        return {"id": session_id, "user_id": user_id, "is_auth": is_auth, "message_count": 0}


async def link_session_to_user(session_id: str, user_id: str):
    """Link guest session to user_id so quota endpoint can detect auth."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE chatbot_sessions SET user_id = $1, is_auth = TRUE WHERE id = $2",
            user_id, session_id,
        )


async def get_session_by_user(user_id: str) -> Optional[dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM chatbot_sessions WHERE user_id = $1 ORDER BY last_active DESC LIMIT 1",
            user_id,
        )
        return dict(row) if row else None


async def increment_message_count(session_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        now = datetime.now(timezone.utc)
        await conn.execute(
            "UPDATE chatbot_sessions SET message_count = message_count + 1, last_active = $1 WHERE id = $2",
            now, session_id,
        )


async def save_message(
    session_id: str,
    role: str,
    content: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    model: Optional[str] = None,
    cost: float = 0,
) -> dict[str, Any]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO chatbot_messages
               (session_id, role, content, prompt_tokens, completion_tokens, model, cost)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING id, created_at""",
            session_id, role, content, prompt_tokens, completion_tokens, model, cost,
        )
        return {"id": row["id"], "created_at": row["created_at"].isoformat()}


async def get_history(session_id: str, limit: int = 20) -> list[dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT role, content FROM chatbot_messages
               WHERE session_id = $1
               ORDER BY id ASC LIMIT $2""",
            session_id, limit,
        )
        return [dict(r) for r in rows]


async def set_feedback(message_id: int, feedback: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE chatbot_messages SET feedback = $1 WHERE id = $2",
            feedback, message_id,
        )


async def list_sessions(
    page: int = 0,
    per_page: int = 20,
    search: Optional[str] = None,
    banned_only: bool = False,
) -> dict[str, Any]:
    """List all chatbot sessions with user info and stats."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        conditions: list[str] = []
        params: list[Any] = []
        param_idx = 1

        if search:
            conditions.append(f"(s.id ILIKE ${param_idx} OR s.user_id ILIKE ${param_idx})")
            params.append(f"%{search}%")
            param_idx += 1

        if banned_only:
            conditions.append("s.banned = TRUE")

        where = " WHERE " + " AND ".join(conditions) if conditions else ""

        # Count
        count_sql = f"SELECT COUNT(*) FROM chatbot_sessions s{where}"
        total = await conn.fetchval(count_sql, *params)

        # Fetch page
        offset = page * per_page
        rows = await conn.fetch(
            f"""
            SELECT s.*,
                   u.name as user_name,
                   u.email as user_email,
                   u.image as user_image,
                   (SELECT COUNT(*) FROM chatbot_messages WHERE session_id = s.id) as total_messages,
                   COALESCE((SELECT SUM(cost) FROM chatbot_messages WHERE session_id = s.id), 0) as total_cost,
                   CASE
                       WHEN s.credit_limit IS NOT NULL THEN
                           CASE WHEN s.credit_limit = -1 THEN NULL ELSE GREATEST(0, s.credit_limit - s.message_count) END
                       WHEN s.is_auth THEN GREATEST(0, 5 - s.message_count)
                       ELSE GREATEST(0, 1 - s.message_count)
                   END as remaining
            FROM chatbot_sessions s
            LEFT JOIN "user" u ON u.id = s.user_id
            {where}
            ORDER BY s.last_active DESC NULLS LAST
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
            """,
            *params, per_page, offset,
        )

        return {
            "sessions": [dict(r) for r in rows],
            "total": total or 0,
            "page": page,
            "per_page": per_page,
        }


async def get_session_detail(session_id: str) -> Optional[dict[str, Any]]:
    """Get session with all messages."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT s.*, u.name as user_name, u.email as user_email, u.image as user_image
               FROM chatbot_sessions s
               LEFT JOIN "user" u ON u.id = s.user_id
               WHERE s.id = $1""",
            session_id,
        )
        if not row:
            return None

        messages = await conn.fetch(
            """SELECT id, role, content, prompt_tokens, completion_tokens,
                      model, cost, feedback, created_at
               FROM chatbot_messages
               WHERE session_id = $1
               ORDER BY id ASC""",
            session_id,
        )

        result = dict(row)
        result["messages"] = [dict(m) for m in messages]
        result["total_messages"] = len(messages)
        result["total_cost"] = sum(float(m.get("cost", 0) or 0) for m in messages) if messages else 0.0
        return result


async def update_credit_limit(session_id: str, limit: Optional[int]) -> bool:
    """Set custom credit limit for a session (NULL = use default)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE chatbot_sessions SET credit_limit = $1 WHERE id = $2",
            limit, session_id,
        )
        return "UPDATE 1" in result


async def toggle_ban(
    session_id: str,
    banned: bool,
    reason: Optional[str] = None,
) -> bool:
    """Ban or unban a session."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        now = datetime.now(timezone.utc)
        if banned:
            result = await conn.execute(
                """UPDATE chatbot_sessions
                   SET banned = TRUE, banned_at = $1, banned_reason = $2
                   WHERE id = $3""",
                now, reason, session_id,
            )
        else:
            result = await conn.execute(
                """UPDATE chatbot_sessions
                   SET banned = FALSE, banned_at = NULL, banned_reason = NULL
                   WHERE id = $1""",
                session_id,
            )
        return "UPDATE 1" in result


async def update_notes(session_id: str, notes: Optional[str]) -> bool:
    """Set admin notes for a session."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE chatbot_sessions SET notes = $1 WHERE id = $2",
            notes, session_id,
        )
        return "UPDATE 1" in result


async def is_banned(session_id: str) -> bool:
    """Check if a session is banned."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT banned FROM chatbot_sessions WHERE id = $1", session_id
        )
        return row["banned"] if row else False


async def get_active_limit(session_id: str, default_limit: int) -> int:
    """Get effective credit limit, checking custom override first."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT credit_limit FROM chatbot_sessions WHERE id = $1", session_id
        )
        if row and row["credit_limit"] is not None:
            return row["credit_limit"]
        return default_limit


async def get_stats() -> dict[str, Any]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        total_sessions = await conn.fetchval("SELECT COUNT(*) FROM chatbot_sessions")
        guest_sessions = await conn.fetchval(
            "SELECT COUNT(*) FROM chatbot_sessions WHERE is_auth = FALSE"
        )
        auth_sessions = total_sessions - guest_sessions
        total_messages = await conn.fetchval("SELECT COUNT(*) FROM chatbot_messages")
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_messages = await conn.fetchval(
            "SELECT COUNT(*) FROM chatbot_messages WHERE created_at >= $1", today
        )
        today_sessions = await conn.fetchval(
            "SELECT COUNT(*) FROM chatbot_sessions WHERE last_active >= $1", today
        )

        # Top questions
        top_rows = await conn.fetch(
            """SELECT content, COUNT(*) as cnt FROM chatbot_messages
               WHERE role = 'user'
               GROUP BY content ORDER BY cnt DESC LIMIT 10"""
        )
        top_questions = [{"question": r["content"], "count": r["cnt"]} for r in top_rows]

        # Recent questions
        recent_rows = await conn.fetch(
            """SELECT m.content, COALESCE(s.is_auth, FALSE) as is_auth
               FROM chatbot_messages m
               LEFT JOIN chatbot_sessions s ON s.id = m.session_id
               WHERE m.role = 'user'
               ORDER BY m.id DESC LIMIT 50"""
        )
        recent_questions = [{"question": r["content"], "is_auth": r["is_auth"]} for r in recent_rows]

        # Cost stats
        cost_row = await conn.fetchrow(
            "SELECT SUM(cost) as total_cost, SUM(prompt_tokens) as total_prompt, SUM(completion_tokens) as total_completion FROM chatbot_messages"
        )

        return {
            "total_sessions": total_sessions or 0,
            "guest_sessions": guest_sessions or 0,
            "auth_sessions": auth_sessions or 0,
            "total_messages": total_messages or 0,
            "today_messages": today_messages or 0,
            "today_sessions": today_sessions or 0,
            "recent_questions": recent_questions,
            "top_questions": top_questions,
            "total_cost": float(cost_row["total_cost"] or 0) if cost_row else 0,
            "total_prompt_tokens": cost_row["total_prompt"] or 0 if cost_row else 0,
            "total_completion_tokens": cost_row["total_completion"] or 0 if cost_row else 0,
        }


async def reset_message_count(session_id: str, count: int = 0) -> bool:
    """Reset or set message_count for a session (admin use)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE chatbot_sessions SET message_count = $1 WHERE id = $2",
            count, session_id,
        )
        return "UPDATE 1" in result


async def close():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
