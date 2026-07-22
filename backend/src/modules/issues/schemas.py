"""Helix — Issues Module: Schemas"""
from typing import Any, Optional
from pydantic import BaseModel, Field


# ─── Nested ────────────────────────────────────────────────────────────────────

class StateSlim(BaseModel):
    id: str
    name: str
    color: str
    group: str
    model_config = {"from_attributes": True}


class UserSlim(BaseModel):
    id: str
    display_name: str
    email: str
    avatar_url: Optional[str] = None
    model_config = {"from_attributes": True}


class LabelSlim(BaseModel):
    id: str
    name: str
    color: str
    model_config = {"from_attributes": True}


# ─── Issue ─────────────────────────────────────────────────────────────────────

class IssueCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = None
    description_html: Optional[str] = None
    priority: str = Field("none")
    state_id: Optional[str] = None   # uses project default if None
    assignee_ids: list[str] = Field(default_factory=list)
    label_ids: list[str] = Field(default_factory=list)
    parent_id: Optional[str] = None
    estimate: Optional[float] = Field(None, ge=0)
    due_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    started_at: Optional[str] = None


class IssueUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    description_html: Optional[str] = None
    priority: Optional[str] = None
    state_id: Optional[str] = None
    assignee_ids: Optional[list[str]] = None
    label_ids: Optional[list[str]] = None
    parent_id: Optional[str] = None
    estimate: Optional[float] = None
    due_date: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    sort_order: Optional[float] = None


class IssueResponse(BaseModel):
    id: str
    workspace_id: str
    project_id: str
    sequence_id: int
    title: str
    description: Optional[str] = None
    description_html: Optional[str] = None
    priority: str
    state: StateSlim
    assignees: list[UserSlim] = Field(default_factory=list)
    labels: list[LabelSlim] = Field(default_factory=list)
    parent_id: Optional[str] = None
    estimate: Optional[float] = None
    due_date: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    sort_order: float
    sub_issues_count: int = 0
    attachment_count: int = 0
    comment_count: int = 0
    created_by: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class IssueFilters(BaseModel):
    state_ids: list[str] = Field(default_factory=list)
    priority: list[str] = Field(default_factory=list)
    assignee_ids: list[str] = Field(default_factory=list)
    label_ids: list[str] = Field(default_factory=list)
    search: Optional[str] = None
    parent_id: Optional[str] = None   # filter by subtasks
    order_by: str = Field("-created_at")   # prefix - for DESC


class IssueMoveRequest(BaseModel):
    """Reorder/move an issue in the board."""
    state_id: str
    sort_order: float


# ─── Comment ───────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str = Field(min_length=1)
    content_html: str


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1)
    content_html: str


class CommentResponse(BaseModel):
    id: str
    issue_id: str
    content: str
    content_html: str
    actor: UserSlim
    edited_at: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


# ─── Activity ──────────────────────────────────────────────────────────────────

class ActivityResponse(BaseModel):
    id: str
    issue_id: str
    field: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    activity_type: str
    comment: Optional[str] = None
    actor: Optional[UserSlim] = None
    created_at: str

    model_config = {"from_attributes": True}


# ─── Attachment ────────────────────────────────────────────────────────────────

class AttachmentUploadRequest(BaseModel):
    file_name: str = Field(min_length=1, max_length=500)
    file_size: int = Field(gt=0, le=100 * 1024 * 1024)  # max 100MB
    content_type: str


class AttachmentUploadResponse(BaseModel):
    attachment_id: str
    upload_url: str
    storage_key: str


class AttachmentResponse(BaseModel):
    id: str
    issue_id: str
    file_name: str
    file_size: int
    content_type: str
    download_url: str
    uploaded_by: Optional[UserSlim] = None
    created_at: str

    model_config = {"from_attributes": True}
