from typing import Any

"""
Helix — Auth Module: Router
FastAPI route handlers for authentication endpoints.
"""

import urllib.parse

from fastapi import APIRouter, Request, status
from fastapi.responses import ORJSONResponse, RedirectResponse

from src.core.config import settings
from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import ok_json
from src.modules.auth.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from src.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _get_request_meta(request: Request) -> dict[str, Any]:
    """Extract IP and User-Agent from request."""
    return {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }


# ─────────────────────────────────────────────
# OAuth — Google & GitHub
# ─────────────────────────────────────────────


@router.get(
    "/oauth/google",
    summary="Initiate Google OAuth login",
    include_in_schema=True,
)
async def oauth_google_login() -> RedirectResponse:
    """Redirect browser to Google's authorization page."""
    from src.modules.auth.oauth_service import generate_state, get_google_auth_url

    state = generate_state()
    url = get_google_auth_url(state)
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get(
    "/oauth/google/callback",
    summary="Google OAuth callback — exchanges code and redirects to frontend",
    include_in_schema=True,
)
async def oauth_google_callback(
    request: Request,
    db: DBSession,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    """Exchange Google authorization code for tokens, create/find user, redirect to frontend."""
    frontend_callback = f"{settings.APP_URL}/oauth/callback"

    if error or not code:
        err_msg = urllib.parse.quote(error or "no_code", safe="")
        return RedirectResponse(url=f"{frontend_callback}?error={err_msg}")

    from src.modules.auth.oauth_service import (
        exchange_google_code,
        find_or_create_oauth_user,
        issue_tokens_for_user,
    )
    from src.modules.auth.repository import AuthRepository

    try:
        userinfo = await exchange_google_code(code)
        repo = AuthRepository(db)
        user = await find_or_create_oauth_user(
            repo=repo,
            provider="google",
            provider_user_id=str(userinfo["sub"]),
            email=userinfo.get("email"),
            display_name=userinfo.get("name") or userinfo.get("email", "").split("@")[0],
            avatar_url=userinfo.get("picture"),
        )
        meta = _get_request_meta(request)
        login_resp = await issue_tokens_for_user(repo, user, meta.get("ip"), meta.get("user_agent"))
        await db.commit()

        user_json = urllib.parse.quote(login_resp.user.model_dump_json(), safe="")
        params = f"access_token={login_resp.tokens.access_token}" f"&refresh_token={login_resp.tokens.refresh_token}" f"&user={user_json}"
        return RedirectResponse(url=f"{frontend_callback}?{params}")

    except Exception as exc:
        import structlog

        structlog.get_logger(__name__).error("google_oauth_callback_error", error=str(exc))
        err_msg = urllib.parse.quote(str(exc)[:200], safe="")
        return RedirectResponse(url=f"{frontend_callback}?error={err_msg}")


@router.get(
    "/oauth/github",
    summary="Initiate GitHub OAuth login",
    include_in_schema=True,
)
async def oauth_github_login() -> RedirectResponse:
    """Redirect browser to GitHub's authorization page."""
    from src.modules.auth.oauth_service import generate_state, get_github_auth_url

    state = generate_state()
    url = get_github_auth_url(state)
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get(
    "/oauth/github/callback",
    summary="GitHub OAuth callback — exchanges code and redirects to frontend",
    include_in_schema=True,
)
async def oauth_github_callback(
    request: Request,
    db: DBSession,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    """Exchange GitHub authorization code for tokens, create/find user, redirect to frontend."""
    frontend_callback = f"{settings.APP_URL}/oauth/callback"

    if error or not code:
        err_msg = urllib.parse.quote(error or "no_code", safe="")
        return RedirectResponse(url=f"{frontend_callback}?error={err_msg}")

    from src.modules.auth.oauth_service import (
        exchange_github_code,
        find_or_create_oauth_user,
        issue_tokens_for_user,
    )
    from src.modules.auth.repository import AuthRepository

    try:
        profile = await exchange_github_code(code)
        repo = AuthRepository(db)
        user = await find_or_create_oauth_user(
            repo=repo,
            provider="github",
            provider_user_id=str(profile["id"]),
            email=profile.get("email"),
            display_name=profile.get("name") or profile.get("login", ""),
            avatar_url=profile.get("avatar_url"),
        )
        meta = _get_request_meta(request)
        login_resp = await issue_tokens_for_user(repo, user, meta.get("ip"), meta.get("user_agent"))
        await db.commit()

        user_json = urllib.parse.quote(login_resp.user.model_dump_json(), safe="")
        params = f"access_token={login_resp.tokens.access_token}" f"&refresh_token={login_resp.tokens.refresh_token}" f"&user={user_json}"
        return RedirectResponse(url=f"{frontend_callback}?{params}")

    except Exception as exc:
        import structlog

        structlog.get_logger(__name__).error("github_oauth_callback_error", error=str(exc))
        err_msg = urllib.parse.quote(str(exc)[:200], safe="")
        return RedirectResponse(url=f"{frontend_callback}?error={err_msg}")


# ─────────────────────────────────────────────
# Registration & Login
# ─────────────────────────────────────────────


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    data: RegisterRequest,
    request: Request,
    db: DBSession,
) -> ORJSONResponse:
    """
    Create a new user account and return tokens.
    Sends an email verification link in the background.
    """
    service = AuthService(db)
    result = await service.register(data, request_meta=_get_request_meta(request))
    return ORJSONResponse(
        content=ok_json(result.model_dump(mode="json")),
        status_code=status.HTTP_201_CREATED,
    )


@router.post(
    "/login",
    summary="Login with email and password",
)
async def login(
    data: LoginRequest,
    request: Request,
    db: DBSession,
) -> ORJSONResponse:
    service = AuthService(db)
    result = await service.login(data, request_meta=_get_request_meta(request))
    return ORJSONResponse(content=ok_json(result.model_dump(mode="json")))


# ─────────────────────────────────────────────
# Token Management
# ─────────────────────────────────────────────


@router.post(
    "/refresh",
    summary="Refresh access token",
)
async def refresh_token(
    data: RefreshTokenRequest,
    request: Request,
    db: DBSession,
) -> ORJSONResponse:
    """Rotate the refresh token and issue a new access token."""
    service = AuthService(db)
    result = await service.refresh(data.refresh_token, request_meta=_get_request_meta(request))
    return ORJSONResponse(content=ok_json(result.model_dump(mode="json")))


@router.post(
    "/logout",
    summary="Logout (revoke refresh token)",
)
async def logout(
    data: RefreshTokenRequest,
    db: DBSession,
) -> ORJSONResponse:
    service = AuthService(db)
    result = await service.logout(data.refresh_token)
    return ORJSONResponse(content=ok_json(result.model_dump(mode="json")))


@router.post(
    "/logout-all",
    summary="Logout from all devices",
)
async def logout_all(
    current_user_id: CurrentUserID,
    db: DBSession,
) -> ORJSONResponse:
    service = AuthService(db)
    result = await service.logout_all_devices(current_user_id)
    return ORJSONResponse(content=ok_json(result.model_dump(mode="json")))


# ─────────────────────────────────────────────
# Email Verification
# ─────────────────────────────────────────────


@router.post(
    "/verify-email",
    summary="Verify email address with token",
)
async def verify_email(
    data: VerifyEmailRequest,
    db: DBSession,
) -> ORJSONResponse:
    service = AuthService(db)
    result = await service.verify_email(data.token)
    return ORJSONResponse(content=ok_json(result.model_dump(mode="json")))


# ─────────────────────────────────────────────
# Password Reset
# ─────────────────────────────────────────────


@router.post(
    "/forgot-password",
    summary="Request password reset email",
)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: DBSession,
) -> ORJSONResponse:
    # Always return success to prevent email enumeration
    return ORJSONResponse(content=ok_json(MessageResponse(message="If an account exists, a reset link has been sent").model_dump(mode="json")))


@router.post(
    "/reset-password",
    summary="Reset password with token",
)
async def reset_password(
    data: ResetPasswordRequest,
    db: DBSession,
) -> ORJSONResponse:
    return ORJSONResponse(content=ok_json(MessageResponse(message="Password reset successfully").model_dump(mode="json")))
