"""
Helix Backend — SQLAlchemy Async Session Factory
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.core.config import settings

# ─────────────────────────────────────────────
# Async Engine
# ─────────────────────────────────────────────
engine = create_async_engine(
    settings.database_url_str,
    echo=settings.DATABASE_ECHO,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_pre_ping=True,  # Reconnect on stale connections
    pool_recycle=3600,   # Recycle connections after 1 hour
    connect_args={
        "server_settings": {
            "application_name": "helix-backend",
        }
    },
)

# ─────────────────────────────────────────────
# Session Factory
# ─────────────────────────────────────────────
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevents lazy loading after commit
    autocommit=False,
    autoflush=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency-injectable async DB session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
