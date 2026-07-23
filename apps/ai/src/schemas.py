from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator


MAX_MESSAGE_LENGTH = 2000
ALLOWED_FEEDBACK = {"up", "down"}


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=MAX_MESSAGE_LENGTH, description="User message to the chatbot")
    session_id: Optional[str] = Field(None, max_length=128)
    context: Optional[dict] = None

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Message cannot be empty")
        return stripped


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    suggested_questions: Optional[list[str]] = None
    requires_auth: bool = False
    remaining: Optional[int] = None
    redirect_url: Optional[str] = None


class LeadRequest(BaseModel):
    session_id: str = Field(..., max_length=128)
    name: str = Field(..., max_length=100)
    email: str = Field(..., max_length=255)
    phone: Optional[str] = Field(None, max_length=30)


class LeadResponse(BaseModel):
    success: bool
    message: str


class FeedbackRequest(BaseModel):
    message_id: int = Field(..., gt=0)
    feedback: str = Field(..., pattern=r"^(up|down)$")


class FeedbackResponse(BaseModel):
    success: bool


class ChatStatsResponse(BaseModel):
    total_sessions: int
    guest_sessions: int
    auth_sessions: int
    total_messages: int
    today_messages: int
    today_sessions: int
    recent_questions: list[dict]
    top_questions: list[dict]
    total_cost: float = 0
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
