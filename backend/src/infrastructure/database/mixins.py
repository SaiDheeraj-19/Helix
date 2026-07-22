"""
Helix Backend — SQLAlchemy Model Mixins
Provides reusable audit columns, soft delete, and UUID primary keys.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPrimaryKeyMixin:
    """
    UUID v4 primary key mixin.
    Uses PostgreSQL's gen_random_uuid() at DB level for performance.
    """

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
        index=True,
    )


class TimestampMixin:
    """
    Automatic created_at and updated_at timestamps.
    updated_at is managed by SQLAlchemy onupdate — no triggers needed.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    """
    Soft delete support.
    deleted_at is NULL for active records, set to deletion timestamp otherwise.
    Always filter with .where(Model.deleted_at.is_(None)) for active records.
    """

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        index=True,
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now(UTC)

    def restore(self) -> None:
        self.deleted_at = None


class AuditMixin:
    """
    Tracks who created and last updated a record.
    created_by and updated_by reference users(id).
    """

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class HelixBase(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Standard base mixin for all Helix domain models.
    Combines UUID PK + timestamps + soft delete.
    AuditMixin is applied selectively where created_by tracking is needed.
    """

    __abstract__ = True
