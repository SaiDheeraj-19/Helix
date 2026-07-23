from typing import Any

"""Helix — Organizations Module: Schemas"""

from pydantic import BaseModel, Field, field_validator
from slugify import slugify


class OrgResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    logo_url: str | None = None
    plan: str
    model_config = {"from_attributes": True}


class CreateOrgRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    slug: str | None = Field(None, min_length=2, max_length=50)
    description: str | None = Field(None, max_length=500)

    @field_validator("slug", mode="before")
    @classmethod
    def auto_slug(cls, v: Any, info: Any) -> Any:
        if not v and info.data.get("name"):
            return slugify(info.data["name"])
        return v


class OrgMemberResponse(BaseModel):
    id: str
    user_id: str
    display_name: str
    email: str
    avatar_url: str | None = None
    role: str
    joined_at: str


class AddMemberRequest(BaseModel):
    email: str
    role: str = "member"


class UpdateMemberRoleRequest(BaseModel):
    role: str
