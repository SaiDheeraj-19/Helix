"""Helix — Cycles Module: Schemas"""
from __future__ import annotations
from typing import Optional
from datetime import date
from pydantic import BaseModel, Field


class CycleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class CycleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class CycleResponse(BaseModel):
    id: str
    project_id: str
    workspace_id: str
    name: str
    description: Optional[str] = None
    status: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    issue_count: int = 0
    completed_issue_count: int = 0
    in_progress_count: int = 0
    progress_percentage: float = 0.0
    created_at: str
    created_by: Optional[str] = None


class CycleIssueAdd(BaseModel):
    issue_ids: list[str] = Field(min_length=1)
