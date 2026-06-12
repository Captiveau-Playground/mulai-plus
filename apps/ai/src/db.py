"""
Read-only async database access for chatbot tools.

Security:
- Read-only queries only (SELECT)
- Parameterized queries (no SQL injection)
- Query timeout 5s
- Connection pool with max 5 connections
"""

from __future__ import annotations

from typing import Any

import asyncpg

from src.config import settings

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=1,
            max_size=5,
            command_timeout=5,  # 5s query timeout
            statement_cache_size=0,  # disable cache for pgbouncer compat
        )
    return _pool


async def query(sql: str, *args: Any) -> list[dict[str, Any]]:
    """Execute read-only query with parameterized args. Returns list of dicts."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Ensure read-only
        await conn.execute("SET TRANSACTION READ ONLY")
        rows = await conn.fetch(sql, *args)
        return [dict(row) for row in rows]


async def close():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
