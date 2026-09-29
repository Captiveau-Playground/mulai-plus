"""
Tests for cache module (exact + fuzzy match, token_usage parsing).
"""

from __future__ import annotations

import json

import pytest

from src.cache import _normalize, _token_similarity

# ─── _normalize ──────────────────────────────────────────────


class TestNormalize:
    def test_lowercase(self):
        assert _normalize("Universitas Negeri Jakarta") == "universitas negeri jakarta"

    def test_strip_punctuation(self):
        assert _normalize("Apa itu SNBP?") == "apa itu snbp"

    def test_collapse_whitespace(self):
        assert _normalize("beasiswa  LPDP  2026") == "beasiswa lpdp 2026"

    def test_alphanumeric_only(self):
        assert _normalize("Halo! @#$ test 123") == "halo test 123"

    def test_empty_string(self):
        assert _normalize("") == ""

    def test_special_chars(self):
        assert _normalize("Passing Grade ITB?") == "passing grade itb"


# ─── _token_similarity ───────────────────────────────────────


class TestTokenSimilarity:
    def test_identical(self):
        assert _token_similarity("Universitas Indonesia", "Universitas Indonesia") == 1.0

    def test_partial_overlap(self):
        sim = _token_similarity("Universitas Gadjah Mada", "Universitas Indonesia")
        assert 0.3 < sim < 0.9

    def test_no_overlap(self):
        sim = _token_similarity("Beasiswa LPDP", "Teknik Informatika")
        assert sim < 0.5

    def test_with_punctuation(self):
        sim = _token_similarity("Apa itu SNBP?", "Info SNBP terbaru")
        assert sim > 0  # same normalized token "snbp"

    def test_different_lengths(self):
        sim = _token_similarity("Universitas", "Universitas Negeri Jakarta")
        assert 0.3 < sim < 1.0

    def test_empty_one_side(self):
        sim = _token_similarity("", "Universitas")
        assert sim >= 0

    def test_both_empty(self):
        sim = _token_similarity("", "")
        # SequenceMatcher ratio of two empty strings = 1.0
        assert sim == 1.0


# ─── get_cached_answer / set_cached_answer ──────────────────
# Note: These require DB access. For CI, we test the pure functions above.
# Integration tests with real DB are in tests/integration/
