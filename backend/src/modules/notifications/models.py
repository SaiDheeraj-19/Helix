"""Helix — Notifications Module: Models"""

from enum import Enum as PyEnum
from typing import TYPE_CHECKING
from uuid import UUID as UUIDType

if TYPE_CHECKING:
    from src.modules.users.models import User

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.base import Base
from src.infrastructure.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class NotificationType(str, PyEnum):
    ISSUE_ASSIGNED = "issue_assigned"
    ISSUE_MENTIONED = "issue_mentioned"
    ISSUE_UPDATED = "issue_updated"
    COMMENT_ADDED = "comment_added"
    CYCLE_STARTED = "cycle_started"
    INVITATION = "invitation"


class InAppNotification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    In-app notification record per user.
    Read/unread status tracked per notification.
    """

    __tablename__ = "notifications"

    user_id: Mapped[UUIDType] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id: Mapped[UUIDType | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # Optional deep-link context
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "issue", "comment", etc.
    entity_id: Mapped[UUIDType | None] = mapped_column(nullable=True)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[str | None] = mapped_column(nullable=True)

    # Relations
    user: Mapped["User"] = relationship(foreign_keys=[user_id])
    actor: Mapped["User | None"] = relationship(foreign_keys=[actor_id])
