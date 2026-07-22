"""Helix — Users Module: Schemas"""

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    display_name: str
    avatar_url: str | None = None
    bio: str | None = None
    timezone: str
    locale: str
    is_email_verified: bool
    is_onboarded: bool
    status: str

    model_config = {"from_attributes": True}


class UpdateUserRequest(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=100)
    bio: str | None = Field(None, max_length=500)
    timezone: str | None = Field(None, max_length=64)
    locale: str | None = Field(None, max_length=10)
    avatar_url: str | None = None
