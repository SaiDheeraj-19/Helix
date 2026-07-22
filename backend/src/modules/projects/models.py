"""
Helix — Projects Module: Models
"""

import uuid
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.base import Base
from src.infrastructure.database.mixins import AuditMixin, HelixBase

if TYPE_CHECKING:
    from src.modules.users.models import User
    from src.modules.workspaces.models import Workspace


class ProjectStatus(StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ProjectNetwork(StrEnum):
    PUBLIC = "public"
    SECRET = "secret"
    PRIVATE = "private"


class ProjectRole(StrEnum):
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class Project(HelixBase, AuditMixin, Base):
    """
    A Project groups issues, cycles, modules, and roadmaps.
    Lives inside a Workspace.
    """

    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("workspace_id", "identifier", name="uq_project_workspace_identifier"),
        UniqueConstraint("workspace_id", "slug", name="uq_project_workspace_slug"),
        Index("ix_projects_workspace", "workspace_id"),
    )

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    identifier: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        comment="Short project key e.g. HLX — used for issue IDs like HLX-42",
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(10), nullable=True)  # emoji
    color: Mapped[str] = mapped_column(String(20), default="#6366f1", nullable=False)

    status: Mapped[str] = mapped_column(
        String(30), default=ProjectStatus.ACTIVE, nullable=False, index=True
    )
    network: Mapped[str] = mapped_column(
        String(20), default=ProjectNetwork.SECRET, nullable=False
    )

    # Issue sequence counter
    issue_sequence: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Settings
    default_assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace")
    members: Mapped[list["ProjectMember"]] = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan"
    )
    states: Mapped[list["IssueState"]] = relationship(
        "IssueState", back_populates="project", cascade="all, delete-orphan"
    )
    labels: Mapped[list["Label"]] = relationship(
        "Label", back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Project identifier={self.identifier} name={self.name}>"


class ProjectMember(HelixBase, Base):
    """Members of a project with their roles."""

    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_member"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(30), default=ProjectRole.MEMBER, nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="members")
    user: Mapped["User"] = relationship("User")


class IssueState(HelixBase, Base):
    """
    Configurable workflow states per project.
    e.g. Backlog → Todo → In Progress → In Review → Done → Cancelled
    """

    __tablename__ = "issue_states"
    __table_args__ = (
        UniqueConstraint("project_id", "name", name="uq_state_project_name"),
        Index("ix_states_project", "project_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#6366f1", nullable=False)
    group: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="unstarted",
        comment="backlog | unstarted | started | completed | cancelled",
    )
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="states")


class Label(HelixBase, Base):
    """Project-scoped colored issue labels."""

    __tablename__ = "labels"
    __table_args__ = (
        UniqueConstraint("project_id", "name", name="uq_label_project_name"),
        Index("ix_labels_project", "project_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#6366f1", nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("labels.id", ondelete="SET NULL"), nullable=True
    )

    project: Mapped["Project"] = relationship("Project", back_populates="labels")
