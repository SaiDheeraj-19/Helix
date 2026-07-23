"""Helix — Cycles Module: Models"""

from __future__ import annotations

import datetime
from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import UUID as UUIDType

if TYPE_CHECKING:
    from src.modules.issues.models import Issue
    from src.modules.projects.models import Project
    from src.modules.users.models import User

from sqlalchemy import Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.base import Base
from src.infrastructure.database.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class CycleStatus(StrEnum):
    DRAFT = "draft"
    STARTED = "started"
    COMPLETED = "completed"


class Cycle(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    A time-boxed sprint / iteration.
    Belongs to a project. Issues can be added/removed from a cycle.
    Progress is computed dynamically from linked issue states.
    """

    __tablename__ = "cycles"

    workspace_id: Mapped[UUIDType] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id: Mapped[UUIDType] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by: Mapped[UUIDType] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=CycleStatus.DRAFT, nullable=False)

    start_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    # Relations
    project: Mapped[Project] = relationship(back_populates="cycles", lazy="noload")
    issues: Mapped[list[CycleIssue]] = relationship(back_populates="cycle", cascade="all, delete-orphan", lazy="selectin")
    creator: Mapped[User] = relationship(foreign_keys=[created_by], lazy="noload")


class CycleIssue(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Many-to-many bridge between Cycle and Issue."""

    __tablename__ = "cycle_issues"
    __table_args__ = (UniqueConstraint("cycle_id", "issue_id", name="uq_cycle_issue"),)

    cycle_id: Mapped[UUIDType] = mapped_column(ForeignKey("cycles.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id: Mapped[UUIDType] = mapped_column(ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relations
    cycle: Mapped[Cycle] = relationship(back_populates="issues", lazy="noload")
    issue: Mapped[Issue] = relationship(lazy="selectin")
