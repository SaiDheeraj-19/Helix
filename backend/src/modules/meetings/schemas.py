"""
Helix — Meetings Module: Schemas
"""

import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.modules.meetings.models import MeetingStatus


class MeetingAttendeeBase(BaseModel):
    user_id: uuid.UUID | None = None
    external_email: EmailStr | None = None


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    attendees: list[MeetingAttendeeBase] = Field(default_factory=list)


class MeetingAttendeeResponse(MeetingAttendeeBase):
    id: uuid.UUID
    meeting_id: uuid.UUID
    invited_by_id: uuid.UUID | None = None

    model_config = ConfigDict(from_attributes=True)


class MeetingResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    room_slug: str
    status: MeetingStatus
    started_at: str | None = None
    ended_at: str | None = None

    attendees: list[MeetingAttendeeResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
