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


@router.get("/users/me/meetings", response_model=list[MeetingResponse], summary="List all meetings for the current user")
async def list_user_meetings(
    db: DBSession,
    user_id: CurrentUserID,
) -> Any:
    """List all upcoming meetings across all projects for the current user."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from src.modules.meetings.models import Meeting, MeetingAttendee
    from src.modules.projects.models import Project

    # Find all meetings where the user is an attendee
    result = await db.execute(
        select(Meeting)
        .join(MeetingAttendee)
        .where(MeetingAttendee.user_id == user_id, Meeting.deleted_at.is_(None))
        .options(selectinload(Meeting.attendees))
        .order_by(Meeting.created_at.desc())
    )
    return result.scalars().unique().all()


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
