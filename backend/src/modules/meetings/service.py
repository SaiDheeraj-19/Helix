"""
Helix — Meetings Module: Service
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import ForbiddenError, NotFoundError
from src.modules.meetings.models import Meeting, MeetingAttendee, MeetingStatus
from src.modules.meetings.schemas import MeetingCreate
from src.modules.organizations.models import OrgMembership, OrgRole
from src.modules.projects.models import Project
from src.modules.workspaces.models import Workspace


class MeetingService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_meeting(self, project_id: uuid.UUID, data: MeetingCreate, actor_id: uuid.UUID) -> Meeting:
        # 1. Verify project exists and get org_id
        project_result = await self._db.execute(
            select(Project).where(Project.id == project_id).options(selectinload(Project.workspace))
        )
        project = project_result.scalar_one_or_none()
        if not project:
            raise NotFoundError("Project", str(project_id))
            
        org_id = project.workspace.organization_id

        # 2. Check actor's org role
        membership_result = await self._db.execute(
            select(OrgMembership).where(
                OrgMembership.organization_id == org_id,
                OrgMembership.user_id == actor_id
            )
        )
        membership = membership_result.scalar_one_or_none()
        if not membership:
            raise ForbiddenError("You are not a member of this organization")

        actor_role = membership.role

        # 3. Create Meeting
        room_slug = f"helix-{project.identifier.lower()}-{uuid.uuid4().hex[:8]}"
        meeting = Meeting(
            project_id=project_id,
            title=data.title,
            room_slug=room_slug,
        )
        self._db.add(meeting)
        await self._db.flush()

        # 4. Add Attendees
        has_external = any(a.external_email for a in data.attendees)
        if has_external and actor_role not in [OrgRole.ADMIN, OrgRole.OWNER]:
            raise ForbiddenError("Only organization admins can invite external guests to meetings")

        for attendee in data.attendees:
            self._db.add(
                MeetingAttendee(
                    meeting_id=meeting.id,
                    user_id=attendee.user_id,
                    external_email=attendee.external_email,
                    invited_by_id=actor_id,
                )
            )

        # Always add the creator to the meeting
        if not any(a.user_id == actor_id for a in data.attendees):
            self._db.add(
                MeetingAttendee(
                    meeting_id=meeting.id,
                    user_id=actor_id,
                    invited_by_id=actor_id,
                )
            )

        await self._db.flush()
        return await self.get_meeting(meeting.id)

    async def get_meeting(self, meeting_id: uuid.UUID) -> Meeting:
        result = await self._db.execute(
            select(Meeting).where(Meeting.id == meeting_id).options(selectinload(Meeting.attendees))
        )
        meeting = result.scalar_one_or_none()
        if not meeting:
            raise NotFoundError("Meeting", str(meeting_id))
        return meeting

    async def list_meetings(self, project_id: uuid.UUID) -> list[Meeting]:
        result = await self._db.execute(
            select(Meeting)
            .where(Meeting.project_id == project_id)
            .order_by(Meeting.created_at.desc())
            .options(selectinload(Meeting.attendees))
        )
        return list(result.scalars().all())
