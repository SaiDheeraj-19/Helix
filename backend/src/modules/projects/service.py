"""
Helix — Projects Module: Service
"""

import uuid
from datetime import UTC

from slugify import slugify
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import ConflictError, NotFoundError
from src.modules.projects.models import (
    IssueState,
    Label,
    Project,
    ProjectMember,
    ProjectRole,
)
from src.modules.projects.schemas import IssueStateCreate, LabelCreate, ProjectCreate, ProjectUpdate
from src.modules.workspaces.service import WorkspaceService

# Default workflow states for every new project
DEFAULT_STATES = [
    {"name": "Backlog", "color": "#9ca3af", "group": "backlog", "sequence": 0, "is_default": True},
    {"name": "Todo", "color": "#60a5fa", "group": "unstarted", "sequence": 1},
    {"name": "In Progress", "color": "#f59e0b", "group": "started", "sequence": 2},
    {"name": "In Review", "color": "#a78bfa", "group": "started", "sequence": 3},
    {"name": "Done", "color": "#34d399", "group": "completed", "sequence": 4},
    {"name": "Cancelled", "color": "#f87171", "group": "cancelled", "sequence": 5},
]


class ProjectService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ─── Projects ──────────────────────────────────────────────────────────────

    async def create(
        self,
        workspace_slug: str,
        data: ProjectCreate,
        created_by: uuid.UUID,
    ) -> Project:
        ws_service = WorkspaceService(self._db)
        # We need the actual workspace — get by slug via a lookup
        from src.modules.workspaces.models import Workspace

        ws_result = await self._db.execute(select(Workspace).where(Workspace.slug == workspace_slug, Workspace.deleted_at.is_(None)))
        ws = ws_result.scalar_one_or_none()
        if not ws:
            raise NotFoundError("Workspace", workspace_slug)

        slug = slugify(data.name)

        # Check identifier uniqueness
        existing = await self._db.execute(
            select(Project).where(
                Project.workspace_id == ws.id,
                Project.identifier == data.identifier,
                Project.deleted_at.is_(None),
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError(f"Identifier '{data.identifier}' already in use in this workspace")

        project = Project(
            workspace_id=ws.id,
            name=data.name,
            slug=slug,
            identifier=data.identifier,
            description=data.description,
            icon=data.icon,
            color=data.color,
            network=data.network,
            created_by=created_by,
            updated_by=created_by,
        )
        self._db.add(project)
        await self._db.flush()

        # Add creator as admin
        self._db.add(
            ProjectMember(
                project_id=project.id,
                user_id=created_by,
                role=ProjectRole.ADMIN,
            )
        )

        # Create default states
        for s in DEFAULT_STATES:
            self._db.add(
                IssueState(
                    project_id=project.id,
                    workspace_id=ws.id,
                    name=s["name"],
                    color=s["color"],
                    group=s["group"],
                    sequence=s["sequence"],
                    is_default=s.get("is_default", False),
                )
            )

        await self._db.flush()
        return project

    async def get_by_id(self, project_id: uuid.UUID) -> Project:
        result = await self._db.execute(select(Project).where(Project.id == project_id, Project.deleted_at.is_(None)))
        project = result.scalar_one_or_none()
        if not project:
            raise NotFoundError("Project", str(project_id))
        return project

    async def get_by_identifier(self, workspace_id: uuid.UUID, identifier: str) -> Project:
        result = await self._db.execute(
            select(Project).where(
                Project.workspace_id == workspace_id,
                Project.identifier == identifier.upper(),
                Project.deleted_at.is_(None),
            )
        )
        project = result.scalar_one_or_none()
        if not project:
            raise NotFoundError("Project", identifier)
        return project

    async def list_for_workspace(self, workspace_id: uuid.UUID) -> list[Project]:
        result = await self._db.execute(
            select(Project).where(Project.workspace_id == workspace_id, Project.deleted_at.is_(None)).order_by(Project.created_at.desc())
        )
        return list(result.scalars().all())

    async def update(self, project_id: uuid.UUID, data: ProjectUpdate, updated_by: uuid.UUID) -> Project:
        updates = data.model_dump(exclude_none=True)
        updates["updated_by"] = updated_by
        if updates:
            await self._db.execute(update(Project).where(Project.id == project_id).values(**updates))
        return await self.get_by_id(project_id)

    async def delete(self, project_id: uuid.UUID, deleted_by: uuid.UUID) -> None:
        from datetime import datetime

        await self._db.execute(update(Project).where(Project.id == project_id).values(deleted_at=datetime.now(UTC), updated_by=deleted_by))

    # ─── States ────────────────────────────────────────────────────────────────

    async def create_state(self, project_id: uuid.UUID, data: IssueStateCreate) -> IssueState:
        project = await self.get_by_id(project_id)
        state = IssueState(
            project_id=project_id,
            workspace_id=project.workspace_id,
            **data.model_dump(),
        )
        self._db.add(state)
        await self._db.flush()
        return state

    async def get_states(self, project_id: uuid.UUID) -> list[IssueState]:
        result = await self._db.execute(select(IssueState).where(IssueState.project_id == project_id).order_by(IssueState.sequence))
        return list(result.scalars().all())

    async def get_default_state(self, project_id: uuid.UUID) -> IssueState:
        result = await self._db.execute(select(IssueState).where(IssueState.project_id == project_id, IssueState.is_default.is_(True)).limit(1))
        state = result.scalar_one_or_none()
        if not state:
            # fallback: first state by sequence
            result = await self._db.execute(select(IssueState).where(IssueState.project_id == project_id).order_by(IssueState.sequence).limit(1))
            state = result.scalar_one_or_none()
        if not state:
            raise NotFoundError("IssueState (default)", str(project_id))
        return state

    # ─── Labels ────────────────────────────────────────────────────────────────

    async def create_label(self, project_id: uuid.UUID, data: LabelCreate) -> Label:
        project = await self.get_by_id(project_id)
        label = Label(
            project_id=project_id,
            workspace_id=project.workspace_id,
            **data.model_dump(),
        )
        self._db.add(label)
        await self._db.flush()
        return label

    async def get_labels(self, project_id: uuid.UUID) -> list[Label]:
        result = await self._db.execute(select(Label).where(Label.project_id == project_id).order_by(Label.name))
        return list(result.scalars().all())

    # ─── Members ───────────────────────────────────────────────────────────────

    async def add_member(self, project_id: uuid.UUID, user_id: uuid.UUID, role: str = ProjectRole.MEMBER) -> ProjectMember:
        member = ProjectMember(project_id=project_id, user_id=user_id, role=role)
        self._db.add(member)
        await self._db.flush()
        return member

    async def is_member(self, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self._db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_members(self, project_id: uuid.UUID) -> list[ProjectMember]:
        result = await self._db.execute(select(ProjectMember).where(ProjectMember.project_id == project_id).options(selectinload(ProjectMember.user)))
        return list(result.scalars().all())

    # ─── Next sequence ID ──────────────────────────────────────────────────────

    async def next_sequence_id(self, project_id: uuid.UUID) -> int:
        """Atomically increment and return the next issue sequence ID."""
        result = await self._db.execute(
            update(Project).where(Project.id == project_id).values(issue_sequence=Project.issue_sequence + 1).returning(Project.issue_sequence)
        )
        return result.scalar_one()
