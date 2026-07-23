from typing import Any

"""Helix — WebSocket Router"""
import structlog
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from src.core.security import TokenType, decode_token
from src.infrastructure.realtime.manager import manager

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["Real-time"])


@router.websocket("/ws/projects/{project_id}")
async def project_websocket(
    websocket: WebSocket,
    project_id: str,
    token: str = Query(...),
) -> Any:
    """
    WebSocket endpoint for real-time project updates.
    Client connects with: ws://localhost:8000/api/v1/ws/projects/{id}?token=<access_token>
    """
    # Validate token
    payload = decode_token(token, TokenType.ACCESS)
    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token payload")
        return

    room_id = f"project:{project_id}"
    await manager.connect(websocket, room_id, user_id)

    try:
        while True:
            data = await websocket.receive_json()
            # Handle client-sent events (e.g. cursor position)
            event_type = data.get("type")
            if event_type == "cursor.moved":
                from src.infrastructure.realtime.redis_pubsub import publish_event
                await publish_event(
                    room_id=room_id,
                    event_type="cursor.moved",
                    data={**data.get("data", {}), "user_id": user_id},
                    exclude_user=user_id,
                )
    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
    except Exception as e:
        logger.error("ws_error", error=str(e))
        manager.disconnect(room_id, user_id)
