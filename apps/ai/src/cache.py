"""
Answer cache for chatbot — exact match + fuzzy match + LFU/LRU eviction.
"""

from __future__ import annotations

import hashlib
import json
import re
from difflib import SequenceMatcher
from typing import Any, Optional

from src.db import get_pool

_CACHE_MAX_SIZE = 1000
_CACHE_FUZZY_THRESHOLD = 0.82


def _normalize(text: str) -> str:
    t = text.lower().strip()
    t = re.sub(r"[^a-z0-9\s]", "", t)
    return re.sub(r"\s+", " ", t)


def _token_similarity(a: str, b: str) -> float:
    toks_a = set(_normalize(a).split())
    toks_b = set(_normalize(b).split())
    if not toks_a or not toks_b:
        return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()
    overlap = len(toks_a & toks_b) / max(len(toks_a), len(toks_b))
    seq = SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()
    return 0.6 * overlap + 0.4 * seq


async def get_cached_answer(question: str) -> Optional[dict]:
    """Exact match first, then fuzzy match against top-20 popular questions."""
    pool = await get_pool()
    q_hash = hashlib.sha256(question.strip().lower().encode()).hexdigest()
    norm = _normalize(question)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT answer, follow_ups, token_usage FROM chatbot_cache WHERE question_hash = $1",
            q_hash,
        )
        if row:
            await conn.execute(
                "UPDATE chatbot_cache SET hit_count = hit_count + 1, last_accessed_at = NOW() WHERE question_hash = $1",
                q_hash,
            )
            tu = row.get("token_usage")
            if isinstance(tu, str):
                tu = json.loads(tu)
            return {"reply": row["answer"], "follow_ups": row.get("follow_ups"), "from_cache": True, "token_usage": tu}

        rows = await conn.fetch(
            "SELECT question, question_normalized, answer, follow_ups, token_usage "
            "FROM chatbot_cache ORDER BY hit_count DESC LIMIT 20"
        )
        for r in rows:
            if _token_similarity(norm, r["question_normalized"]) >= _CACHE_FUZZY_THRESHOLD:
                cache_hash = hashlib.sha256(r["question"].strip().lower().encode()).hexdigest()
                await conn.execute(
                    "UPDATE chatbot_cache SET hit_count = hit_count + 1, last_accessed_at = NOW() WHERE question_hash = $1",
                    cache_hash,
                )
                tu = r.get("token_usage")
                if isinstance(tu, str):
                    tu = json.loads(tu)
                return {"reply": r["answer"], "follow_ups": r.get("follow_ups"), "from_cache": True, "token_usage": tu}

    return None


async def set_cached_answer(
    question: str,
    answer: str,
    follow_ups: Optional[list] = None,
    token_usage: Optional[dict] = None,
):
    """Store answer and evict LFU/LRU when over limit."""
    pool = await get_pool()
    q_hash = hashlib.sha256(question.strip().lower().encode()).hexdigest()
    norm = _normalize(question)

    async with pool.acquire() as conn:
        if await conn.fetchrow("SELECT 1 FROM chatbot_cache WHERE question_hash = $1", q_hash):
            await conn.execute(
                "UPDATE chatbot_cache SET answer=$1, follow_ups=$2, token_usage=$3, "
                "hit_count=hit_count+1, last_accessed_at=NOW() WHERE question_hash=$4",
                answer, json.dumps(follow_ups) if follow_ups else None,
                json.dumps(token_usage) if token_usage else None, q_hash,
            )
            return

        count = await conn.fetchval("SELECT COUNT(*) FROM chatbot_cache") or 0
        if count >= _CACHE_MAX_SIZE:
            target = max(0, _CACHE_MAX_SIZE - 50)
            await conn.execute(
                "DELETE FROM chatbot_cache WHERE id IN ("
                "SELECT id FROM chatbot_cache "
                "ORDER BY hit_count ASC, last_accessed_at ASC NULLS LAST "
                f"LIMIT GREATEST(1, (SELECT COUNT(*) - {target} FROM chatbot_cache)))"
            )

        await conn.execute(
            "INSERT INTO chatbot_cache (question_hash, question, question_normalized, answer, follow_ups, token_usage) "
            "VALUES ($1, $2, $3, $4, $5, $6)",
            q_hash, question, norm, answer,
            json.dumps(follow_ups) if follow_ups else None,
            json.dumps(token_usage) if token_usage else None,
        )
