"""Helix — Notifications Module: Router"""
from uuid import UUID
from fastapi import APIRouter, status
from sqlalchemy import select, update
from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import SuccessResponse, ok
from src.modules.notifications.models import InAppNotification
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    notification_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: bool
    created_at: str


@router.get("", response_model=SuccessResponse[list[NotificationResponse]])
async def list_notifications(
    current_user_id: CurrentUserID,
    db: DBSession,
    unread_only: bool = False,
):
    """Get all notifications for the current user."""
    query = select(InAppNotification).where(
        InAppNotification.user_id == current_user_id
    )
    if unread_only:
        query = query.where(InAppNotification.is_read == False)  # noqa: E712
    query = query.order_by(InAppNotification.created_at.desc()).limit(50)

    result = await db.execute(query)
    notifications = result.scalars().all()

    return ok([
        NotificationResponse(
            id=str(n.id),
            title=n.title,
            message=n.message,
            notification_type=n.notification_type,
            entity_type=n.entity_type,
            entity_id=str(n.entity_id) if n.entity_id else None,
            is_read=n.is_read,
            created_at=n.created_at.isoformat(),
        )
        for n in notifications
    ])


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(notification_id: UUID, current_user_id: CurrentUserID, db: DBSession):
    """Mark a single notification as read."""
    await db.execute(
        update(InAppNotification)
        .where(
            InAppNotification.id == notification_id,
            InAppNotification.user_id == current_user_id,
        )
        .values(is_read=True, read_at=datetime.now(tz=timezone.utc).isoformat())
    )
    await db.flush()


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(current_user_id: CurrentUserID, db: DBSession):
    """Mark all notifications as read."""
    now = datetime.now(tz=timezone.utc).isoformat()
    await db.execute(
        update(InAppNotification)
        .where(
            InAppNotification.user_id == current_user_id,
            InAppNotification.is_read == False,  # noqa: E712
        )
        .values(is_read=True, read_at=now)
    )
    await db.flush()


@router.get("/unread-count", response_model=SuccessResponse[dict])
async def unread_count(current_user_id: CurrentUserID, db: DBSession):
    """Get unread notification count for badge display."""
    from sqlalchemy import func
    result = await db.execute(
        select(func.count()).where(
            InAppNotification.user_id == current_user_id,
            InAppNotification.is_read == False,  # noqa: E712
        )
    )
    count = result.scalar_one()
    return ok({"count": count})
