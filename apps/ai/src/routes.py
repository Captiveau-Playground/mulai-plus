"""
API Routes for MULAI+ AI Service.

Rate limits:
- Guest (anonymous): 1 free chat → prompt signup
- Authenticated: 5 free chats → prompt upgrade/contact
"""

from __future__ import annotations

import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request

from src.config import settings
from src.engine.responder import get_response
from src.schemas import ChatRequest, ChatResponse, LeadRequest, LeadResponse

health_router = APIRouter()
chat_router = APIRouter()

# In-memory session store (phase 1 — replace with Redis/DB later)
# Structure:
#   guest: { session_id → { count, history } }
#   auth:  { user_id    → { count, history } }
_sessions: dict[str, dict] = {}

# Rate limits
GUEST_LIMIT = 1
AUTH_LIMIT = 5


def _get_session_key(request: Request) -> tuple[str, bool]:
    """Return (key, is_authenticated)."""
    user_id = request.headers.get("x-user-id")
    if user_id:
        return f"auth:{user_id}", True

    session_id = request.headers.get("x-session-id") or str(uuid.uuid4())
    return f"guest:{session_id}", False


@health_router.get("/health")
async def health():
    return {"status": "ok", "service": "mulai-plus-ai", "version": "0.3.0"}


@chat_router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    session_key, is_auth = _get_session_key(request)
    limit = AUTH_LIMIT if is_auth else GUEST_LIMIT

    session = _sessions.get(session_key, {"count": 0, "history": []})

    # Check limit
    exceeded = session["count"] >= limit
    if exceeded:
        if is_auth:
            reply = (
                f"Kamu sudah menggunakan {limit} kali chat gratis. "
                "Untuk chat lebih lanjut, silakan hubungi tim MULAI+ ya! 🎓"
            )
        else:
            reply = (
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


@chat_router.post("/lead", response_model=LeadResponse)
async def capture_lead(req: LeadRequest):
    """Capture lead after signup — proxies to API server."""
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
