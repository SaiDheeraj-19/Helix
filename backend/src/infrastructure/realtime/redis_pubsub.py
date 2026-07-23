"""
Helix — Redis Pub/Sub integration for Real-time Events
"""

import asyncio
import json
from typing import Any

import structlog
from redis.asyncio import Redis

from src.core.config import settings
from src.infrastructure.realtime.manager import manager

logger = structlog.get_logger(__name__)

# Global redis connection for pub/sub
_redis_client: Redis | None = None
_pubsub = None
_listener_task: asyncio.Task[Any] | None = None


async def get_redis() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(str(settings.REDIS_URL), decode_responses=True)
    return _redis_client


async def publish_event(room_id: str, event_type: str, data: Any, exclude_user: str | None = None) -> None:
    """
    Publish an event to a Redis channel (room).
    Used by SQLAlchemy hooks or HTTP endpoints.
    """
    try:
        r = await get_redis()
        channel = f"room:{room_id}"
        message = json.dumps(
            {
                "event_type": event_type,
                "data": data,
                "exclude_user": exclude_user,
            }
        )
        await r.publish(channel, message)
        logger.debug("redis_published", channel=channel, event_type=event_type)
    except Exception as e:
        logger.error("redis_publish_error", error=str(e), exc_info=True)


async def _listen_to_redis() -> None:
    """
    Background task that listens to Redis pattern subscriptions
    and forwards messages to the WebSocket ConnectionManager.
    """
    global _redis_client, _pubsub

    backoff = 1

    while True:
        try:
            r = await get_redis()
            _pubsub = r.pubsub()
            await _pubsub.psubscribe("room:*")

            logger.info("redis_pubsub_started", pattern="room:*")
            backoff = 1  # Reset backoff on successful connection

            async for message in _pubsub.listen():
                if message["type"] == "pmessage":
                    channel = message["channel"]
                    # Extract room_id from 'room:{room_id}'
                    room_id = channel.split(":", 1)[1]

                    try:
                        payload = json.loads(message["data"])
                        event_type = payload.get("event_type")
                        data = payload.get("data")
                        exclude_user = payload.get("exclude_user")

                        if event_type:
                            # Forward to connected local WS clients
                            await manager.broadcast(
                                room_id=room_id,
                                event_type=event_type,
                                data=data,
                                exclude_user=exclude_user,
                            )
                    except json.JSONDecodeError:
                        logger.warning("redis_invalid_json", channel=channel, data=message["data"])

        except asyncio.CancelledError:
            logger.info("redis_pubsub_stopped")
            break
        except Exception as e:
            logger.error("redis_pubsub_error", error=str(e), exc_info=True)
            # Exponential backoff before reconnecting, max 30 seconds
            backoff = min(backoff * 2, 30)
            logger.info("redis_pubsub_reconnecting", delay=backoff)
            await asyncio.sleep(backoff)


def start_redis_listener() -> None:
    """Start the Redis listener as a background asyncio Task."""
    global _listener_task
    if _listener_task is None:
        _listener_task = asyncio.create_task(_listen_to_redis())


async def stop_redis_listener() -> None:
    """Clean up Redis pubsub on shutdown."""
    global _listener_task, _pubsub, _redis_client
    if _listener_task:
        _listener_task.cancel()
        try:
            await _listener_task
        except asyncio.CancelledError:
            pass
        _listener_task = None

    if _pubsub:
        await _pubsub.close()
        _pubsub = None

    if _redis_client:
        await _redis_client.close()
        _redis_client = None
