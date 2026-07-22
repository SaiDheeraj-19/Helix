"""
Helix — Auth Module: Service
Business logic layer — orchestrates repository calls, sends events.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import structlog
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.exceptions import ConflictError, NotFoundError, UnauthorizedError, ValidationError_
from src.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    create_verification_token,
    decode_token,
    hash_password,
    verify_password,
)
from src.modules.auth.repository import AuthRepository
from src.modules.auth.schemas import (
    AuthUserResponse,
    LoginResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
)
from src.modules.users.models import User, UserStatus

logger = structlog.get_logger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = AuthRepository(db)
        self._db = db

    async def register(self, data: RegisterRequest, request_meta: dict | None = None) -> LoginResponse:
        """Register a new user with email/password."""

        # Check uniqueness
        if await self._repo.get_user_by_email(data.email):
            raise ConflictError("An account with this email already exists")
        if await self._repo.get_user_by_username(data.username):
            raise ConflictError("This username is already taken")

        # Create user
        user = await self._repo.create_user(
            email=data.email,
            username=data.username,
            display_name=data.display_name,
            hashed_password=hash_password(data.password),
        )

        logger.info("user_registered", user_id=str(user.id), email=user.email)

        # Issue tokens
        tokens = await self._issue_tokens(
            user=user,
            ip_address=request_meta.get("ip") if request_meta else None,
            user_agent=request_meta.get("user_agent") if request_meta else None,
        )

        # TODO: Send verification email via queue
        # await self._send_verification_email(user)

        return LoginResponse(tokens=tokens, user=AuthUserResponse.model_validate(user))

    async def login(
        self, data: LoginRequest, request_meta: dict | None = None
    ) -> LoginResponse:
        """Authenticate with email/password."""
        user = await self._repo.get_user_by_email(data.email)

        # Timing-safe: always hash even if user not found to prevent enumeration
        if not user or not user.hashed_password:
            verify_password("dummy", hash_password("dummy"))
            raise UnauthorizedError("Invalid email or password")

        if not verify_password(data.password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")

        if user.status == UserStatus.SUSPENDED:
            raise UnauthorizedError("Your account has been suspended. Contact support.")

        logger.info("user_logged_in", user_id=str(user.id))

        tokens = await self._issue_tokens(
            user=user,
            ip_address=request_meta.get("ip") if request_meta else None,
            user_agent=request_meta.get("user_agent") if request_meta else None,
        )

        return LoginResponse(tokens=tokens, user=AuthUserResponse.model_validate(user))

    async def refresh(
        self, token: str, request_meta: dict | None = None
    ) -> TokenResponse:
        """Rotate a refresh token. Detects reuse via token families."""
        stored = await self._repo.get_refresh_token(token)

        if not stored:
            raise UnauthorizedError("Invalid refresh token")

        if stored.revoked_at is not None:
            # TOKEN REUSE DETECTED — revoke entire family
            logger.warning(
                "refresh_token_reuse_detected",
                family=stored.family,
                user_id=str(stored.user_id),
            )
            await self._repo.revoke_token_family(stored.family)
            raise UnauthorizedError("Refresh token reuse detected. Please log in again.")

        if stored.expires_at < datetime.now(UTC):
            raise UnauthorizedError("Refresh token has expired")

        # Revoke used token
        await self._repo.revoke_refresh_token(token)

        # Get user
        user = await self._repo.get_user_by_id(stored.user_id)
        if not user or user.status == UserStatus.SUSPENDED:
            raise UnauthorizedError("User is not authorized")

        # Issue new tokens in same family
        return await self._issue_tokens(
            user=user,
            family=stored.family,
            ip_address=request_meta.get("ip") if request_meta else None,
            user_agent=request_meta.get("user_agent") if request_meta else None,
        )

    async def logout(self, refresh_token: str) -> MessageResponse:
        """Revoke the provided refresh token."""
        await self._repo.revoke_refresh_token(refresh_token)
        return MessageResponse(message="Logged out successfully")

    async def logout_all_devices(self, user_id: UUID) -> MessageResponse:
        """Revoke all refresh tokens for the user."""
        await self._repo.revoke_all_user_tokens(user_id)
        logger.info("user_logged_out_all_devices", user_id=str(user_id))
        return MessageResponse(message="Logged out from all devices")

    async def verify_email(self, token: str) -> MessageResponse:
        """Verify a user's email address."""
        try:
            payload = decode_token(token, expected_type=TokenType.EMAIL_VERIFICATION)
        except JWTError as exc:
            raise UnauthorizedError("Invalid or expired verification token") from exc

        user_id = UUID(payload["sub"])
        user = await self._repo.get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User")

        if user.is_email_verified:
            return MessageResponse(message="Email already verified")

        await self._repo.mark_email_verified(user_id)
        logger.info("email_verified", user_id=str(user_id))

        return MessageResponse(message="Email verified successfully")

    # ─────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────

    async def _issue_tokens(
        self,
        user: User,
        family: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        import secrets

        access_token = create_access_token(user.id)

        # Generate a cryptographically secure refresh token
        raw_refresh = secrets.token_urlsafe(64)
        expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self._repo.store_refresh_token(
            user_id=user.id,
            token=raw_refresh,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
            family=family,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
