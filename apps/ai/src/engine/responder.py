"""
Phase 3: LLM-powered responder with tool calling + cost tracking.
"""

from __future__ import annotations

import json
import logging
import random
import re
from typing import Optional

from openai import AsyncOpenAI

from src.config import settings
from src.linkify import linkify
from src.tools import TOOL_DEFINITIONS, handle_tool_call

logger = logging.getLogger("responder")

SYSTEM_PROMPT = """Kamu adalah asisten chatbot dari MULAI+, platform bimbingan universitas, jurusan, dan beasiswa di Indonesia.

Tugas:
- Bantu calon mahasiswa cari info universitas, prodi, passing grade, beasiswa
- Rekomendasi jurusan berdasarkan minat
- Jelaskan program mentoring MULAI+
- Ramah, informatif, bahasa Indonesia natural

Data:
- 408+ PTN/PTS, 18.881 prodi (D3-S3)
- Passing grade SNBP/SNBT 5 tahun
- Mentoring 1-on-1 + beasiswa mentoring

Aturan format:
1. Jawab LANGSUNG, tanpa pengantar seperti "Berdasarkan data..."
2. Gunakan MARKDOWN untuk struktur:
   - **bold** untuk nama universitas/jurusan
   - - bullet untuk daftar
   - | tabel | untuk data perbandingan
3. Maksimal 3 paragraf + 1 tabel jika perlu
4. Akhiri dengan 1 baris ajakan ("Ada yang mau ditanyakan lagi?")
5. JANGAN pernah mengarang passing grade / akreditasi
6. Jika data kosong, bilang apa adanya + saran kata kunci lain

Gunakan tools database untuk data real-time. Jangan ngasih data palsu."""

FOLLOWUPS_STATIC = {
    "universitas": ["Cari universitas negeri", "Info akreditasi kampus", "Daftar PTN favorit"],
    "prodi": ["Rekomendasi jurusan", "Info passing grade", "Prospek kerja jurusan"],
    "beasiswa": ["Info beasiswa LPDP", "Beasiswa dalam negeri", "Syarat beasiswa"],
    "mentoring": ["Program mentoring 1-on-1", "Testimoni alumni", "Biaya mentoring"],
    "jurusan": ["Rekomendasi jurusan", "Info passing grade", "Prospek kerja lulusan"],
}

FALLBACK_REPLIES = [
    ("Maaf, layanan sedang sibuk. Coba tanya lagi nanti ya! 🙏\n\n"
     "Sementara itu, kamu bisa cek langsung:\n"
     "- 🏛️ Universitas: /explore/universities\n"
     "- 📚 Program Studi: /explore/study-programs\n"
     "- 📊 Passing Grade: /explore/passing-grade",
     ["Cari universitas negeri", "Info passing grade", "Tanya program mentoring"]),
    ("Mohon maaf, lagi error nih. Coba ulangi pertanyaannya ya! 😊\n\n"
     "Atau cek langsung:\n"
     "- 🏛️ Jelajahi Universitas\n"
     "- 📚 Cari Program Studi\n"
     "- 💡 Info Beasiswa",
     ["Rekomendasi jurusan", "Info SNBP 2026", "Cari beasiswa"]),
    ("Wah, ada kendala teknis. Coba lagi sebentar ya! ⚡\n\n"
     "Sembari menunggu, kamu bisa lihat-lihat dulu:\n"
     "- /explore/universities\n"
     "- /explore/study-programs",
     ["PTN dengan akreditasi unggul", "Jurusan dengan passing grade rendah", "Info program mentoring"]),
]

LLM_TIMEOUT = 30

# Blok reasoning yg dikeluarkan model (mis. minimax-m3): <think>...</think>
# Harus dibuang sebelum ditampilkan ke user.
_THINK_RE = re.compile(r"\s*<think>.*?</think>\s*", re.DOTALL)

_client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            base_url=settings.openai_base_url,
            api_key=settings.openai_api_key,
            timeout=LLM_TIMEOUT,
            max_retries=1,
        )
    return _client


async def _chat(client: AsyncOpenAI, messages: list[dict], *, with_tools: bool = False, temperature: float = 0.7) -> object:
    """Call LLM dengan retry. Jika pakai tools dan provider menolak payload tools
    (error 400 intermittent spt "Mismatch type custom.OaiMessage"), retry sekali
    TANPA tools supaya user tetap dapat jawaban (graceful degradation)."""
    kwargs: dict = {"temperature": temperature}
    if with_tools:
        kwargs["tools"] = TOOL_DEFINITIONS
        kwargs["tool_choice"] = "auto"

    for attempt in range(2):
        try:
            return await client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                **kwargs,
            )
        except Exception as e:
            if attempt == 1:
                raise
            logger.warning("LLM call gagal (%s). Retry...", str(e)[:200])
            if with_tools:
                # Degradasi: retry tanpa tools
                logger.warning("Retry tanpa tools (provider menolak payload tools).")
                with_tools = False
                kwargs.pop("tools", None)
                kwargs.pop("tool_choice", None)

    raise RuntimeError("unreachable")  # pragma: no cover


