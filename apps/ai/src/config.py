from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Service
    ai_host: str = "0.0.0.0"
    ai_port: int = 8000

    # Database
    database_url: str = "postgresql://user:password@localhost:5432/mulai_plus"

    # LLM
    openai_api_key: str = ""
    openai_base_url: str = "https://opencode.ai/zen/go/v1"
    openai_model: str = "deepseek-v4-flash"

    # Security
    ai_api_key: str = ""  # shared secret with Hono server; if set, all requests must include Bearer token
    cors_origin: str = "http://localhost:3001"

    # API Server (for proxying lead capture, etc.)
    api_server_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
