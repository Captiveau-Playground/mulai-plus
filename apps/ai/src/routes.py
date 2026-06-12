"""
API Routes for MULAI+ AI Service.
"""

from __future__ import annotations

import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException

from src.config import settings
from src.engine.responder import get_response, get_suggested_questions
from src.schemas import ChatRequest, ChatResponse, LeadRequest, LeadResponse

health_router = APIRouter()
chat_router = APIRouter()

# In-memory session store (phase 1 — replace with Redis/DB later)
# Tracks: session_id → { message_count, history: [{role, content}] }
_sessions: dict[str, dict] = {}

FREE_CHAT_LIMIT = 1


@health_router.get("/health")
async def health():
    return {"status": "ok", "service": "mulai-plus-ai", "version": "0.2.0"}


@chat_router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    # Resolve session
    session_id = req.session_id or str(uuid.uuid4())
    session = _sessions.get(session_id, {"count": 0, "history": []})

    # Check free chat limit for guest
    requires_auth = session["count"] >= FREE_CHAT_LIMIT
    if requires_auth:
        return ChatResponse(
            reply="Kamu sudah menggunakan chat gratis! 🎉\n\nUntuk melanjutkan, silakan **daftar akun MULAI+** terlebih dahulu. Daftarnya gratis dan kamu bisa konsultasi lebih lanjut dengan tim kami.",
            session_id=session_id,
            suggested_questions=None,
            requires_auth=True,
        )

    # Generate response using LLM (with tool calling)
    reply = await get_response(req.message, session.get("history"))

    # Update session
    session["count"] += 1
    session["history"].append({"role": "user", "content": req.message})
    session["history"].append({"role": "assistant", "content": reply})
    _sessions[session_id] = session

    return ChatResponse(
        reply=reply,
        session_id=session_id,
        suggested_questions=get_suggested_questions() if session["count"] == 1 else None,
        requires_auth=False,
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
