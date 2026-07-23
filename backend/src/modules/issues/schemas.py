"""Helix — Issues Module: Schemas"""
import uuid

from pydantic import BaseModel, Field

# ─── Nested ────────────────────────────────────────────────────────────────────


class StateSlim(BaseModel):
    id: uuid.UUID
    name: str
    color: str
    group: str
    model_config = {"from_attributes": True}


class UserSlim(BaseModel):
    id: uuid.UUID
    display_name: str
    email: str
    avatar_url: str | None = None
    model_config = {"from_attributes": True}


class LabelSlim(BaseModel):
    id: uuid.UUID
    name: str
    color: str
    model_config = {"from_attributes": True}


# ─── Issue ─────────────────────────────────────────────────────────────────────


class IssueCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    description_html: str | None = None
    priority: str = Field("none")
    state_id: uuid.UUID | None = None  # uses project default if None
    assignee_ids: list[str] = Field(default_factory=list)
    label_ids: list[str] = Field(default_factory=list)
    parent_id: uuid.UUID | None = None
    estimate: float | None = Field(None, ge=0)
    due_date: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    started_at: str | None = None


class IssueUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    description_html: str | None = None
    priority: str | None = None
    state_id: uuid.UUID | None = None
    assignee_ids: list[str] | None = None
    label_ids: list[str] | None = None
    parent_id: uuid.UUID | None = None
    estimate: float | None = None
    due_date: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    sort_order: float | None = None


class IssueResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    project_id: uuid.UUID
    sequence_id: int
    title: str
    description: str | None = None
    description_html: str | None = None
    priority: str
    state: StateSlim
    assignees: list[UserSlim] = Field(default_factory=list)
    labels: list[LabelSlim] = Field(default_factory=list)
    parent_id: uuid.UUID | None = None
    estimate: float | None = None
    due_date: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    sort_order: float
    sub_issues_count: int = 0
    attachment_count: int = 0
    comment_count: int = 0
    created_by: str | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class IssueFilters(BaseModel):
    state_ids: list[str] = Field(default_factory=list)
    priority: list[str] = Field(default_factory=list)
    assignee_ids: list[str] = Field(default_factory=list)
    label_ids: list[str] = Field(default_factory=list)
    search: str | None = None
    parent_id: uuid.UUID | None = None  # filter by subtasks
    order_by: str = Field("-created_at")  # prefix - for DESC


class IssueMoveRequest(BaseModel):
    """Reorder/move an issue in the board."""

    state_id: uuid.UUID
    sort_order: float


# ─── Comment ───────────────────────────────────────────────────────────────────


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)
    content_html: str


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1)
    content_html: str


class CommentResponse(BaseModel):
    id: uuid.UUID
    issue_id: uuid.UUID
    content: str
    content_html: str
    actor: UserSlim
    edited_at: str | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


# ─── Activity ──────────────────────────────────────────────────────────────────


class ActivityResponse(BaseModel):
    id: uuid.UUID
    issue_id: uuid.UUID
    field: str
    old_value: str | None = None
    new_value: str | None = None
    activity_type: str
    comment: str | None = None
    actor: UserSlim | None = None
    created_at: str

    model_config = {"from_attributes": True}


# ─── Attachment ────────────────────────────────────────────────────────────────


class AttachmentUploadRequest(BaseModel):
    file_name: str = Field(min_length=1, max_length=500)
    file_size: int = Field(gt=0, le=100 * 1024 * 1024)  # max 100MB
    content_type: str


class AttachmentUploadResponse(BaseModel):
    attachment_id: uuid.UUID
    upload_url: str
    storage_key: str


class AttachmentResponse(BaseModel):
    id: uuid.UUID
    issue_id: uuid.UUID
    file_name: str
    file_size: int
    content_type: str
    download_url: str
    uploaded_by: UserSlim | None = None
    created_at: str

    model_config = {"from_attributes": True}
