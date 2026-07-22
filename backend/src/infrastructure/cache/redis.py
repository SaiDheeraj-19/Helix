"""
Helix Backend — Redis Client
Async Redis connection pool with helper utilities.
"""


import redis.asyncio as aioredis
import structlog

from src.core.config import settings

logger = structlog.get_logger(__name__)

_redis_pool: aioredis.ConnectionPool | None = None
_redis_client: aioredis.Redis | None = None


async def init_redis() -> None:
    """Initialize the Redis connection pool. Called at app startup."""
    global _redis_pool, _redis_client

    _redis_pool = aioredis.ConnectionPool.from_url(
        settings.redis_url_str,
        max_connections=50,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True,
    )
    _redis_client = aioredis.Redis(connection_pool=_redis_pool)

    # Verify connection
    try:
        await _redis_client.ping()
        logger.info("redis_connected", url=settings.redis_url_str)
    except Exception as exc:
        logger.error("redis_connection_failed", error=str(exc))
        raise


async def close_redis() -> None:
    """Close the Redis connection pool. Called at app shutdown."""
    global _redis_client, _redis_pool
    if _redis_client:
        await _redis_client.aclose()
    if _redis_pool:
        await _redis_pool.aclose()
    logger.info("redis_disconnected")


async def get_redis_client() -> aioredis.Redis:
    """Get the Redis client instance."""
    if _redis_client is None:
        raise RuntimeError("Redis client not initialized. Call init_redis() first.")
    return _redis_client


# =============================================================================
# Cache Helpers
# =============================================================================


class RedisCache:
    """High-level caching utilities."""

    def __init__(self, client: aioredis.Redis, prefix: str = "helix") -> None:
        self._client = client
        self._prefix = prefix

    def _key(self, key: str) -> str:
        return f"{self._prefix}:{key}"

    async def get(self, key: str) -> str | None:
        return await self._client.get(self._key(key))

    async def set(
        self,
        key: str,
        value: str,
        ttl: int = settings.REDIS_CACHE_TTL,
    ) -> None:
        await self._client.setex(self._key(key), ttl, value)

    async def delete(self, key: str) -> None:
        await self._client.delete(self._key(key))

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern. Use carefully in production."""
        keys = await self._client.keys(self._key(pattern))
        if keys:
            return await self._client.delete(*keys)
        return 0

    async def exists(self, key: str) -> bool:
        return bool(await self._client.exists(self._key(key)))

    async def increment(self, key: str, amount: int = 1, ttl: int | None = None) -> int:
        full_key = self._key(key)
        value = await self._client.incrby(full_key, amount)
        if ttl and value == amount:  # First increment — set TTL
            await self._client.expire(full_key, ttl)
        return value

    async def ttl(self, key: str) -> int:
        return await self._client.ttl(self._key(key))


# =============================================================================
# Rate Limiter (Sliding Window)
# =============================================================================


class RateLimiter:
    """Redis-backed sliding window rate limiter."""

    def __init__(self, client: aioredis.Redis) -> None:
        self._client = client

    async def is_allowed(
        self,
        identifier: str,
        limit: int,
        window_seconds: int = 60,
    ) -> tuple[bool, int, int]:
        """
        Check if a request is within the rate limit.

        Returns:
            (is_allowed, current_count, reset_in_seconds)
        """
        key = f"rl:{identifier}"
        now = int(__import__("time").time())
        window_start = now - window_seconds

        pipe = self._client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, window_seconds)
        results = await pipe.execute()

        count = results[2]
        reset_in = window_seconds - (now % window_seconds)

        return count <= limit, count, reset_in
