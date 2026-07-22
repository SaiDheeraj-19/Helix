"""Helix — Projects Module: Schemas"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from slugify import slugify as _slugify


# ─── Project ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    identifier: str = Field(min_length=1, max_length=10)
    description: Optional[str] = Field(None, max_length=5000)
    icon: Optional[str] = Field(None, max_length=10)
    color: str = Field("#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    network: str = Field("secret")

    @field_validator("identifier", mode="before")
    @classmethod
    def normalize_identifier(cls, v: str) -> str:
        return v.upper().replace(" ", "").replace("-", "")[:10]


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    icon: Optional[str] = Field(None, max_length=10)
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    network: Optional[str] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    slug: str
    identifier: str
    description: Optional[str] = None
    icon: Optional[str] = None
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
    description: Optional[str] = Field(None, max_length=255)
    sequence: int = Field(0, ge=0)


class IssueStateResponse(BaseModel):
    id: str
    project_id: str
    name: str
    color: str
    group: str
    description: Optional[str] = None
    is_default: bool
    sequence: int

    model_config = {"from_attributes": True}


# ─── Label ─────────────────────────────────────────────────────────────────────

class LabelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    description: Optional[str] = Field(None, max_length=255)
    parent_id: Optional[str] = None


class LabelResponse(BaseModel):
    id: str
    project_id: str
    name: str
    color: str
    description: Optional[str] = None
    parent_id: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Member ────────────────────────────────────────────────────────────────────

class ProjectMemberResponse(BaseModel):
    id: str
    user_id: str
    display_name: str
    email: str
    avatar_url: Optional[str] = None
    role: str

    model_config = {"from_attributes": True}
