"""Helix — Rate Limiting Middleware
Sliding window rate limiter backed by Redis.
Limits: per-user (authenticated) or per-IP (anonymous).
"""
from __future__ import annotations

import hashlib
import time

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Any, Callable, Awaitable
from starlette.responses import JSONResponse

# Routes with custom limits (requests per minute)
ROUTE_LIMITS: dict[str, int] = {
    "/api/v1/ai/": 30,           # AI endpoints — heavier compute
    "/api/v1/auth/login": 10,    # Login — brute force protection
    "/api/v1/auth/register": 5,  # Register — spam protection
}
DEFAULT_AUTHENTICATED_RPM = 300
DEFAULT_ANONYMOUS_RPM = 20


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter using Redis.
    Falls back to no-op if Redis is unavailable.
    """

    def __init__(self, app: FastAPI, redis_client: Any = None) -> None:
        super().__init__(app)
        self._redis = redis_client

    def _get_limit(self, path: str, is_authenticated: bool) -> int:
        for prefix, limit in ROUTE_LIMITS.items():
            if path.startswith(prefix):
                return limit
        return DEFAULT_AUTHENTICATED_RPM if is_authenticated else DEFAULT_ANONYMOUS_RPM

    def _get_key(self, request: Request) -> tuple[str, bool]:
        """Return (rate_limit_key, is_authenticated)."""
        token = request.headers.get("authorization", "")
        if token.startswith("Bearer "):
            # Hash the token so we don't store raw JWTs in Redis
            key = f"rl:user:{hashlib.sha256(token.encode()).hexdigest()[:16]}"
            return key, True
        ip = request.client.host if request.client else "unknown"
        return f"rl:ip:{ip}", False

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        # Skip health, docs, and static assets
        path = request.url.path
        if path in ("/api/health", "/docs", "/openapi.json", "/redoc") or not path.startswith("/api"):
            return await call_next(request)

        redis = self._redis
        if not redis:
            from src.infrastructure.cache.redis import get_redis_client
            redis = await get_redis_client()

        if not redis:
            return await call_next(request)

        key, is_auth = self._get_key(request)
        limit = self._get_limit(path, is_auth)
        window = 60  # 1 minute sliding window
        now = int(time.time())
        window_key = f"{key}:{now // window}"

        try:
            current = await redis.incr(window_key)
            if current == 1:
                await redis.expire(window_key, window * 2)

            remaining = max(0, limit - current)
            reset_at = (now // window + 1) * window

            if current > limit:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": f"Too many requests. Limit: {limit}/min. Retry after {reset_at - now}s.",
                            "retry_after": reset_at - now,
                        },
                    },
                    headers={
                        "Retry-After": str(reset_at - now),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_at),
                    },
                )

            response: Response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_at)
            return response

        except Exception:
            # Redis unavailable — fail open (don't block traffic)
            return await call_next(request)
