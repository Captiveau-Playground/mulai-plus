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


# Tables created by Drizzle migration
    """Create tables if not exist (run on startup)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS chatbot_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                is_auth BOOLEAN DEFAULT FALSE,
                message_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                last_active TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_user
                ON chatbot_sessions(user_id);
        """)
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


async def close():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
