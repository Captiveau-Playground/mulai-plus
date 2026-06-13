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
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

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
)

health_router = APIRouter()
chat_router = APIRouter()
admin_router = APIRouter()

# Rate limits
GUEST_LIMIT = 1
AUTH_LIMIT = 5


def _get_session_key(request: Request) -> tuple[str, Optional[str], bool]:
    user_id = request.headers.get("x-user-id")
    if user_id:
        return user_id, user_id, True
    session_id = request.headers.get("x-session-id") or str(uuid.uuid4())
    return session_id, None, False


# ─── Health ──────────────────────────────────────────────────

@health_router.get("/health")
async def health():
    return {"status": "ok", "service": "mulai-plus-ai", "version": "0.4.0"}


# ─── Chat (Streaming) ────────────────────────────────────────

@chat_router.post("/chat")
async def chat(req: ChatRequest, request: Request):
    session_key, user_id, is_auth = _get_session_key(request)
    limit = AUTH_LIMIT if is_auth else GUEST_LIMIT

    # Get or create session from DB
    session = await cdb.get_or_create_session(session_key, user_id)

    # Check limit
    if session["message_count"] >= limit:
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

        # Save the limit message too
        await cdb.save_message(session_key, "assistant", reply)
        return {
            "reply": reply,
            "session_id": session_key,
            "requires_auth": not is_auth,
        }

    # Load chat history from DB
    history = await cdb.get_history(session_key)

    # Generate response via LLM (with tool calling)
    reply, follow_ups, token_usage = await get_response(req.message, history)

    # Save messages to DB
    await cdb.save_message(
        session_key, "user", req.message,
        prompt_tokens=token_usage.get("prompt", 0),
        cost=token_usage.get("cost", 0),
        model=token_usage.get("model", settings.openai_model),
    )

    msg_result = await cdb.save_message(
        session_key, "assistant", reply,
        completion_tokens=token_usage.get("completion", 0),
        cost=0,
        model=token_usage.get("model", settings.openai_model),
    )
    msg_id = msg_result["id"]
    msg_created_at = msg_result["created_at"]

    await cdb.increment_message_count(session_key)

    remaining = limit - session["message_count"] - 1

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
    limit = AUTH_LIMIT if is_auth else GUEST_LIMIT

    session = await cdb.get_or_create_session(session_key, user_id)

    if session["message_count"] >= limit:
        reply = (
            f"Kamu sudah menggunakan {limit} kali chat gratis. "
            "Untuk chat lebih lanjut, silakan hubungi tim MULAI+ ya! 🎓"
        ) if is_auth else (
            "Kamu sudah menggunakan chat gratis! 🎉\n\n"
            "Untuk melanjutkan, silakan **daftar akun MULAI+** terlebih dahulu."
        )
        return ChatResponse(reply=reply, session_id=session_key, requires_auth=not is_auth)

    history = await cdb.get_history(session_key)
    reply, follow_ups, token_usage = await get_response(req.message, history)

    await cdb.save_message(
        session_key, "user", req.message,
        prompt_tokens=token_usage.get("prompt", 0),
        cost=token_usage.get("cost", 0),
        model=token_usage.get("model", settings.openai_model),
    )
    await cdb.save_message(session_key, "assistant", reply)
    await cdb.increment_message_count(session_key)
    remaining = limit - session["message_count"] - 1

    return ChatResponse(
        reply=reply,
        session_id=session_key,
        suggested_questions=follow_ups or None,
        requires_auth=False,
        remaining=remaining,
    )


# ─── Chat History ────────────────────────────────────────────

@chat_router.get("/history")
async def chat_history(session_id: str):
    """Get chat history for a session."""
    messages = await cdb.get_history(session_id)
    return {"messages": messages}


# ─── Feedback ────────────────────────────────────────────────

@chat_router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(req: FeedbackRequest):
    """Submit thumbs up/down for a message."""
    await cdb.set_feedback(req.message_id, req.feedback)
    return FeedbackResponse(success=True)


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
    return await cdb.get_stats()
