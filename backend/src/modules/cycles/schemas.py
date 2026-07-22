"""Helix — Cycles Module: Schemas"""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class CycleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(None, max_length=5000)
    start_date: date | None = None
    end_date: date | None = None


class CycleUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class CycleResponse(BaseModel):
    id: str
    project_id: str
    workspace_id: str
    name: str
    description: str | None = None
    status: str
    start_date: str | None = None
    end_date: str | None = None
    issue_count: int = 0
    completed_issue_count: int = 0
    in_progress_count: int = 0
    progress_percentage: float = 0.0
    created_at: str
    created_by: str | None = None


class CycleIssueAdd(BaseModel):
    issue_ids: list[str] = Field(min_length=1)
