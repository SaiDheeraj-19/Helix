"""
Helix Backend — Main Application Entry Point
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from src.core.config import settings
from src.core.exceptions import register_exception_handlers
from src.core.middleware import register_middleware
from src.infrastructure.cache.redis import close_redis, get_redis_client, init_redis

logger = structlog.get_logger(__name__)


# =============================================================================
# Application Lifespan
# =============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage startup and shutdown of infrastructure connections."""
    logger.info("helix_starting", env=settings.APP_ENV, version="0.1.0")

    # Startup
    await init_redis()
    redis_client = await get_redis_client()

    # Initialize MinIO buckets
    from src.infrastructure.storage.minio import init_minio
    await init_minio()


    logger.info("helix_ready")
    yield

    # Shutdown
    logger.info("helix_shutting_down")
    await close_redis()
    logger.info("helix_stopped")


# =============================================================================
# FastAPI Application
# =============================================================================


def create_application() -> FastAPI:
    app = FastAPI(
        title="Helix API",
        description="AI-Native Project Management Platform",
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
        contact={
            "name": "Helix Team",
            "url": "https://helix.app",
            "email": "team@helix.app",
        },
        license_info={
            "name": "AGPL-3.0",
            "url": "https://www.gnu.org/licenses/agpl-3.0.html",
        },
    )

    # Register middleware (order matters)
    register_middleware(app)

    # Register exception handlers
    register_exception_handlers(app)

    # Register routers
    _register_routers(app)

    return app


def _register_routers(app: FastAPI) -> None:
    """Register all module routers under /api/v1."""
    from src.modules.ai.router import router as ai_router
    from src.modules.analytics.router import router as analytics_router
    from src.modules.auth.router import router as auth_router
    from src.modules.cycles.router import router as cycles_router
    from src.modules.issues.router import router as issues_router
    from src.modules.notifications.router import router as notifications_router
    from src.modules.organizations.router import router as orgs_router
    from src.modules.projects.router import router as projects_router
    from src.modules.realtime.router import router as realtime_router
    from src.modules.users.router import router as users_router
    from src.modules.workspaces.router import router as workspaces_router

    api_prefix = settings.API_V1_PREFIX

    app.include_router(auth_router, prefix=api_prefix)
    app.include_router(users_router, prefix=api_prefix)
    app.include_router(orgs_router, prefix=api_prefix)
    app.include_router(workspaces_router, prefix=api_prefix)
    app.include_router(projects_router, prefix=api_prefix)
    app.include_router(issues_router, prefix=api_prefix)
    app.include_router(realtime_router, prefix=api_prefix)
    app.include_router(notifications_router, prefix=api_prefix)
    app.include_router(cycles_router, prefix=api_prefix)
    app.include_router(analytics_router, prefix=api_prefix)
    app.include_router(ai_router, prefix=api_prefix)

    # Health check — full liveness probe
    @app.get("/api/health", tags=["System"], include_in_schema=False)
    async def health() -> dict:
        import time

        from src.core.config import settings as s
        from src.infrastructure.database.session import async_session_factory

        checks: dict[str, dict] = {}

        # ─── Database ────────────────────────────────────
        t0 = time.monotonic()
        try:
            async with async_session_factory() as db:
                await db.execute(__import__("sqlalchemy").text("SELECT 1"))
            checks["database"] = {"status": "ok", "latency_ms": round((time.monotonic() - t0) * 1000, 1)}
        except Exception as e:
            checks["database"] = {"status": "error", "detail": str(e)}

        # ─── Redis ───────────────────────────────────────
        t0 = time.monotonic()
        try:
            import redis.asyncio as aioredis
            r = aioredis.from_url(s.redis_url_str, socket_connect_timeout=2)
            await r.ping()
            await r.aclose()
            checks["redis"] = {"status": "ok", "latency_ms": round((time.monotonic() - t0) * 1000, 1)}
        except Exception as e:
            checks["redis"] = {"status": "error", "detail": str(e)}

        # ─── MinIO ───────────────────────────────────────
        t0 = time.monotonic()
        try:
            from src.infrastructure.storage.minio import StorageService
            storage = StorageService()
            # List buckets as a liveness probe
            storage.client.list_buckets()
            checks["minio"] = {"status": "ok", "latency_ms": round((time.monotonic() - t0) * 1000, 1)}
        except Exception as e:
            checks["minio"] = {"status": "error", "detail": str(e)}

        all_ok = all(c["status"] == "ok" for c in checks.values())
        return {
            "status": "ok" if all_ok else "degraded",
            "version": "0.1.0",
            "app": s.APP_NAME,
            "env": s.APP_ENV,
            "checks": checks,
        }


# =============================================================================
# App Instance
# =============================================================================

app = create_application()
