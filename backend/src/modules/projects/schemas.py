"""Helix — Projects Module: Schemas"""
import uuid

from pydantic import BaseModel, Field, field_validator

# ─── Project ───────────────────────────────────────────────────────────────────


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    identifier: str = Field(min_length=1, max_length=10)
    description: str | None = Field(None, max_length=5000)
    icon: str | None = Field(None, max_length=10)
    color: str = Field("#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    network: str = Field("secret")

    @field_validator("identifier", mode="before")
    @classmethod
    def normalize_identifier(cls, v: str) -> str:
        return v.upper().replace(" ", "").replace("-", "")[:10]


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=5000)
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    network: str | None = None
    status: str | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    slug: str
    identifier: str
    description: str | None = None
    icon: str | None = None
    color: str
    status: str
    network: str
    member_count: int = 0
    issue_count: int = 0

    model_config = {"from_attributes": True}


# ─── Issue State ───────────────────────────────────────────────────────────────


class IssueStateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    group: str = Field(default="unstarted")
    description: str | None = Field(None, max_length=255)
    sequence: int = Field(0, ge=0)


class IssueStateResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    color: str
    group: str
    description: str | None = None
    is_default: bool
    sequence: int

    model_config = {"from_attributes": True}


# ─── Label ─────────────────────────────────────────────────────────────────────


class LabelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    description: str | None = Field(None, max_length=255)
    parent_id: uuid.UUID | None = None


class LabelResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    color: str
    description: str | None = None
    parent_id: uuid.UUID | None = None

    model_config = {"from_attributes": True}


# ─── Member ────────────────────────────────────────────────────────────────────


class ProjectMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    email: str
    avatar_url: str | None = None
    role: str

    model_config = {"from_attributes": True}
