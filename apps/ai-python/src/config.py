from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Service
    ai_host: str = "0.0.0.0"
    ai_port: int = 8000

    # Database
    database_url: str = "postgresql://user:password@localhost:5432/mulai_plus"

    # LLM — Cloudflare Workers AI (OpenAI-compatible endpoint).
    # OPENAI_API_KEY = Cloudflare API token dengan permission "Workers AI: Run".
    # Model: qwen3-30b-a3b-fp8 = paling murah di WA + tool calling + reasoning.
    # Premium (lebih mahal, kualitas terbaik): @cf/openai/gpt-oss-120b
    openai_api_key: str = ""
    openai_base_url: str = (
        "https://api.cloudflare.com/client/v4/accounts/"
        "7b23b1f8e20fd9cb2a7ab0fa6df7021d/ai/v1"
    )
    openai_model: str = "@cf/qwen/qwen3-30b-a3b-fp8"

    # Security
    ai_api_key: str = ""  # shared secret with Hono server; if set, all requests must include Bearer token
    cors_origin: str = "http://localhost:3001"

    # API Server (for proxying lead capture, etc.)
    api_server_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
