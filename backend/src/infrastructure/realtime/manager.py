"""
Helix — Real-time WebSocket Connection Manager
Manages connected clients and broadcasts events to project/workspace rooms.
"""

import json
from typing import Any

import structlog
from fastapi import WebSocket

logger = structlog.get_logger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections organized by project room.
    Each project has a set of connected WebSocket clients.
    """

    def __init__(self) -> None:
        # project_id → {user_id: WebSocket}
        self._rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        room_id: str,
        user_id: str,
    ) -> None:
        await websocket.accept()
        if room_id not in self._rooms:
            self._rooms[room_id] = {}
        self._rooms[room_id][user_id] = websocket
        logger.info("ws_connected", room_id=room_id, user_id=user_id)

    def disconnect(self, room_id: str, user_id: str) -> None:
        if room_id in self._rooms:
            self._rooms[room_id].pop(user_id, None)
            if not self._rooms[room_id]:
                del self._rooms[room_id]
        logger.info("ws_disconnected", room_id=room_id, user_id=user_id)

    async def broadcast(
        self,
        room_id: str,
        event_type: str,
        data: Any,
        exclude_user: str | None = None,
    ) -> None:
        """Broadcast an event to all clients in a room."""
        message = json.dumps(
            {
                "type": event_type,
                "data": data,
            }
        )
        disconnected: list[str] = []
        for uid, ws in list(self._rooms.get(room_id, {}).items()):
            if uid == exclude_user:
                continue
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(uid)

        # Clean up stale connections
        for uid in disconnected:
            self.disconnect(room_id, uid)

    async def send_to_user(self, user_id: str, event_type: str, data: Any) -> None:
        """Send a private message to a specific user across all rooms."""
        message = json.dumps({"type": event_type, "data": data})
        for room in self._rooms.values():
            if user_id in room:
                try:
                    await room[user_id].send_text(message)
                except Exception:
                    pass

    @property
    def total_connections(self) -> int:
        return sum(len(v) for v in self._rooms.values())


# ─── Global singleton ─────────────────────────────────────────────────────────
manager = ConnectionManager()


# ─── Event type constants ─────────────────────────────────────────────────────


class WSEvent:
    ISSUE_CREATED = "issue.created"
    ISSUE_UPDATED = "issue.updated"
    ISSUE_DELETED = "issue.deleted"
    ISSUE_MOVED = "issue.moved"
    COMMENT_ADDED = "comment.added"
    COMMENT_UPDATED = "comment.updated"
    COMMENT_DELETED = "comment.deleted"
    MEMBER_JOINED = "member.joined"
    MEMBER_LEFT = "member.left"
    CURSOR_MOVED = "cursor.moved"
