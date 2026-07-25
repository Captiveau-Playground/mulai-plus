"""
API Routes for MULAI+ AI Service.

Changes in this version:
- DB persistence (chatbot_sessions, chatbot_messages)
- Cost tracking per message
- Feedback thumbs up/down
- Streaming response (final answer after tool calling)
- Chat history retrieval
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

logger = logging.getLogger("routes")

from src import cache as cch
from src import chatbot_db as cdb
from src.config import settings
from src.engine.responder import get_response

from src.schemas import (
    ChatRequest,
    ChatResponse,
    ChatStatsResponse,
    FeedbackRequest,
    FeedbackResponse,
    LeadRequest,
    LeadResponse,
    UpdateCreditRequest,
    BanRequest,
    NotesRequest,
    ResetUsageRequest,
    TrackLoginClickRequest,
)

health_router = APIRouter()
chat_router = APIRouter()
admin_router = APIRouter()

GUEST_LIMIT = 3
AUTH_LIMIT = 5

# ─── In-memory rate limiters ─────────────────────────────────
from collections import defaultdict
from datetime import datetime, timedelta

RateBucket = dict[str, list[datetime]]

_feedback_limits: RateBucket = defaultdict(list)
_guest_chat_limits: RateBucket = defaultdict(list)

# ─── Cache metrics ───────────────────────────────────────────
_cache_metrics = {
    "total": 0,
    "exact_hit": 0,
    "fuzzy_hit": 0,
    "miss": 0,
    "cost_saved": 0.0,
}


def _track_cache(match_type: str, cost_saved: float = 0):
    _cache_metrics["total"] += 1
    if match_type == "exact":
        _cache_metrics["exact_hit"] += 1
    elif match_type == "fuzzy":
        _cache_metrics["fuzzy_hit"] += 1
    else:
        _cache_metrics["miss"] += 1
    _cache_metrics["cost_saved"] += cost_saved


# ─── Intent classification (rule-based, no LLM) ─────────────

_GREETINGS = {
    "halo", "hai", "hi", "hey", "hello", "pagi", "siang", "sore", "malam",
    "selamat pagi", "selamat siang", "selamat sore", "selamat malam",
    "assalamualaikum", "assalamu'alaikum", "permisi", "tes", "test", "coba",
}

_GREETING_RESPONSES = [
    "Halo! Ada yang bisa aku bantu? 🎓",
    "Hai! Mau tanya soal universitas, jurusan, atau beasiswa?",
    "Hey! Aku siap bantu kamu cari info pendidikan. Tanya aja!",
    "Halo! Bingung mau kuliah di mana? Coba tanya ke aku ya!",
]

_THANKS = {"makasih", "terima kasih", "thanks", "thank you", "thankyou", "thx", "oke", "ok", "okay", "siap"}

_THANKS_RESPONSES = [
    "Sama-sama! Ada lagi yang mau ditanyakan? 😊",
    "Happy to help! Kalau ada pertanyaan lain, bilang aja.",
    "Sip! Jangan sungkan tanya-tanya lagi ya.",
]

_FAQ_EXACT = {
    "apa itu mulai plus": "MULAI+ adalah platform bimbingan universitas, jurusan, dan beasiswa di Indonesia. Kami punya 408+ data PTN/PTS, 18.881 program studi, passing grade 5 tahun terakhir, dan program mentoring 1-on-1. Ada yang mau ditanyakan?",
    "mulai plus itu apa": "MULAI+ adalah platform bimbingan universitas, jurusan, dan beasiswa di Indonesia. Kami punya 408+ data PTN/PTS, 18.881 program studi, passing grade 5 tahun terakhir, dan program mentoring 1-on-1. Ada yang mau ditanyakan?",
    "berapa biaya mentoring": "Biaya program mentoring bervariasi tergantung paket. Tapi ada juga program beasiswa mentoring (seleksi). Info lengkap bisa cek di website MULAI+ ya! Atau mau ditanyakan lebih detail?",
    "program mentoring": "Program mentoring MULAI+ adalah bimbingan 1-on-1 dengan mentor berpengalaman. Ada beberapa paket yang bisa disesuaikan dengan kebutuhan kamu. Juga ada program beasiswa mentoring untuk yang lolos seleksi. Tertarik?",
}


def _classify_intent(message: str) -> Optional[dict]:
    """
    Classify user intent. Returns response dict or None (need LLM).
    """
    m = message.strip().lower()

    # FAQ exact
    if m in _FAQ_EXACT:
        import random
        return {"reply": _FAQ_EXACT[m], "follow_ups": ["Cari universitas", "Info passing grade", "Program mentoring"]}

    # Sapaan
    if m in _GREETINGS or any(g in m.split() for g in _GREETINGS):
        import random
        return {"reply": random.choice(_GREETING_RESPONSES), "follow_ups": ["Cari universitas negeri", "Rekomendasi jurusan", "Info beasiswa"]}

    # Ucapan terima kasih
    if m in _THANKS or m.startswith("makasih") or m.startswith("terima"):
        import random
        return {"reply": random.choice(_THANKS_RESPONSES), "follow_ups": ["Cari universitas", "Info passing grade", "Tanya mentoring"]}

    return None


def _check_rate_limit(
    bucket: RateBucket,
    key: str,
    max_requests: int = 10,
    window_seconds: int = 60,
) -> bool:
    now = datetime.now()
    cutoff = now - timedelta(seconds=window_seconds)
    bucket[key] = [t for t in bucket[key] if t > cutoff]
    if len(bucket[key]) >= max_requests:
        return False
    bucket[key].append(now)
    return True


def _check_guest_limit(ip: str) -> tuple[bool, int, int]:
    """Guest: max 3 chats per IP per hari (reset otomatis setiap tengah malam)."""
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today_start + timedelta(days=1)
    seconds_left = int((tomorrow - now).total_seconds())

    bucket = _guest_chat_limits[ip]
    # Bersihin entry sebelum hari ini
    bucket[:] = [t for t in bucket if t > today_start]

    allowed = len(bucket) < GUEST_LIMIT
    remaining = max(0, GUEST_LIMIT - len(bucket))
    if allowed:
        bucket.append(now)

    return allowed, remaining, seconds_left


def _get_session_key(request: Request, query_sid: str = "") -> tuple[str, Optional[str], bool]:
    user_id = request.headers.get("x-user-id")
    if user_id:
        return user_id, user_id, True
    # Prioritas: header x-session-id → query param session_id → random UUID
    session_id = request.headers.get("x-session-id") or query_sid or str(uuid.uuid4())
    return session_id, None, False


async def _check_and_get_session(request: Request, session_key: str, user_id: Optional[str], is_auth: bool) -> tuple[dict, int, Optional[str]]:
    """Get session, link guest, check ban/limit. Returns (session, effective_limit, ban_msg_or_None)."""
    session = await cdb.get_or_create_session(session_key, user_id)

    guest_sid = request.headers.get("x-session-id")
    if is_auth and guest_sid and guest_sid != session_key:
        await cdb.link_session_to_user(guest_sid, user_id)

    effective_limit, ban_msg = await _check_session_allowed(session_key, is_auth)
    return session, effective_limit, ban_msg


# ─── Health ──────────────────────────────────────────────────

@health_router.get("/health")
async def health():
    return {"status": "ok", "service": "mulai-plus-ai", "version": "0.4.0"}


# ─── Helper: get effective limit and check ban ───────────────

async def _check_session_allowed(session_key: str, is_auth: bool) -> tuple[int, Optional[str]]:
    """Returns (effective_limit, error_msg_or_None)."""
    # Ban check
    if await cdb.is_banned(session_key):
        return 0, "Akun kamu telah dibatasi. Hubungi admin untuk informasi lebih lanjut."

    # Check if user_id has any banned session
    session = await cdb.get_or_create_session(session_key, None)
    if session.get("user_id"):
        user_session = await cdb.get_session_by_user(session["user_id"])
        if user_session and user_session.get("banned"):
            return 0, "Akun kamu telah dibatasi. Hubungi admin untuk informasi lebih lanjut."

    default_limit = AUTH_LIMIT if is_auth else GUEST_LIMIT
    effective_limit = await cdb.get_active_limit(session_key, default_limit)
    return effective_limit, None


# ─── Chat (Streaming) ────────────────────────────────────────

@chat_router.post("/chat")
async def chat(req: ChatRequest, request: Request):
    session_key, user_id, is_auth = _get_session_key(request)

    # Get or create session from DB
    session = await cdb.get_or_create_session(session_key, user_id)

    # Link guest session_id ke user_id biar quota endpoint bisa detek auth
    guest_sid = request.headers.get("x-session-id")
    if is_auth and guest_sid and guest_sid != session_key:
        await cdb.link_session_to_user(guest_sid, user_id)

    # ── Intent classification (rule-based, skip LLM & cache) ──
    intent = _classify_intent(req.message)
    if intent:
        reply = intent["reply"]
        follow_ups = intent.get("follow_ups", [])
        msg_result = await cdb.save_message(session_key, "assistant", reply)
        remaining = max(0, (GUEST_LIMIT if not is_auth else AUTH_LIMIT) - session["message_count"])
        async def gen_intent():
            yield f"data: {json.dumps({'session_id': session_key, 'message_id': msg_result['id'], 'created_at': str(msg_result['created_at']), 'remaining': remaining, 'requires_auth': False, 'full_reply': reply})}\n\n"
        return StreamingResponse(gen_intent(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    # ── Check cache FIRST (skip quota buat pertanyaan mirror) ──
    try:
        cached = await cch.get_cached_answer(req.message)
        if cached:
            reply = cached["reply"]
            msg_result = await cdb.save_message(session_key, "assistant", reply)
            created_at = str(msg_result["created_at"])
            msg_id = msg_result["id"]

            async def gen_cached():
                payload = json.dumps({
                    "session_id": session_key,
                    "message_id": msg_id,
                    "created_at": created_at,
                    "remaining": 0,
                    "requires_auth": False,
                    "full_reply": reply,
                })
                yield f"data: {payload}\n\n"

            _track_cache("exact" if cached.get("similarity") is None else "fuzzy", cached.get("token_usage", {}).get("cost", 0))
            logger.info("Cache HIT for: %s", req.message[:60])
            return StreamingResponse(
                gen_cached(),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
            )
    except Exception as e:
        logger.error("Cache error, falling back to LLM: %s", e, exc_info=True)

    _track_cache("miss")

    # ── IP-based guest rate limit (anti abuse refresh/incognito) ──
    if not is_auth:
        ip = request.client.host if request.client else request.headers.get("x-forwarded-for", "unknown")
        ip_allowed, ip_remaining, ip_ttl = _check_guest_limit(ip)
        if not ip_allowed:
            reply = f"Kamu sudah menggunakan {GUEST_LIMIT} chat gratis. Reset dalam {ip_ttl // 60} jam lagi."
            await cdb.save_message(session_key, "assistant", reply)
            return {"reply": reply, "session_id": session_key, "requires_auth": True, "remaining": 0, "reset_in": ip_ttl}

    # Ban check
    effective_limit, ban_msg = await _check_session_allowed(session_key, is_auth)
    if ban_msg:
        await cdb.save_message(session_key, "assistant", ban_msg)
        return {"reply": ban_msg, "session_id": session_key, "requires_auth": True, "remaining": 0}

    # Check limit
    if session["message_count"] >= effective_limit:
        wa_link = "https://wa.me/6285730367310?text=Halo%20MULAI%2B%2C%20saya%20ingin%20request%20tambahan%20limit%20chat"
        reply = "Kamu sudah menggunakan batas chat gratis. Klik link WhatsApp untuk request tambahan." if is_auth else "Kamu sudah menggunakan chat gratis! Yuk login untuk lanjut."
        await cdb.save_message(session_key, "assistant", reply)
        return {"reply": reply, "session_id": session_key, "requires_auth": True,
                "redirect_url": wa_link if is_auth else "/login?utm_source=chatbot&utm_medium=widget&utm_campaign=chat_limit"}

    history = await cdb.get_history(session_key)
    reply, follow_ups, token_usage = await get_response(req.message, history)
    if token_usage.get("cacheable"):
        await cch.set_cached_answer(req.message, reply, follow_ups, token_usage)

    await cdb.save_message(session_key, "user", req.message,
        prompt_tokens=token_usage.get("prompt", 0), cost=token_usage.get("cost", 0), model=token_usage.get("model", settings.openai_model))
    msg_result = await cdb.save_message(session_key, "assistant", reply,
        completion_tokens=token_usage.get("completion", 0), cost=0, model=token_usage.get("model", settings.openai_model))
    msg_id = msg_result["id"]
    msg_created_at = msg_result["created_at"]
    await cdb.increment_message_count(session_key)

    remaining = effective_limit - session["message_count"] - 1

    async def generate():
        metadata = {
            "session_id": session_key,
            "message_id": msg_id,
            "created_at": msg_created_at,
            "remaining": remaining,
            "requires_auth": False,
            "suggested_questions": follow_ups or None,
            "full_reply": reply,
        }
        yield f"data: {json.dumps(metadata)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Chat (Non-Streaming — fallback / legacy) ────────────────

@chat_router.post("/chat/sync", response_model=ChatResponse)
async def chat_sync(req: ChatRequest, request: Request):
    """Non-streaming version for backward compatibility."""
    session_key, user_id, is_auth = _get_session_key(request)
    session = await cdb.get_or_create_session(session_key, user_id)

    guest_sid = request.headers.get("x-session-id")
    if is_auth and guest_sid and guest_sid != session_key:
        await cdb.link_session_to_user(guest_sid, user_id)

    # Cache check first
    cached = await cch.get_cached_answer(req.message)
    if cached:
        return ChatResponse(reply=cached["reply"], session_id=session_key, requires_auth=False)

    default_limit = AUTH_LIMIT if is_auth else GUEST_LIMIT
    effective_limit = await cdb.get_active_limit(session_key, default_limit)

    if session["message_count"] >= effective_limit:
        wa_link = "https://wa.me/6285730367310?text=Halo%20MULAI%2B%2C%20saya%20ingin%20request%20tambahan%20limit%20chat"
        auth_url = wa_link if is_auth else "/login?utm_source=chatbot&utm_medium=widget&utm_campaign=chat_limit"
        reply = "Kamu sudah menggunakan batas chat gratis. Klik tombol di bawah untuk request tambahan." if is_auth else "Kamu sudah menggunakan chat gratis! Login untuk lanjut."
        return ChatResponse(reply=reply, session_id=session_key, requires_auth=True, redirect_url=auth_url)

    history = await cdb.get_history(session_key)
    reply, follow_ups, token_usage = await get_response(req.message, history)
    if token_usage.get("cacheable"):
        await cch.set_cached_answer(req.message, reply, follow_ups, token_usage)

    await cdb.save_message(session_key, "user", req.message,
        prompt_tokens=token_usage.get("prompt", 0), cost=token_usage.get("cost", 0), model=token_usage.get("model", settings.openai_model))
    await cdb.save_message(session_key, "assistant", reply)
    await cdb.increment_message_count(session_key)
    remaining = effective_limit - session["message_count"] - 1

    return ChatResponse(
        reply=reply,
        session_id=session_key,
        suggested_questions=follow_ups or None,
        requires_auth=False,
        remaining=remaining,
    )


# ─── Quota ─────────────────────────────────────────────────

@chat_router.get("/quota")
async def chat_quota(request: Request, session_id: str = ""):
    """Return remaining chat quota for current user."""
    session_key, user_id, is_auth = _get_session_key(request, query_sid=session_id)

    # Fallback: cek apakah session_id pernah dipake oleh auth user
    if not is_auth:
        session_data = await cdb.get_or_create_session(session_key, None)
        if session_data.get("user_id"):
            user_id = session_data["user_id"]
            is_auth = True
    else:
        session_data = await cdb.get_or_create_session(session_key, user_id)

    default_limit = AUTH_LIMIT if is_auth else GUEST_LIMIT
    effective_limit = await cdb.get_active_limit(session_key, default_limit)
    session = await cdb.get_or_create_session(session_key, user_id)
    remaining = max(0, effective_limit - session["message_count"])
    return {
        "remaining": remaining,
        "total": effective_limit,
        "is_auth": is_auth,
        "redirect_url": "https://wa.me/6285730367310?text=Halo%20MULAI%2B%2C%20saya%20ingin%20request%20tambahan%20limit%20chat" if is_auth and remaining == 0 else "/login?utm_source=chatbot&utm_medium=widget&utm_campaign=chat_limit",
    }


# ─── Chat History ────────────────────────────────────────────

@chat_router.get("/history")
async def chat_history(
    request: Request,
    session_id: str,
    limit: int = 5,
    offset: int = 0,
):
    """Get chat history with pagination. Prioritaskan x-user-id (auth user)."""
    user_id = request.headers.get("x-user-id")
    sid = user_id or session_id
    messages, total = await cdb.get_history(sid, limit=limit, offset=offset)
    return {"messages": messages, "total": total, "limit": limit, "offset": offset}


# ─── Feedback ────────────────────────────────────────────────

@chat_router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(req: FeedbackRequest, request: Request):
    """Submit thumbs up/down for a message. Rate limited per IP: 10 req/min."""
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(_feedback_limits, f"feedback:{client_ip}", max_requests=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many requests. Slow down.")
    await cdb.set_feedback(req.message_id, req.feedback)
    return FeedbackResponse(success=True)


# ─── Lead Capture ────────────────────────────────────────────

@chat_router.post("/lead", response_model=LeadResponse)
async def capture_lead(req: LeadRequest):
    if not settings.api_server_url:
        logger.error("API_SERVER_URL not configured")
        raise HTTPException(status_code=500, detail="Lead capture not available")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{settings.api_server_url}/rpc/chatbot.captureLead",
            json=req.model_dump(),
        )
        if resp.status_code != 200:
            logger.warning("Lead capture failed: %s %s", resp.status_code, await resp.aread())
            raise HTTPException(status_code=resp.status_code, detail="Failed to capture lead")
    return LeadResponse(success=True, message="Lead captured")


# ─── Admin Stats ─────────────────────────────────────────────

@admin_router.get("/stats", response_model=ChatStatsResponse)
async def admin_stats():
    return await cdb.get_stats()


# ─── Admin: Session Management ───────────────────────────────

@admin_router.get("/sessions")
async def list_sessions(
    page: int = 0,
    per_page: int = 20,
    search: Optional[str] = None,
    banned_only: bool = False,
):
    """List all chatbot sessions with stats. Admin-only (auth at proxy level)."""
    return await cdb.list_sessions(
        page=page,
        per_page=min(per_page, 100),
        search=search,
        banned_only=banned_only,
    )


@admin_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get full session detail with all messages."""
    result = await cdb.get_session_detail(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@admin_router.put("/sessions/{session_id}/credit")
async def update_credit(session_id: str, req: UpdateCreditRequest):
    """Set custom credit limit for a session. -1 = unlimited."""
    if req.credit_limit is not None and req.credit_limit < -1:
        raise HTTPException(status_code=400, detail="credit_limit must be >= -1 or null")
    ok = await cdb.update_credit_limit(session_id, req.credit_limit)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "session_id": session_id, "credit_limit": req.credit_limit}


