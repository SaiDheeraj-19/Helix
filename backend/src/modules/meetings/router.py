"""
Helix — Meetings Module: Router
"""

import uuid
from typing import Any

from fastapi import APIRouter
from src.core.dependencies import CurrentUserID, DBSession

from src.modules.meetings.schemas import MeetingCreate, MeetingResponse
from src.modules.meetings.service import MeetingService

router = APIRouter(tags=["Meetings"])


@router.post("/projects/{project_id}/meetings", response_model=MeetingResponse)
async def create_meeting(
    project_id: uuid.UUID,
    data: MeetingCreate,
    db: DBSession,
    user_id: CurrentUserID,
) -> Any:
    """Create a new Jitsi meeting room and invite participants."""
    service = MeetingService(db)
    return await service.create_meeting(project_id, data, user_id)


@router.get("/projects/{project_id}/meetings", response_model=list[MeetingResponse])
async def list_meetings(
    project_id: uuid.UUID,
    db: DBSession,
    user_id: CurrentUserID,
) -> Any:
    """List meetings for a project."""
    service = MeetingService(db)
    return await service.list_meetings(project_id)
