"""
Helix Backend — Security Utilities
JWT creation/validation, password hashing, token management.
"""

from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from src.core.config import settings

# ─────────────────────────────────────────────
# Password Hashing
# ─────────────────────────────────────────────
_pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
)


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return _pwd_context.verify(plain, hashed)


# ─────────────────────────────────────────────
# JWT
# ─────────────────────────────────────────────
class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"
    EMAIL_VERIFICATION = "email_verify"
    PASSWORD_RESET = "password_reset"
    INVITE = "invite"


def create_token(
    subject: str | UUID,
    token_type: TokenType,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """
    Create a signed JWT token.

    Args:
        subject: The token subject (typically user ID).
        token_type: The type of token.
        expires_delta: Optional custom expiry. Falls back to settings defaults.
        extra_claims: Optional additional claims to embed.
    """
    now = datetime.now(UTC)

    if expires_delta is None:
        if token_type == TokenType.ACCESS:
            expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        elif token_type == TokenType.REFRESH:
            expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        elif token_type in (TokenType.EMAIL_VERIFICATION, TokenType.INVITE):
            expires_delta = timedelta(hours=48)
        elif token_type == TokenType.PASSWORD_RESET:
            expires_delta = timedelta(hours=1)
        else:
            expires_delta = timedelta(hours=1)

    claims: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "nbf": now,
    }

    if extra_claims:
        claims.update(extra_claims)

    return jwt.encode(
        claims,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any]:
    """
    Decode and validate a JWT token.

    Raises:
        JWTError: If token is invalid, expired, or wrong type.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as exc:
        raise JWTError(f"Token validation failed: {exc}") from exc

    if expected_type and payload.get("type") != expected_type:
        raise JWTError(
            f"Invalid token type: expected '{expected_type}', got '{payload.get('type')}'"
        )

    return payload


def create_access_token(user_id: str | UUID, org_slug: str | None = None) -> str:
    """Convenience: create an access token for a user."""
    extra: dict[str, Any] = {}
    if org_slug:
        extra["org"] = org_slug
    return create_token(user_id, TokenType.ACCESS, extra_claims=extra or None)


def create_refresh_token(user_id: str | UUID) -> str:
    """Convenience: create a refresh token for a user."""
    return create_token(user_id, TokenType.REFRESH)


def create_verification_token(user_id: str | UUID) -> str:
    """Convenience: create an email verification token."""
    return create_token(user_id, TokenType.EMAIL_VERIFICATION)


def create_password_reset_token(user_id: str | UUID) -> str:
    """Convenience: create a password reset token."""
    return create_token(user_id, TokenType.PASSWORD_RESET)


# ─────────────────────────────────────────────
# Password Strength
# ─────────────────────────────────────────────
import re


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets security requirements.
    Returns (is_valid, error_message).
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character."
    return True, ""
