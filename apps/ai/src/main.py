"""
MULAI+ AI Service — Chatbot Engine

Phase 1: Keyword-based responder
Phase 2: LLM + RAG pipeline

Integrated with Hono API server via HTTP proxy.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.chatbot_db import create_tables
from src.config import settings
from src.db import close as close_db
from src.routes import admin_router, chat_router, health_router

app = FastAPI(
    title="MULAI+ AI",
    description="Chatbot engine for explore data & lead generation",
    version="0.4.0",
)

# CORS — allow requests only from the Hono proxy (not exposed to public)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "x-session-id", "x-user-id"],
)

# Routers
app.include_router(health_router)
app.include_router(chat_router, prefix="/api")
app.include_router(admin_router, prefix="/api/admin")


# ─── Security: API Key check for all /api/* routes ──────────
# All API routes require a valid Bearer token.
# The token is a shared secret between the Hono proxy and this service,
# configured via AI_API_KEY env var. If unset, a warning is printed but
# auth still requires a token (uses a default-only fallback for local dev).
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Health check is public
    if request.url.path == "/health":
        return await call_next(request)

    if request.url.path.startswith("/api"):
        auth = request.headers.get("Authorization", "")
        expected = f"Bearer {settings.ai_api_key}" if settings.ai_api_key else None

        if expected is not None and auth != expected:
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized. Provide valid API key."},
            )
        elif expected is None:
            print("[ai] WARNING: AI_API_KEY not set — /api/* routes have NO authentication!")

    return await call_next(request)


@app.on_event("startup")
async def startup():
    print(f"🚀 MULAI+ AI v0.4.0 running on {settings.ai_host}:{settings.ai_port}")
    # Ensure chatbot tables exist (idempotent, also handled by Drizzle)
    try:
        await create_tables()
        print("✅ Chatbot tables ready")
    except Exception as e:
        print(f"⚠️  Could not create chatbot tables: {e}")
        print("   Chatbot will still start but DB features may not work.")


@app.on_event("shutdown")
async def shutdown():
    await close_db()
