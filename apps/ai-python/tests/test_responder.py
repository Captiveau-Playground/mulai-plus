"""
Tests for responder module (LLM wrapper, fallback, topic extraction).
"""

from __future__ import annotations

import pytest

from src.engine.responder import _extract_topics, _calc_cost, FALLBACK_REPLIES


# ─── _extract_topics ─────────────────────────────────────────


class TestExtractTopics:
    def test_universitas_topic(self):
        topics = _extract_topics("Info tentang Universitas Indonesia")
        assert len(topics) >= 1
        assert any("universitas" in t.lower() for t in topics)

    def test_prodi_topic(self):
        topics = _extract_topics("Rekomendasi jurusan Teknik Informatika")
        assert any("prodi" in t.lower() or "jurusan" in t.lower() for t in topics)

    def test_beasiswa_topic(self):
        topics = _extract_topics("Cara daftar beasiswa LPDP")
        assert any("beasiswa" in t.lower() for t in topics)

    def test_mentoring_topic(self):
        topics = _extract_topics("Program mentoring MULAI+")
        assert any("mentoring" in t.lower() for t in topics)

    def test_multiple_topics(self):
        topics = _extract_topics("Beasiswa dan mentoring untuk universitas")
        # Should return at least 3 from available keywords
        assert len(topics) <= 3

    def test_unknown_topic(self):
        topics = _extract_topics("Halo apa kabar")
        # Falls back to universal topics
        assert len(topics) >= 1

    def test_empty_text(self):
        topics = _extract_topics("")
        assert len(topics) >= 1


# ─── _calc_cost ──────────────────────────────────────────────


class TestCalcCost:
    def test_zero_tokens(self):
        cost = _calc_cost(0, 0)
        assert cost == 0.0

    def test_some_tokens(self):
        cost = _calc_cost(100, 50)
        assert cost > 0

    def test_pricing_accuracy(self):
        # 1M tokens input = $0.14, 1M tokens output = $0.28
        cost = _calc_cost(1_000_000, 500_000)
        expected = 0.14 + 0.14  # $0.14 for input + $0.14 for half-M output
        assert abs(cost - expected) < 0.01


# ─── FALLBACK_REPLIES ────────────────────────────────────────


class TestFallbackReplies:
    def test_has_replies(self):
        assert len(FALLBACK_REPLIES) >= 1

    def test_each_reply_has_suggestions(self):
        for reply, suggestions in FALLBACK_REPLIES:
            assert isinstance(reply, str)
            assert len(reply) > 20
            assert isinstance(suggestions, list)
            assert len(suggestions) >= 2

    def test_suggestions_are_strings(self):
        for _, suggestions in FALLBACK_REPLIES:
            for s in suggestions:
                assert isinstance(s, str)
                assert len(s) > 3
