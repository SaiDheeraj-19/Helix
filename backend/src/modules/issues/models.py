"""
Helix — Issues Module: Models
The core domain model of the platform.
"""

import uuid
from enum import StrEnum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Index, Integer,
    String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.base import Base
from src.infrastructure.database.mixins import AuditMixin, HelixBase

if TYPE_CHECKING:
    from src.modules.projects.models import Project, IssueState, Label
    from src.modules.users.models import User


class IssuePriority(StrEnum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class Issue(HelixBase, AuditMixin, Base):
    """
    Core Issue model — the fundamental work item in Helix.

    Key design decisions:
    - sequence_id is per-project (HLX-42), generated atomically via DB trigger
    - description_html stores rendered HTML for fast rendering
    - sort_order is a float for gap-based ordering (avoids reindex)
    - Subtasks implemented via self-referential parent_id FK
    """

    __tablename__ = "issues"
    __table_args__ = (
        UniqueConstraint("project_id", "sequence_id", name="uq_issue_project_sequence"),
        Index("ix_issues_workspace", "workspace_id"),
        Index("ix_issues_project", "project_id"),
        Index("ix_issues_state", "state_id"),
        Index("ix_issues_priority", "priority"),
        Index(
            "ix_issues_active",
            "project_id",
            "deleted_at",
            postgresql_where="deleted_at IS NULL",
        ),
    )

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    sequence_id: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="Per-project auto-increment (HLX-1, HLX-2...)"
    )

    # Core fields
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Classification
    priority: Mapped[str] = mapped_column(
        String(20), default=IssuePriority.NONE, nullable=False, index=True
    )
    state_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("issue_states.id", ondelete="RESTRICT"), nullable=False
    )

    # Estimation
    estimate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Dates
    due_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)   # ISO date only
    started_at: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    completed_at: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    # Hierarchy (subtasks)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # Ordering (float gap ordering — no reindex needed on reorder)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    state: Mapped["IssueState"] = relationship("IssueState", lazy="joined")
    project: Mapped["Project"] = relationship("Project")
    parent: Mapped[Optional["Issue"]] = relationship("Issue", remote_side="Issue.id", back_populates="sub_issues")
    sub_issues: Mapped[list["Issue"]] = relationship("Issue", back_populates="parent")

    assignees: Mapped[list["IssueAssignee"]] = relationship(
        "IssueAssignee", back_populates="issue", cascade="all, delete-orphan", lazy="selectin"
    )
    label_links: Mapped[list["IssueLabelLink"]] = relationship(
        "IssueLabelLink", back_populates="issue", cascade="all, delete-orphan", lazy="selectin"
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="issue", cascade="all, delete-orphan"
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment", back_populates="issue", cascade="all, delete-orphan"
    )
    activities: Mapped[list["Activity"]] = relationship(
        "Activity", back_populates="issue", cascade="all, delete-orphan"
    )

    @property
    def identifier(self) -> str:
        """e.g. HLX-42"""
        # Loaded via join when needed
        return f"ISSUE-{self.sequence_id}"

    def __repr__(self) -> str:
        return f"<Issue sequence_id={self.sequence_id} title={self.title[:40]}>"


class IssueAssignee(Base):
    """M2M: Issues ↔ Users (assignees)."""

    __tablename__ = "issue_assignees"
    __table_args__ = (
        UniqueConstraint("issue_id", "user_id", name="uq_issue_assignee"),
        Index("ix_issue_assignees_issue", "issue_id"),
        Index("ix_issue_assignees_user", "user_id"),
    )

    issue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )

    issue: Mapped["Issue"] = relationship("Issue", back_populates="assignees")
    user: Mapped["User"] = relationship("User")


class IssueLabelLink(Base):
    """M2M: Issues ↔ Labels."""

    __tablename__ = "issue_label_links"
    __table_args__ = (
        UniqueConstraint("issue_id", "label_id", name="uq_issue_label"),
    )

    issue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), primary_key=True
    )
    label_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True
    )

    issue: Mapped["Issue"] = relationship("Issue", back_populates="label_links")
    label: Mapped["Label"] = relationship("Label")


class Comment(HelixBase, AuditMixin, Base):
    """Rich text comments on issues."""

    __tablename__ = "comments"
    __table_args__ = (
        Index("ix_comments_issue", "issue_id"),
    )

    issue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_html: Mapped[str] = mapped_column(Text, nullable=False)
    edited_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    issue: Mapped["Issue"] = relationship("Issue", back_populates="comments")


class Activity(HelixBase, Base):
    """
    Immutable audit trail for issue changes.
    Each field change creates one activity entry.
    """

    __tablename__ = "activities"
    __table_args__ = (
        Index("ix_activities_issue", "issue_id"),
        Index("ix_activities_actor", "actor_id"),
    )

    issue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    field: Mapped[str] = mapped_column(String(50), nullable=False, comment="Which field changed")
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    activity_type: Mapped[str] = mapped_column(
        String(30), default="updated", nullable=False, comment="created | updated | commented | deleted"
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    issue: Mapped["Issue"] = relationship("Issue", back_populates="activities")
    actor: Mapped[Optional["User"]] = relationship("User")


class Attachment(HelixBase, Base):
    """File attachments on issues, stored in MinIO."""

    __tablename__ = "attachments"
    __table_args__ = (
        Index("ix_attachments_issue", "issue_id"),
    )

    issue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1000), nullable=False)
    bucket: Mapped[str] = mapped_column(String(100), nullable=False)

    issue: Mapped["Issue"] = relationship("Issue", back_populates="attachments")
