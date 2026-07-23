"""Helix — Workspaces Module: Schemas, Service, Router"""
import uuid

# schemas.py
from pydantic import BaseModel, Field


class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    logo_url: str | None = None
    is_default: bool
    model_config = {"from_attributes": True}


class CreateWorkspaceRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    slug: str | None = Field(None, min_length=2, max_length=50)
    description: str | None = Field(None, max_length=500)
