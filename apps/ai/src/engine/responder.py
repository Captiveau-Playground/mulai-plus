"""
Phase 3: LLM-powered responder with tool calling (DB queries).

Flow:
1. User message → LLM (with tools) → tool call detected
2. Execute tool → get data from DB
3. Tool result + history → LLM → final response

Security:
- Read-only DB access via parameterized queries
- 5s query timeout
- Tool args validated by LLM + schema
"""

from __future__ import annotations

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

Jawab langsung tanpa analisis. Maksimal 3 paragraf. Gunakan emoji secukupnya."""


_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=settings.openai_base_url,
            api_key=settings.openai_api_key,
        )
    return _client


async def get_response(message: str, history: Optional[list[dict]] = None) -> str:
    """Generate response using LLM with tool calling."""
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
                import json
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
            # No tool call needed
            content = msg.content

        if not content:
            # Retry once for buggy models
            resp = client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=0.7,
            )
            content = resp.choices[0].message.content

        return content or "Maaf, aku tidak bisa menjawab saat ini."

    except Exception as e:
        print(f"[responder] Error: {e}")
        import traceback
        traceback.print_exc()
        return (
            "Maaf, layanan sedang sibuk. Coba tanya lagi nanti ya! 🙏\n\n"
            "Sementara itu, kamu bisa cek langsung:\n"
            "- 🏛️ Universitas: /explore/universities\n"
            "- 📚 Program Studi: /explore/study-programs\n"
            "- 📊 Passing Grade: /explore/passing-grade"
        )


def get_suggested_questions() -> list[str]:
    return [
        "Cari universitas negeri di Jawa Timur",
        "Rekomendasi jurusan untuk anak IPA",
        "Passing grade kedokteran UNAIR 2024",
        "Detail Universitas Airlangga",
    ]
