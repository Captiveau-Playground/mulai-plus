from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[dict] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    suggested_questions: Optional[list[str]] = None
    requires_auth: bool = False
    remaining: Optional[int] = None


class LeadRequest(BaseModel):
    session_id: str
    name: str
    email: str
    phone: Optional[str] = None


class LeadResponse(BaseModel):
    success: bool
    message: str


class ChatStatsResponse(BaseModel):
    total_sessions: int
    guest_sessions: int
    auth_sessions: int
    total_messages: int
    today_messages: int
    today_sessions: int
    recent_questions: list[dict]
    top_questions: list[dict]
