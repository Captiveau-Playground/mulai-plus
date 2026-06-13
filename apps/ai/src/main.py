"""
MULAI+ AI Service — Chatbot Engine

Phase 1: Keyword-based responder
Phase 2: LLM + RAG pipeline

Integrated with Hono API server via HTTP proxy.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src import chatbot_db
from src.config import settings
from src.db import close as close_db
from src.routes import admin_router, chat_router, health_router

app = FastAPI(
    title="MULAI+ AI",
    description="Chatbot engine for explore data & lead generation",
    version="0.4.0",
)

# CORS — allow requests from web & API server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health_router)
app.include_router(chat_router, prefix="/api")
app.include_router(admin_router, prefix="/api/admin")


# ─── Security: API Key check for /api/* routes ─────────────────
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Skip health check
    if request.url.path == "/health":
        return await call_next(request)

    # Only check /api/* routes
    # Skip auth for admin endpoints (proxied via Hono server with API key)
    if request.url.path.startswith("/api/admin"):
        return await call_next(request)

    if request.url.path.startswith("/api"):
        if settings.ai_api_key:
            auth = request.headers.get("Authorization", "")
            if auth != f"Bearer {settings.ai_api_key}":
                return JSONResponse(
                    status_code=401,
                    content={"error": "Unauthorized. Provide valid API key."},
                )

    return await call_next(request)


@app.on_event("startup")
async def startup():
    await chatbot_db.init_tables()
    print(f"🚀 MULAI+ AI v0.4.0 running on {settings.ai_host}:{settings.ai_port}")


@app.on_event("shutdown")
async def shutdown():
    await close_db()
    await chatbot_db.close()
