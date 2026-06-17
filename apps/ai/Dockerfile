# ── Builder stage ────────────────────────────────────────────
FROM python:3.12-alpine AS builder

WORKDIR /build

RUN apk add --no-cache gcc musl-dev python3-dev

COPY apps/ai/pyproject.toml .
RUN pip install --no-cache-dir --prefix=/install --no-compile \
    fastapi uvicorn pydantic pydantic-settings httpx openai asyncpg

# ── Runtime stage ────────────────────────────────────────────
FROM python:3.12-alpine

WORKDIR /app

# Copy only installed packages
COPY --from=builder /install /usr/local

# Copy source
COPY apps/ai/src/ src/

# Cleanup: remove .pyc, __pycache__, and pip cache
RUN find /usr/local -name "*.pyc" -delete && \
    find /usr/local -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true && \
    rm -rf /root/.cache /tmp/* && \
    adduser -D -u 1001 app && \
    chown -R app:app /app
USER app

EXPOSE 8000

ENV AI_HOST=0.0.0.0
ENV AI_PORT=8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
