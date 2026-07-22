"""Helix — Cycles Module: Service"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import NotFoundError
from src.modules.cycles.models import Cycle, CycleIssue, CycleStatus
from src.modules.cycles.schemas import CycleCreate, CycleUpdate
from src.modules.issues.models import Issue


class CycleService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, project_id: UUID, workspace_id: UUID, data: CycleCreate, created_by: UUID) -> Cycle:
        cycle = Cycle(
            project_id=project_id,
            workspace_id=workspace_id,
            name=data.name,
            description=data.description,
            start_date=data.start_date,
            end_date=data.end_date,
            status=CycleStatus.DRAFT,
            created_by=created_by,
        )
        self._db.add(cycle)
        await self._db.flush()
        return cycle

    async def list_for_project(self, project_id: UUID) -> list[Cycle]:
        result = await self._db.execute(
            select(Cycle)
            .where(Cycle.project_id == project_id)
            .options(selectinload(Cycle.issues).selectinload(CycleIssue.issue).selectinload(Issue.state))
            .order_by(Cycle.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, cycle_id: UUID) -> Cycle:
        result = await self._db.execute(
            select(Cycle)
            .where(Cycle.id == cycle_id)
            .options(selectinload(Cycle.issues).selectinload(CycleIssue.issue).selectinload(Issue.state))
        )
        cycle = result.scalar_one_or_none()
        if not cycle:
            raise NotFoundError("Cycle", str(cycle_id))
        return cycle

    async def update(self, cycle_id: UUID, data: CycleUpdate) -> Cycle:
        cycle = await self.get_by_id(cycle_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(cycle, field, value)
        await self._db.flush()
        return cycle

    async def delete(self, cycle_id: UUID) -> None:
        cycle = await self.get_by_id(cycle_id)
        await self._db.delete(cycle)
        await self._db.flush()

    async def add_issues(self, cycle_id: UUID, issue_ids: list[str]) -> Cycle:
        # Validate cycle exists
        cycle = await self.get_by_id(cycle_id)

        # Get existing to avoid duplicates
        existing_result = await self._db.execute(
            select(CycleIssue.issue_id).where(CycleIssue.cycle_id == cycle_id)
        )
        existing_ids = {str(r) for r in existing_result.scalars().all()}

        for issue_id in issue_ids:
            if issue_id not in existing_ids:
                self._db.add(CycleIssue(cycle_id=cycle_id, issue_id=UUID(issue_id)))

        await self._db.flush()
        return await self.get_by_id(cycle_id)

    async def remove_issue(self, cycle_id: UUID, issue_id: UUID) -> None:
        await self._db.execute(
            delete(CycleIssue).where(
                CycleIssue.cycle_id == cycle_id,
                CycleIssue.issue_id == issue_id,
            )
        )
        await self._db.flush()

    def compute_progress(self, cycle: Cycle) -> dict:
        """Compute progress stats from in-memory cycle issues."""
        total = len(cycle.issues)
        if total == 0:
            return {"total": 0, "completed": 0, "in_progress": 0, "percentage": 0.0}

        completed = 0
        in_progress = 0
        for ci in cycle.issues:
            if ci.issue and ci.issue.state:
                group = ci.issue.state.group
                if group == "completed":
                    completed += 1
                elif group == "started":
                    in_progress += 1

        return {
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
            "percentage": round(completed / total * 100, 1),
        }
