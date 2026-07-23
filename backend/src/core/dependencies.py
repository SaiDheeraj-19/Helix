"""
Helix Backend — FastAPI Dependencies
Provides reusable DI components: DB session, Redis, current user, RBAC.
"""

from collections.abc import AsyncGenerator
from typing import Annotated, Any
from uuid import UUID

import structlog
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import UnauthorizedError
from src.core.security import TokenType, decode_token
from src.infrastructure.cache.redis import get_redis_client
from src.infrastructure.database.session import async_session_factory

logger = structlog.get_logger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)

# =============================================================================
# Database Session
# =============================================================================


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session per request."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


DBSession = Annotated[AsyncSession, Depends(get_db)]

# =============================================================================
# Redis
# =============================================================================


async def get_redis() -> AsyncGenerator[Any, None]:
    """Provide a Redis client per request."""
    client = await get_redis_client()
    try:
        yield client
    finally:
        pass  # Pool manages connections


RedisClient = Annotated[Any, Depends(get_redis)]

# =============================================================================
# Authentication
# =============================================================================


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> UUID:
    """
    Extract and validate the JWT access token from the Authorization header.
    Returns the authenticated user's UUID.
    """
    if not credentials:
        raise UnauthorizedError("No authentication credentials provided")

    try:
        payload = decode_token(credentials.credentials, expected_type=TokenType.ACCESS)
    except JWTError as exc:
        raise UnauthorizedError(str(exc)) from exc

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedError("Token missing subject claim")

    try:
        return UUID(user_id_str)
    except ValueError as exc:
        raise UnauthorizedError("Token contains invalid user identifier") from exc


CurrentUserID = Annotated[UUID, Depends(get_current_user_id)]


async def get_optional_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> UUID | None:
    """Return user ID if authenticated, else None (for public+auth combined endpoints)."""
    if not credentials:
        return None
    try:
        return await get_current_user_id(credentials)
    except (UnauthorizedError, JWTError):
        return None


OptionalUserID = Annotated[UUID | None, Depends(get_optional_user_id)]

# =============================================================================
# Pagination
# =============================================================================


class PaginationParams:
    def __init__(
        self,
        page: int = 1,
        per_page: int = 25,
    ) -> None:
        self.page = max(1, page)
        self.per_page = min(max(1, per_page), 100)  # Cap at 100
        self.offset = (self.page - 1) * self.per_page


Pagination = Annotated[PaginationParams, Depends(PaginationParams)]
