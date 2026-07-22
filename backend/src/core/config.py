"""
Helix Backend — Application Configuration
Uses Pydantic Settings for type-safe environment variable management.
"""

from functools import lru_cache
from typing import Literal

from pydantic import PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─────────────────────────────────────────────
    # App
    # ─────────────────────────────────────────────
    APP_NAME: str = "Helix"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_URL: str = "http://localhost:3000"
    API_URL: str = "http://localhost:8000"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    API_V1_PREFIX: str = "/api/v1"

    # ─────────────────────────────────────────────
    # Security
    # ─────────────────────────────────────────────
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CSRF_SECRET: str = ""

    # ─────────────────────────────────────────────
    # Database
    # ─────────────────────────────────────────────
    DATABASE_URL: PostgresDsn
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_ECHO: bool = False

    # ─────────────────────────────────────────────
    # Redis
    # ─────────────────────────────────────────────
    REDIS_URL: RedisDsn = "redis://localhost:6379/0"  # type: ignore[assignment]
    REDIS_CACHE_TTL: int = 3600

    # ─────────────────────────────────────────────
    # RabbitMQ
    # ─────────────────────────────────────────────
    RABBITMQ_URL: str = "amqp://helix:helix_dev_password@localhost:5672/"

    # ─────────────────────────────────────────────
    # MinIO
    # ─────────────────────────────────────────────
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_ATTACHMENTS: str = "helix-attachments"
    MINIO_BUCKET_AVATARS: str = "helix-avatars"
    MINIO_BUCKET_DOCUMENTS: str = "helix-documents"
    MINIO_USE_SSL: bool = False
    MINIO_PUBLIC_URL: str = "http://localhost:9000"

    # ─────────────────────────────────────────────
    # Qdrant
    # ─────────────────────────────────────────────
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION_ISSUES: str = "helix_issues"
    QDRANT_COLLECTION_DOCUMENTS: str = "helix_documents"

    # ─────────────────────────────────────────────
    # OAuth
    # ─────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"

    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth/github/callback"

    # ─────────────────────────────────────────────
    # Email
    # ─────────────────────────────────────────────
    SMTP_HOST: str = "smtp.mailtrap.io"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "no-reply@helix.app"          # matches SMTP_FROM in .env
    SMTP_FROM_NAME: str = "Helix"
    SMTP_TLS: bool = True

    # ─────────────────────────────────────────────
    # Notifications — Novu
    # ─────────────────────────────────────────────
    NOVU_API_KEY: str = ""
    NOVU_APPLICATION_IDENTIFIER: str = ""

    # ─────────────────────────────────────────────
    # AI
    # ─────────────────────────────────────────────
    AI_PROVIDER: Literal["openai", "ollama", "groq", "openrouter", "anthropic", "azure_openai"] = "ollama"
    AI_FALLBACK_PROVIDER: Literal["openai", "ollama", "groq", "openrouter", "anthropic"] = "groq"

    # Ollama (local)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"

    # Groq
    GROQ_API_KEY: str = ""

    # OpenRouter
    OPENROUTER_API_KEY: str = ""

    # OpenAI (optional)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Anthropic (optional)
    ANTHROPIC_API_KEY: str = ""

    # ─────────────────────────────────────────────
    # Rate Limiting
    # ─────────────────────────────────────────────
    RATE_LIMIT_ANONYMOUS: int = 20
    RATE_LIMIT_AUTHENTICATED: int = 300
    RATE_LIMIT_PREMIUM: int = 1000
    RATE_LIMIT_AI: int = 30

    # ─────────────────────────────────────────────
    # CORS
    # ─────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    CORS_ALLOW_CREDENTIALS: bool = True

    # ─────────────────────────────────────────────
    # Feature Flags
    # ─────────────────────────────────────────────
    FEATURE_AI_ENABLED: bool = True
    FEATURE_WEBHOOKS_ENABLED: bool = True
    FEATURE_AUTOMATIONS_ENABLED: bool = True
    FEATURE_INTEGRATIONS_ENABLED: bool = True
    FEATURE_ANALYTICS_ENABLED: bool = True

    # ─────────────────────────────────────────────
    # Sentry
    # ─────────────────────────────────────────────
    SENTRY_DSN: str = ""

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            stripped = v.strip()
            # Handle JSON array format: ["http://localhost:3000","http://localhost:3001"]
            if stripped.startswith("["):
                import json
                try:
                    return json.loads(stripped)
                except json.JSONDecodeError:
                    pass
            # Handle comma-separated format
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    @property
    def database_url_str(self) -> str:
        return str(self.DATABASE_URL)

    @property
    def redis_url_str(self) -> str:
        return str(self.REDIS_URL)

    @property
    def MINIO_ATTACHMENTS_BUCKET(self) -> str:
        """Alias for backward-compat with router code."""
        return self.MINIO_BUCKET_ATTACHMENTS


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — loaded once at startup."""
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
