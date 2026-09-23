"""
Auto-linkify nama universitas / program studi di jawaban chatbot
ke halaman explore MULAI+.

URL scheme (HARUS sinkron dengan frontend — apps/web):
- Universitas : /explore/universities/{slugify(name)}-{id_sp[:6]}
- Prodi       : /explore/study-programs/{slugify(name)}-{len(name)}

Strategi:
- Kandidat nama diambil dari blok **bold** + sel tabel (format jawaban LLM)
- Universitas di-resolve dari cache (semua univ Aktif, ~408 baris, TTL 10 menit)
- Sisa kandidat dicek batch ke tabel study_programs
- Replace hanya di luar token markdown yang sudah ada (link/code/html)
- Regex alternation longest-first + word boundary → tidak merusak link hasil replace
"""

from __future__ import annotations

import logging
import re
import time
from typing import Optional

from src.db import query

logger = logging.getLogger("linkify")

# UTM untuk semua link explore yang dihasilkan chatbot
UTM_PARAMS = "utm_source=chatbot&utm_medium=widget&utm_campaign=chat_link"

# Token markdown yang TIDAK boleh diubah (link existing, code, image, html tag)
_MD_PROTECTED = re.compile(r"(`[^`]*`|\[[^\]]*\]\([^)]*\)|<[^>]+>)")

_BOLD = re.compile(r"\*\*(.+?)\*\*")

_UNI_CACHE_TTL = 600  # detik

_unis_cache: Optional[list[dict]] = None
_unis_cache_ts: float = 0


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9\s-]", "", name.lower())
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")


async def _get_universities() -> list[dict]:
    global _unis_cache, _unis_cache_ts
    now = time.time()
    if _unis_cache is None or now - _unis_cache_ts > _UNI_CACHE_TTL:
        rows = await query("SELECT id_sp, name, short_name FROM universities WHERE status = 'Aktif'")
        _unis_cache = [
            {"idSp": r["id_sp"], "name": r["name"], "shortName": r["short_name"]}
            for r in rows
        ]
        _unis_cache_ts = now
        logger.info("Cached %d universities for linkify", len(_unis_cache))
    return _unis_cache


def _extract_candidates(text: str) -> list[str]:
    """Kandidat nama: blok **bold** + sel tabel (baris | ... |)."""
    cands: list[str] = []

    for m in _BOLD.finditer(text):
        cands.append(m.group(1).strip())

    for line in text.splitlines():
        line = line.strip()
        if line.startswith("|") and line.endswith("|"):
            cells = [c.strip() for c in line.split("|")[1:-1]]
            # baris header separator (--- / :--:)
            if all(re.fullmatch(r":?-{2,}:?", c) for c in cells):
                continue
            cands.extend(cells)

    # Normalisasi: buang alias dalam kurung, min 4 karakter, unik
    cleaned: list[str] = []
    for c in cands:
        c = re.sub(r"\s*\([^)]*\)", "", c).strip()
        if len(c) >= 4 and c not in cleaned:
            cleaned.append(c)
    return cleaned


def _find_uni(candidates: list[str], unis: list[dict]) -> dict[str, str]:
    """candidate -> url untuk nama universitas (match name / short_name)."""
    by_name = {u["name"].lower(): u for u in unis}
    by_short = {u["shortName"].lower(): u for u in unis if u["shortName"]}

    links: dict[str, str] = {}
    for cand in candidates:
        key = cand.lower()
        u = by_name.get(key) or by_short.get(key)
        if not u:
            continue
        slug = f"{_slugify(u['name'])}-{u['idSp'][:6]}"
        links[cand] = f"/explore/universities/{slug}?{UTM_PARAMS}"
    return links


async def _find_prodi(candidates: list[str]) -> dict[str, str]:
    """candidate -> url untuk nama program studi (query batch read-only)."""
    if not candidates:
        return {}
    rows = await query(
        "SELECT DISTINCT name FROM study_programs WHERE status = 'Aktif' AND name = ANY($1::text[])",
        candidates,
    )
    links: dict[str, str] = {}
    for r in rows:
        name = r["name"]
        slug = f"{_slugify(name)}-{len(name)}"
        links[name] = f"/explore/study-programs/{slug}?{UTM_PARAMS}"
    return links


# Regex link internal telanjang: /explore/... (yang ditulis polos oleh LLM)
_INTERNAL_URL_RE = re.compile(r"(?<![\w\]])(/explore/[a-zA-Z0-9_./-]+)")


def _internal_url_label(url: str) -> str:
    """Buat label readable dari URL explore, buang suffix id."""
    seg = url.rstrip("/").split("/")[-1]
    # buang suffix id: -xxxxxx (univ) atau -N (prodi); id bisa mulai dgn '_'
    m = re.search(r"[-_][A-Za-z0-9]{5,6}$|-\d+$", seg)
    if m:
        seg = seg[: m.start()]
    return seg.replace("-", " ").replace("_", " ").strip().title() or url


def _linkify_internal_urls(seg: str) -> str:
    def repl(m: re.Match) -> str:
        url = m.group(1)
        # Tambah UTM kalau belum ada query param
        if "?" not in url:
            url = f"{url}?{UTM_PARAMS}"
        return f"[{_internal_url_label(m.group(1))}]({url})"

    return _INTERNAL_URL_RE.sub(repl, seg)


async def linkify(text: str) -> str:
    """Inject markdown link ke nama univ/prodi + URL telanjang /explore di teks jawaban."""
    if not text:
        return text

    candidates = _extract_candidates(text)

    try:
        links: dict[str, str] = {}
        if candidates:
            unis = await _get_universities()
            uni_links = _find_uni(candidates, unis)

            matched = set(uni_links)
            prodi_cands = [c for c in candidates if c not in matched]
            prodi_links = await _find_prodi(prodi_cands) if prodi_cands else {}
            links = {**uni_links, **prodi_links}

        names = sorted(links.keys(), key=len, reverse=True)
        pattern = re.compile(
            "(?<![\\w])(" + "|".join(re.escape(n) for n in names) + ")(?![\\w])"
        ) if names else None

        def _replace_seg(seg: str) -> str:
            out = _linkify_internal_urls(seg)
            if pattern:
                out = pattern.sub(lambda m: f"[{m.group(1)}]({links[m.group(1)]})", out)
            return out

        # Split: bagian genap = teks biasa (diproses), bagian ganjil = token markdown
        # yang sudah ada (link/code/html) dibiarkan utuh.
        parts = _MD_PROTECTED.split(text)
        out_parts = [_replace_seg(part) if i % 2 == 0 else part for i, part in enumerate(parts)]
        return "".join(out_parts)
    except Exception as e:
        # Jangan sampai linkify merusak jawaban — gagal diam-diam
        logger.warning("linkify gagal: %s", e, exc_info=True)
        return text
