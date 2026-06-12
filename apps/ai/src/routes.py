"""
API Routes for MULAI+ AI Service.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request

from src.config import settings
from src.engine.responder import get_response
from src.schemas import ChatRequest, ChatResponse, ChatStatsResponse, LeadRequest, LeadResponse

health_router = APIRouter()
chat_router = APIRouter()
admin_router = APIRouter()

# ─── In-memory session store ────────────────────────────────
# Structure:
#   key → {
#     count, history, is_auth, user_id,
#     created_at, last_active,
#     questions: [str]
#   }
_sessions: dict[str, dict] = {}

# Rate limits
GUEST_LIMIT = 1
AUTH_LIMIT = 5


def _get_session_key(request: Request) -> tuple[str, bool]:
    user_id = request.headers.get("x-user-id")
    if user_id:
        return f"auth:{user_id}", True
    session_id = request.headers.get("x-session-id") or str(uuid.uuid4())
    return f"guest:{session_id}", False


# ─── Health ──────────────────────────────────────────────────

@health_router.get("/health")
async def health():
    return {"status": "ok", "service": "mulai-plus-ai", "version": "0.3.0"}


# ─── Chat ────────────────────────────────────────────────────

@chat_router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    session_key, is_auth = _get_session_key(request)
    limit = AUTH_LIMIT if is_auth else GUEST_LIMIT

    now = datetime.now(timezone.utc)
    session = _sessions.get(session_key, {
        "count": 0,
        "history": [],
        "is_auth": is_auth,
        "questions": [],
        "created_at": now,
        "last_active": now,
    })

    # Check limit
    exceeded = session["count"] >= limit
    if exceeded:
        reply = (
            f"Kamu sudah menggunakan {limit} kali chat gratis. "
            "Untuk chat lebih lanjut, silakan hubungi tim MULAI+ ya! 🎓"
        ) if is_auth else (
            "Kamu sudah menggunakan chat gratis! 🎉\n\n"
            "Untuk melanjutkan, silakan **daftar akun MULAI+** terlebih dahulu. "
            "Daftarnya gratis dan kamu bisa dapatkan:\n"
            "- 🎯 Konsultasi jurusan & universitas\n"
            "- 📊 Data passing grade lengkap\n"
            "- 👨‍🏫 Program mentoring 1-on-1\n\n"
            "[Daftar Sekarang →](/register)"
        )
        return ChatResponse(
            reply=reply,
            session_id=req.session_id or session_key,
            requires_auth=not is_auth,
        )

    # Generate response + follow-up questions
    reply, follow_ups = await get_response(req.message, session.get("history"))

    # Update session
    session["count"] += 1
    session["last_active"] = now
    session["questions"].append(req.message[:200])
    session["history"].append({"role": "user", "content": req.message})
    session["history"].append({"role": "assistant", "content": reply})
    _sessions[session_key] = session

    remaining = limit - session["count"]

    return ChatResponse(
        reply=reply,
        session_id=req.session_id or session_key,
        suggested_questions=follow_ups or None,
        requires_auth=False,
        remaining=remaining,
    )


# ─── Lead Capture ────────────────────────────────────────────

@chat_router.post("/lead", response_model=LeadResponse)
async def capture_lead(req: LeadRequest):
    if not settings.api_server_url:
        raise HTTPException(status_code=500, detail="API_SERVER_URL not configured")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.api_server_url}/rpc/chatbot.captureLead",
            json=req.model_dump(),
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to capture lead")
    return LeadResponse(success=True, message="Lead captured")


# ─── Admin Stats ─────────────────────────────────────────────

@admin_router.get("/stats", response_model=ChatStatsResponse)
async def admin_stats():
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    sessions = list(_sessions.values())
    total_sessions = len(sessions)
    guest_sessions = sum(1 for s in sessions if not s.get("is_auth"))
    auth_sessions = total_sessions - guest_sessions
    total_messages = sum(s["count"] for s in sessions)
    today_sessions = sum(1 for s in sessions if s.get("created_at", today_start) >= today_start)
    today_messages = sum(s["count"] for s in sessions if s.get("last_active", today_start) >= today_start)

    # Recent questions (last 50 across all sessions)
    all_questions = []
    for s in sessions:
        for q in s.get("questions", []):
            all_questions.append({"question": q, "is_auth": s.get("is_auth", False)})
    all_questions.reverse()
    recent_questions = all_questions[:50]

    # Top questions (by frequency)
    from collections import Counter
    question_counts = Counter(q["question"] for q in all_questions)
    top_questions = [{"question": q, "count": c} for q, c in question_counts.most_common(10)]

    return ChatStatsResponse(
        total_sessions=total_sessions,
        guest_sessions=guest_sessions,
        auth_sessions=auth_sessions,
        total_messages=total_messages,
        today_messages=today_messages,
        today_sessions=today_sessions,
        recent_questions=recent_questions,
        top_questions=top_questions,
    )
