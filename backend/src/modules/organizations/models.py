"""
Helix — Organizations Module: Models
"""

import uuid
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database.base import Base
from src.infrastructure.database.mixins import HelixBase

if TYPE_CHECKING:
    from src.modules.users.models import User
    from src.modules.workspaces.models import Workspace


class OrgRole(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    GUEST = "guest"


class OrgPlan(StrEnum):
    FREE = "free"
    PRO = "pro"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


class Organization(HelixBase, Base):
    """
    Top-level tenant container. All data belongs to an organization.
    """

    __tablename__ = "organizations"
    __table_args__ = (Index("ix_orgs_slug_active", "slug", postgresql_where="deleted_at IS NULL"),)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    website: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    # Billing
    plan: Mapped[str] = mapped_column(String(30), default=OrgPlan.FREE, nullable=False, index=True)
    max_members: Mapped[int] = mapped_column(default=5, nullable=False)
    max_workspaces: Mapped[int] = mapped_column(default=3, nullable=False)
    max_projects: Mapped[int] = mapped_column(default=10, nullable=False)
    max_storage_gb: Mapped[int] = mapped_column(default=5, nullable=False)

    # Settings
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allow_member_invite: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    memberships: Mapped[list["OrgMembership"]] = relationship("OrgMembership", back_populates="organization", cascade="all, delete-orphan")
    workspaces: Mapped[list["Workspace"]] = relationship("Workspace", back_populates="organization")

    def __repr__(self) -> str:
        return f"<Organization slug={self.slug}>"


class OrgMembership(HelixBase, Base):
    """
    Links users to organizations with roles.
    """

    __tablename__ = "org_memberships"
    __table_args__ = (UniqueConstraint("organization_id", "user_id", name="uq_org_membership"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(30), default=OrgRole.MEMBER, nullable=False)
    invited_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    joined_at: Mapped[uuid.UUID | None] = mapped_column(nullable=True)  # TODO: DateTime

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="memberships")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="org_memberships")