def _calc_cost(prompt: int, completion: int, model: str = "") -> float:
    COST_PER_1M_INPUT = 0.14
    COST_PER_1M_OUTPUT = 0.28
    return (prompt / 1_000_000 * COST_PER_1M_INPUT) + (completion / 1_000_000 * COST_PER_1M_OUTPUT)


def _strip_think(content: str) -> str:
    """Buang blok reasoning <think>...</think> dari output model."""
    return _THINK_RE.sub("", content).strip()


def _extract_topics(text: str) -> list[str]:
    """Extract topic keywords from text for fallback follow-ups."""
    topics = []
    text_lower = text.lower()
    for keyword, followups in FOLLOWUPS_STATIC.items():
        if keyword in text_lower:
            topics.extend(followups)
            if len(topics) >= 3:
                return topics[:3]
    return topics or FOLLOWUPS_STATIC["universitas"]


async def get_response(message: str, history: Optional[list[dict]] = None) -> tuple[str, list[str], dict]:
    """Generate response using LLM with tool calling.

    Returns (reply_text, follow_up_questions, token_usage).
    token_usage: {prompt, completion, cost, model}
    """
    total_prompt = 0
    total_completion = 0
    model_used = settings.openai_model

    try:
        # Sanitize history: hanya role + content (string), buang key ekstra
        # seperti id/created_at yang bisa ditolak gateway yang strict.
        # Defensif: skip item yang bukan dict (mis. list/int dari tuple error).
        clean_history: list[dict] = []
        if history:
            for h in history[-6:]:
                if not isinstance(h, dict):
                    continue
                role = h.get("role")
                content = h.get("content")
                if role in ("user", "assistant", "system") and isinstance(content, str):
                    clean_history.append({"role": role, "content": content})

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(clean_history)
        messages.append({"role": "user", "content": message})

        client = _get_client()

        # Call dengan tools; jika provider menolak payload tools (400 intermittent
        # seperti "Mismatch type custom.OaiMessage"), retry tanpa tools agar
        # user tetap dapat jawaban (graceful degradation).
        resp = await _chat(
            client,
            messages,
            with_tools=True,
        )

        if resp.usage:
            total_prompt += resp.usage.prompt_tokens or 0
            total_completion += resp.usage.completion_tokens or 0

        msg = resp.choices[0].message

        if msg.tool_calls:
            messages.append({
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in msg.tool_calls
                ],
            })

            for tc in msg.tool_calls:
                try:
                    args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    args = {}

                logger.info("Tool call: %s(%s)", tc.function.name, args)
                result = await handle_tool_call(tc.function.name, args)
                logger.info("Tool result: %s...", result[:150])

                messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})

            resp = await _chat(client, messages)
            if resp.usage:
                total_prompt += resp.usage.prompt_tokens or 0
                total_completion += resp.usage.completion_tokens or 0

            content = resp.choices[0].message.content
        else:
            content = msg.content

        if not content:
            resp = await _chat(client, messages)
            if resp.usage:
                total_prompt += resp.usage.prompt_tokens or 0
                total_completion += resp.usage.completion_tokens or 0
            content = resp.choices[0].message.content

        content = content or "Maaf, aku tidak bisa menjawab saat ini."

        # Buang blok <think>...</think> supaya reasoning model tidak tampil ke user
        content = _strip_think(content)

        # Jika setelah dibuang kosong (model cuma 'berpikir', tidak menjawab)
        if not content.strip():
            content = "Maaf, aku belum bisa menjawab pertanyaan itu dengan data yang ada. Coba tanya dengan kata kunci lain ya! 🙏"

        # Linkify nama universitas / prodi ke halaman explore
        content = await linkify(content)

        # Follow-up dari response terakhir (gak perlu LLM call lagi)
        follow_ups = _extract_topics(content)

        return content, follow_ups, {
            "prompt": total_prompt,
            "completion": total_completion,
            "cost": round(_calc_cost(total_prompt, total_completion), 8),
            "model": model_used,
            "cacheable": True,
        }

    except Exception as e:
        logger.error("LLM error: %s", e, exc_info=True)
        reply, suggestions = random.choice(FALLBACK_REPLIES)
        return reply, suggestions, {"prompt": 0, "completion": 0, "cost": 0, "model": model_used, "cacheable": False}
