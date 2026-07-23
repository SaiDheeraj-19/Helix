"""
Helix Backend — Middleware Stack
Request ID injection, structured logging, CORS, rate limiting.
"""

import time
from uuid import uuid4

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Any, Callable, Awaitable

from src.core.config import settings

logger = structlog.get_logger(__name__)


# =============================================================================
# Request ID + Structured Logging Middleware
# =============================================================================


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Injects a unique request ID into every request and logs
    method, path, status code, and response time.
    """

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        request.state.request_id = request_id

        start_time = time.perf_counter()

        # Bind request context to structlog
        with structlog.contextvars.bound_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        ):
            try:
                response = await call_next(request)
            except Exception as exc:
                logger.exception("unhandled_middleware_error", error=str(exc))
                raise

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Skip logging for health checks to reduce noise
            if request.url.path not in ("/api/health", "/api/v1/health"):
                logger.info(
                    "http_request",
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                )

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{duration_ms}ms"
            return response


# =============================================================================
# Security Headers Middleware
# =============================================================================


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: blob: https:; "
                "connect-src 'self' wss: https:;"
            )

        return response


# =============================================================================
# Register Middleware — Called from main.py
# =============================================================================


def register_middleware(app: FastAPI) -> None:
    """Register all middleware in correct order (outermost first)."""

    # GZip compression for responses > 1KB
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # CORS — must be after GZip
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Request-ID",
            "X-CSRF-Token",
            "Accept",
            "Accept-Language",
        ],
        expose_headers=["X-Request-ID", "X-Response-Time", "X-Total-Count"],
    )

    # Rate limiting
    from src.core.rate_limit import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware) # type: ignore

    # Security headers
    app.add_middleware(SecurityHeadersMiddleware)

    # Request ID + logging (outermost = runs first/last)
    app.add_middleware(RequestContextMiddleware)
