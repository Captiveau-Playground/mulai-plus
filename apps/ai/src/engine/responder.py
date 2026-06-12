"""
Phase 3: LLM-powered responder with tool calling (DB queries).

Flow:
1. User message → LLM (with tools) → tool call detected
2. Execute tool → get data from DB
3. Tool result + history → LLM → final response + follow-up suggestions
"""

from __future__ import annotations

import json
from typing import Optional

from openai import OpenAI

from src.config import settings
from src.tools import TOOL_DEFINITIONS, handle_tool_call

SYSTEM_PROMPT = """Kamu adalah asisten chatbot dari MULAI+, platform bimbingan universitas, jurusan, dan beasiswa di Indonesia.

Tugas kamu:
- Membantu calon mahasiswa mencari informasi tentang universitas, program studi, passing grade SNBP/SNBT, dan beasiswa.
- Memberikan rekomendasi jurusan berdasarkan minat mereka.
- Menjelaskan program mentoring MULAI+.
- Bersikap ramah, informatif, dan menggunakan bahasa Indonesia yang natural.
- Jika ditanya di luar konteks pendidikan, arahkan kembali ke topik MULAI+.

Konteks data MULAI+:
- 408+ perguruan tinggi negeri dan swasta
- 18.881 program studi dari berbagai jenjang (D3, S1, S2, S3)
- Data passing grade SNBP/SNBT 5 tahun terakhir
- Program mentoring 1-on-1 dengan mentor berpengalaman
- Program beasiswa mentoring (seleksi)

Kamu punya akses ke database untuk mencari data real-time. GUNAKAN tools yang tersedia untuk menjawab pertanyaan spesifik seperti passing grade, daftar prodi, atau detail universitas. Jangan pernah mengarang data passing grade atau akreditasi.

Jika data dari database tidak ditemukan atau terbatas, jangan membuat data palsu. Cukup sampaikan apa adanya dan sarankan kata kunci alternatif yang mungkin bisa dicoba.

Jawab langsung tanpa analisis. Maksimal 3 paragraf. Gunakan emoji secukupnya."""

FOLLOWUP_PROMPT = """Berdasarkan percakapan di atas, berikan 3 pertanyaan follow-up singkat yang paling relevan untuk user lanjutkan.

Aturan:
- Maksimal 6 kata per pertanyaan
- Fokus pada topik yang sedang dibahas (universitas, prodi, passing grade, beasiswa, mentoring)
- Jika user bertanya tentang sesuatu yang spesifik, follow-up harus nyambung
- Jika data tidak ditemukan, follow-up bisa saran kata kunci lain
- Output: cukup 3 pertanyaan, dipisah newline, tanpa angka atau bullet"""


_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=settings.openai_base_url,
            api_key=settings.openai_api_key,
        )
    return _client


async def get_response(message: str, history: Optional[list[dict]] = None) -> tuple[str, list[str]]:
    """Generate response using LLM with tool calling.
    Returns (reply_text, follow_up_questions).
    """
    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if history:
            for msg in history[-6:]:
                messages.append(msg)

        messages.append({"role": "user", "content": message})

        client = _get_client()

        # Step 1: Call LLM with tools
        resp = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.7,
        )

        msg = resp.choices[0].message

        # If LLM wants to call tools, execute and continue
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

                print(f"[responder] Calling tool: {tc.function.name}({args})")
                result = await handle_tool_call(tc.function.name, args)
                print(f"[responder] Tool result: {result[:200]}...")

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

            # Step 2: Generate final response with tool results
            resp = client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=0.7,
            )

            content = resp.choices[0].message.content
        else:
            content = msg.content

        if not content:
            resp = client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=0.7,
            )
            content = resp.choices[0].message.content

        content = content or "Maaf, aku tidak bisa menjawab saat ini."

        # Step 3: Generate follow-up questions using AI
        follow_ups = await _generate_followups(messages + [{"role": "assistant", "content": content}])

        return content, follow_ups

    except Exception as e:
        print(f"[responder] Error: {e}")
        import traceback
        traceback.print_exc()
        return (
            "Maaf, layanan sedang sibuk. Coba tanya lagi nanti ya! 🙏\n\n"
            "Sementara itu, kamu bisa cek langsung:\n"
            "- 🏛️ Universitas: /explore/universities\n"
            "- 📚 Program Studi: /explore/study-programs\n"
            "- 📊 Passing Grade: /explore/passing-grade",
            ["Cari universitas negeri", "Info passing grade", "Tanya program mentoring"],
        )


async def _generate_followups(context: list[dict]) -> list[str]:
    """Generate 3 follow-up questions based on conversation context."""
    try:
        client = _get_client()
        resp = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": FOLLOWUP_PROMPT},
                *context[-4:],  # last 4 messages for context
                {"role": "user", "content": "Buat 3 pertanyaan follow-up:"},
            ],
            temperature=0.8,
        )

        text = resp.choices[0].message.content or ""
        questions = [q.strip().lstrip("0123456789.-) ") for q in text.strip().split("\n") if q.strip()]
        return questions[:3]

    except Exception as e:
        print(f"[responder] Follow-up gen error: {e}")
        return []
