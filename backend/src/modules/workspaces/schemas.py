"""Helix — Workspaces Module: Schemas, Service, Router"""
# schemas.py
from typing import Optional
from pydantic import BaseModel, Field


class WorkspaceResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_default: bool
    model_config = {"from_attributes": True}


class CreateWorkspaceRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    slug: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