@admin_router.put("/sessions/{session_id}/ban")
async def toggle_ban(session_id: str, req: BanRequest):
    """Ban or unban a session."""
    ok = await cdb.toggle_ban(session_id, req.banned, req.reason)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "success": True,
        "session_id": session_id,
        "banned": req.banned,
        "reason": req.reason,
    }


@admin_router.put("/sessions/{session_id}/notes")
async def update_notes(session_id: str, req: NotesRequest):
    """Set admin notes for a session."""
    ok = await cdb.update_notes(session_id, req.notes)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "session_id": session_id}


@admin_router.put("/sessions/{session_id}/reset-usage")
async def reset_usage(session_id: str, req: ResetUsageRequest):
    """Reset or set message_count for a session."""
    if req.message_count < 0:
        raise HTTPException(status_code=400, detail="message_count must be >= 0")
    ok = await cdb.reset_message_count(session_id, req.message_count)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "session_id": session_id, "message_count": req.message_count}


# ─── Track: Login Click ─────────────────────────────────────

@chat_router.post("/track/login-click")
async def track_login_click(req: TrackLoginClickRequest):
    """Track that a guest clicked the login/register CTA."""
    await cdb.track_login_click(req.session_id)
    return {"success": True}


# ─── Admin: Funnel Stats ────────────────────────────────────

@admin_router.get("/funnel")
async def admin_funnel():
    """Get chatbot to login conversion funnel."""
    return await cdb.get_funnel_stats()


@admin_router.get("/cache-stats")
async def admin_cache_stats():
    """Get cache hit/miss metrics."""
    m = _cache_metrics
    hit_rate = ((m["exact_hit"] + m["fuzzy_hit"]) / max(m["total"], 1)) * 100
    return {
        "total_requests": m["total"],
        "exact_hits": m["exact_hit"],
        "fuzzy_hits": m["fuzzy_hit"],
        "misses": m["miss"],
        "hit_rate_percent": round(hit_rate, 1),
        "cost_saved_usd": round(m["cost_saved"], 6),
    }
