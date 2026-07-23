"""
Helix — Meetings Module: Models
"""

import uuid
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.base import Base
from src.infrastructure.database.mixins import HelixBase

if TYPE_CHECKING:
    from src.modules.projects.models import Project
    from src.modules.users.models import User


class MeetingStatus(StrEnum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    ENDED = "ended"
    CANCELLED = "cancelled"


class Meeting(HelixBase, Base):
    """
    A video meeting attached to a Project.
    Leverages Jitsi Meet for the underlying video engine.
    """

    __tablename__ = "meetings"
    __table_args__ = (
        UniqueConstraint("room_slug", name="uq_meeting_room_slug"),
        Index("ix_meetings_project", "project_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    room_slug: Mapped[str] = mapped_column(String(100), nullable=False)  # Unique Jitsi room name
    status: Mapped[str] = mapped_column(String(30), default=MeetingStatus.SCHEDULED, nullable=False)

    # Timeline
    started_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ended_at: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    attendees: Mapped[list["MeetingAttendee"]] = relationship("MeetingAttendee", back_populates="meeting", cascade="all, delete-orphan")


class MeetingAttendee(Base):
    """
    Participant of a meeting.
    Can be an internal user or an external guest (via email).
    """

    __tablename__ = "meeting_attendees"
    __table_args__ = (
        Index("ix_attendees_meeting", "meeting_id"),
        Index("ix_attendees_user", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)

    # Internal user
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    # External guest
    external_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="attendees")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    invited_by: Mapped["User"] = relationship("User", foreign_keys=[invited_by_id])
