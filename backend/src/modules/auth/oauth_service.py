"""
Helix — OAuth Service
Handles Google and GitHub OAuth2 flows:
- Builds authorization URLs
- Exchanges authorization codes for tokens
- Fetches user profiles
- Creates or links accounts in the database
- Issues Helix JWTs
"""

import secrets
import urllib.parse
from typing import Any

import httpx
import structlog

from src.core.config import settings
from src.core.exceptions import UnauthorizedError, ValidationError_
from src.core.security import create_access_token
from src.modules.auth.repository import AuthRepository
from src.modules.auth.schemas import AuthUserResponse, LoginResponse, TokenResponse
from src.modules.users.models import User

logger = structlog.get_logger(__name__)


# ─────────────────────────────────────────────
# Provider configuration
# ─────────────────────────────────────────────

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USERINFO_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


# ─────────────────────────────────────────────
# State helpers (simple CSRF protection)
# ─────────────────────────────────────────────


def generate_state() -> str:
    """Generate a cryptographically secure random state token."""
    return secrets.token_urlsafe(32)


# ─────────────────────────────────────────────
# URL builders
# ─────────────────────────────────────────────


def get_google_auth_url(state: str) -> str:
    """Build the Google OAuth authorization URL."""
    if not settings.GOOGLE_CLIENT_ID:
        raise ValidationError_("Google OAuth is not configured")

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


def get_github_auth_url(state: str) -> str:
    """Build the GitHub OAuth authorization URL."""
    if not settings.GITHUB_CLIENT_ID:
        raise ValidationError_("GitHub OAuth is not configured")

    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "user:email read:user",
        "state": state,
    }
    return f"{GITHUB_AUTH_URL}?{urllib.parse.urlencode(params)}"


# ─────────────────────────────────────────────
# Token exchange helpers
# ─────────────────────────────────────────────


async def exchange_google_code(code: str) -> dict[str, Any]:
    """Exchange an authorization code for Google tokens and return userinfo."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Exchange code for tokens
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            logger.error("google_token_exchange_failed", status=token_resp.status_code, body=token_resp.text)
            raise UnauthorizedError("Google token exchange failed")

        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise UnauthorizedError("No access token returned from Google")

        # Fetch userinfo
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_resp.status_code != 200:
            raise UnauthorizedError("Failed to fetch Google user info")

        return dict(userinfo_resp.json())


async def exchange_github_code(code: str) -> dict[str, Any]:
    """Exchange an authorization code for GitHub tokens and return user profile."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Exchange code for access token
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )
        if token_resp.status_code != 200:
            logger.error("github_token_exchange_failed", status=token_resp.status_code, body=token_resp.text)
            raise UnauthorizedError("GitHub token exchange failed")

        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise UnauthorizedError("No access token returned from GitHub")

        # Fetch user profile
        profile_resp = await client.get(
            GITHUB_USERINFO_URL,
            headers={"Authorization": f"token {access_token}", "Accept": "application/json"},
        )
        if profile_resp.status_code != 200:
            raise UnauthorizedError("Failed to fetch GitHub user profile")

        profile = profile_resp.json()

        # GitHub may have null email on profile — fetch emails separately
        if not profile.get("email"):
            emails_resp = await client.get(
                GITHUB_EMAILS_URL,
                headers={"Authorization": f"token {access_token}", "Accept": "application/json"},
            )
            if emails_resp.status_code == 200:
                emails = emails_resp.json()
                primary = next(
                    (e["email"] for e in emails if e.get("primary") and e.get("verified")),
                    next((e["email"] for e in emails if e.get("verified")), None),
                )
                profile["email"] = primary

        return dict(profile)


# ─────────────────────────────────────────────
# OAuth user upsert (find or create)
# ─────────────────────────────────────────────


def _slugify_username(raw: str) -> str:
    """Turn an arbitrary string into a valid lowercase username."""
    import re

    slug = re.sub(r"[^a-zA-Z0-9_-]", "_", raw).lower().strip("_-")
    return slug[:30] or "user"


async def find_or_create_oauth_user(
    repo: AuthRepository,
    provider: str,
    provider_user_id: str,
    email: str | None,
    display_name: str,
    avatar_url: str | None,
    oauth_access_token: str | None = None,
) -> User:
    """
    Find an existing user by OAuth account, or create a new one.
    Also handles linking an OAuth provider to an existing email account.
    """
    # 1. Check if there's an existing OAuth account for this provider+id
    oauth_account = await repo.get_oauth_account(provider, provider_user_id)
    if oauth_account:
        user = await repo.get_user_by_id(oauth_account.user_id)
        if user:
            logger.info("oauth_existing_user", provider=provider, user_id=str(user.id))
            return user

    # 2. If the provider gave us an email, check for an existing Helix user
    if email:
        existing_user = await repo.get_user_by_email(email)
        if existing_user:
            # Link this OAuth provider to the existing account
            await repo.create_oauth_account(
                user_id=existing_user.id,
                provider=provider,
                provider_user_id=provider_user_id,
                provider_email=email,
                access_token=oauth_access_token,
            )
            logger.info("oauth_linked_existing_user", provider=provider, user_id=str(existing_user.id))
            return existing_user

    # 3. Create a brand new user
    if not email:
        raise UnauthorizedError(f"Could not retrieve a verified email from {provider}. " "Please ensure your account has a public or verified email.")

    # Build a unique username from display name or email
    base_username = _slugify_username(display_name or email.split("@")[0])
    username = base_username
    counter = 1
    while await repo.get_user_by_username(username):
        username = f"{base_username}{counter}"
        counter += 1

    new_user = await repo.create_user(
        email=email,
        username=username,
        display_name=display_name or email.split("@")[0],
        hashed_password=None,  # OAuth users have no password
    )

    # Mark email as verified (OAuth providers verify emails)
    await repo.mark_email_verified(new_user.id)

    # Link the OAuth provider
    await repo.create_oauth_account(
        user_id=new_user.id,
        provider=provider,
        provider_user_id=provider_user_id,
        provider_email=email,
        access_token=oauth_access_token,
    )

    logger.info("oauth_new_user_created", provider=provider, user_id=str(new_user.id))
    return new_user


# ─────────────────────────────────────────────
# Issue tokens for an OAuth user
# ─────────────────────────────────────────────


async def issue_tokens_for_user(
    repo: AuthRepository,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> LoginResponse:
    """Issue access + refresh tokens and return a LoginResponse."""
    import secrets
    from datetime import UTC, datetime, timedelta

    access_token = create_access_token(user.id)
    raw_refresh = secrets.token_urlsafe(64)
    expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    await repo.store_refresh_token(
        user_id=user.id,
        token=raw_refresh,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return LoginResponse(
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
        user=AuthUserResponse.model_validate(user),
    )
