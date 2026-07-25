"""
MULAI+ AI Service — Chatbot Engine
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.chatbot_db import create_tables
from src.config import settings
from src.db import close as close_db
from src.routes import admin_router, chat_router, health_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("main")

app = FastAPI(title="MULAI+ AI", version="0.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "x-session-id", "x-user-id", "x-request-id"],
)

app.include_router(health_router)
app.include_router(chat_router, prefix="/api")
app.include_router(admin_router, prefix="/api/admin")


# ─── Security ───────────────────────────────────────────────

_BEARER = f"Bearer {settings.ai_api_key}" if settings.ai_api_key else None


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.url.path in ("/health",):
        return await call_next(request)

    if request.url.path.startswith("/api"):
        if _BEARER is None:
            logger.warning("AI_API_KEY not set — rejecting all /api/* requests")
            return JSONResponse(status_code=503, content={"error": "AI service not configured"})

        auth = request.headers.get("Authorization", "")
        if auth != _BEARER:
            return JSONResponse(status_code=401, content={"error": "Unauthorized. Provide valid API key."})

    return await call_next(request)


# ─── Startup / Shutdown ─────────────────────────────────────

@app.on_event("startup")
async def startup():
    logger.info("Starting MULAI+ AI v0.5.0 on %s:%s", settings.ai_host, settings.ai_port)

    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY not set — LLM calls will fail")

    if _BEARER is None:
        logger.warning("AI_API_KEY not set — all API requests will be rejected (503)")

    try:
        await create_tables()
        logger.info("Database tables ready")
    except Exception as e:
        logger.error("Failed to initialize database: %s", e)
        logger.warning("Service starting without database — chatbot features will be limited")


@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down")
    await close_db()
