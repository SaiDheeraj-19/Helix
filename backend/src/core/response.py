"""
Helix Backend — Standard API Response Models
Ensures consistent response envelope across all endpoints.
"""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field
from datetime import datetime, UTC
from uuid import uuid4

T = TypeVar("T")
M = TypeVar("M")


class PaginationMeta(BaseModel):
    """Pagination metadata included in list responses."""

    page: int
    per_page: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool

    @classmethod
    def from_params(cls, page: int, per_page: int, total: int) -> "PaginationMeta":
        total_pages = max(1, -(-total // per_page))  # ceiling division
        return cls(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )


class SuccessResponse(BaseModel, Generic[T]):
    """Standard success response envelope."""

    success: bool = True
    data: T
    meta: dict[str, Any] | None = None
    request_id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat()
    )


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response."""

    success: bool = True
    data: list[T]
    meta: PaginationMeta
    request_id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat()
    )


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    """Standard error response envelope."""

    success: bool = False
    data: None = None
    errors: ErrorDetail
    request_id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat()
    )


def ok(data: T, meta: dict[str, Any] | None = None) -> SuccessResponse[T]:
    """Create a success response."""
    return SuccessResponse(data=data, meta=meta)


def paginated(
    data: list[T],
    page: int,
    per_page: int,
    total: int,
) -> PaginatedResponse[T]:
    """Create a paginated response."""
    return PaginatedResponse(
        data=data,
        meta=PaginationMeta.from_params(page, per_page, total),
    )
