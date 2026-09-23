"""
Tests for schemas (Pydantic model validation).
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.schemas import (
    ChatRequest,
    ChatResponse,
    FeedbackRequest,
    FeedbackResponse,
    LeadRequest,
    LeadResponse,
    ChatStatsResponse,
    UpdateCreditRequest,
    BanRequest,
    NotesRequest,
    ResetUsageRequest,
    TrackLoginClickRequest,
)


class TestChatRequest:
    def test_valid_message(self):
        req = ChatRequest(message="Halo MULAI+")
        assert req.message == "Halo MULAI+"

    def test_empty_message_raises(self):
        with pytest.raises(ValidationError):
            ChatRequest(message="   ")

    def test_message_too_long(self):
        with pytest.raises(ValidationError):
            ChatRequest(message="x" * 2001)


class TestFeedbackRequest:
    def test_valid_up(self):
        req = FeedbackRequest(message_id=1, feedback="up")
        assert req.feedback == "up"

    def test_valid_down(self):
        req = FeedbackRequest(message_id=1, feedback="down")
        assert req.feedback == "down"

    def test_invalid_feedback_raises(self):
        with pytest.raises(ValidationError):
            FeedbackRequest(message_id=1, feedback="maybe")


class TestUpdateCreditRequest:
    def test_none_limit(self):
        req = UpdateCreditRequest(credit_limit=None)
        assert req.credit_limit is None

    def test_valid_limit(self):
        req = UpdateCreditRequest(credit_limit=10)
        assert req.credit_limit == 10

    def test_unlimited(self):
        req = UpdateCreditRequest(credit_limit=-1)
        assert req.credit_limit == -1


class TestBanRequest:
    def test_ban(self):
        req = BanRequest(banned=True, reason="Spam")
        assert req.banned is True
        assert req.reason == "Spam"

    def test_unban(self):
        req = BanRequest(banned=False)
        assert req.banned is False
        assert req.reason is None


class TestResetUsageRequest:
    def test_default(self):
        req = ResetUsageRequest()
        assert req.message_count == 0

    def test_custom_count(self):
        req = ResetUsageRequest(message_count=5)
        assert req.message_count == 5


class TestResponseModels:
    def test_chat_response_fields(self):
        resp = ChatResponse(reply="Halo", session_id="abc")
        assert resp.reply == "Halo"
        assert resp.session_id == "abc"
        assert resp.requires_auth is False

    def test_lead_response(self):
        resp = LeadResponse(success=True, message="OK")
        assert resp.success is True

    def test_feedback_response(self):
        resp = FeedbackResponse(success=True)
        assert resp.success is True

    def test_chat_stats_response(self):
        resp = ChatStatsResponse(
            total_sessions=10, guest_sessions=5, auth_sessions=5,
            total_messages=100, today_messages=10, today_sessions=3,
            recent_questions=[], top_questions=[],
        )
        assert resp.total_sessions == 10
