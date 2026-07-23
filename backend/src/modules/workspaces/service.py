"""Helix — Workspaces Module: Service"""

from uuid import UUID

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictError, NotFoundError
from src.modules.organizations.service import OrgService
from src.modules.workspaces.models import Workspace
from src.modules.workspaces.schemas import CreateWorkspaceRequest


class WorkspaceService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, org_slug: str, data: CreateWorkspaceRequest, user_id: UUID) -> Workspace:
        org_service = OrgService(self._db)
        org = await org_service.get_by_slug(org_slug)

        slug = data.slug or slugify(data.name)

        existing = await self._db.execute(
            select(Workspace).where(
                Workspace.organization_id == org.id,
                Workspace.slug == slug,
                Workspace.deleted_at.is_(None),
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError(f"Workspace '{slug}' already exists in this organization")

        ws = Workspace(
            organization_id=org.id,
            name=data.name,
            slug=slug,
            description=data.description,
        )
        self._db.add(ws)
        await self._db.flush()
        return ws

    async def get_by_slug(self, org_slug: str, slug: str) -> Workspace:
        org_service = OrgService(self._db)
        org = await org_service.get_by_slug(org_slug)

        result = await self._db.execute(
            select(Workspace).where(
                Workspace.organization_id == org.id,
                Workspace.slug == slug,
                Workspace.deleted_at.is_(None),
            )
        )
        ws = result.scalar_one_or_none()
        if not ws:
            raise NotFoundError("Workspace", slug)
        return ws
