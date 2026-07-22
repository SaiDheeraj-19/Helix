"""Helix — Cycles Module: Router"""
from uuid import UUID
from fastapi import APIRouter, status
from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import SuccessResponse, ok
from src.modules.cycles.schemas import CycleCreate, CycleUpdate, CycleResponse, CycleIssueAdd
from src.modules.cycles.service import CycleService
from src.modules.projects.service import ProjectService
from src.modules.workspaces.models import Workspace
from sqlalchemy import select

router = APIRouter(tags=["Cycles"])


def _serialize(cycle, progress: dict) -> CycleResponse:
    return CycleResponse(
        id=str(cycle.id),
        project_id=str(cycle.project_id),
        workspace_id=str(cycle.workspace_id),
        name=cycle.name,
        description=cycle.description,
        status=cycle.status,
        start_date=cycle.start_date.isoformat() if cycle.start_date else None,
        end_date=cycle.end_date.isoformat() if cycle.end_date else None,
        issue_count=progress["total"],
        completed_issue_count=progress["completed"],
        in_progress_count=progress["in_progress"],
        progress_percentage=progress["percentage"],
        created_at=cycle.created_at.isoformat(),
        created_by=str(cycle.created_by) if cycle.created_by else None,
    )


@router.get(
    "/workspaces/{ws_slug}/projects/{project_id}/cycles",
    response_model=SuccessResponse[list[CycleResponse]],
    summary="List all cycles in a project",
)
async def list_cycles(ws_slug: str, project_id: UUID, current_user_id: CurrentUserID, db: DBSession):
    svc = CycleService(db)
    cycles = await svc.list_for_project(project_id)
    return ok([_serialize(c, svc.compute_progress(c)) for c in cycles])


@router.post(
    "/workspaces/{ws_slug}/projects/{project_id}/cycles",
    response_model=SuccessResponse[CycleResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a cycle",
)
async def create_cycle(
    ws_slug: str,
    project_id: UUID,
    data: CycleCreate,
    current_user_id: CurrentUserID,
    db: DBSession,
):
    # Resolve workspace_id from slug
    ws_result = await db.execute(
        select(Workspace).where(Workspace.slug == ws_slug, Workspace.deleted_at.is_(None))
    )
    ws = ws_result.scalar_one_or_none()
    if not ws:
        from src.core.exceptions import NotFoundError
        raise NotFoundError("Workspace", ws_slug)

    svc = CycleService(db)
    cycle = await svc.create(project_id, ws.id, data, current_user_id)
    return ok(_serialize(cycle, svc.compute_progress(cycle)))


@router.get(
    "/cycles/{cycle_id}",
    response_model=SuccessResponse[CycleResponse],
    summary="Get cycle detail",
)
async def get_cycle(cycle_id: UUID, current_user_id: CurrentUserID, db: DBSession):
    svc = CycleService(db)
    cycle = await svc.get_by_id(cycle_id)
    return ok(_serialize(cycle, svc.compute_progress(cycle)))


@router.patch(
    "/cycles/{cycle_id}",
    response_model=SuccessResponse[CycleResponse],
    summary="Update a cycle",
)
async def update_cycle(cycle_id: UUID, data: CycleUpdate, current_user_id: CurrentUserID, db: DBSession):
    svc = CycleService(db)
    cycle = await svc.update(cycle_id, data)
    return ok(_serialize(cycle, svc.compute_progress(cycle)))


@router.delete("/cycles/{cycle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cycle(cycle_id: UUID, current_user_id: CurrentUserID, db: DBSession):
    svc = CycleService(db)
    await svc.delete(cycle_id)


@router.post(
    "/cycles/{cycle_id}/issues",
    response_model=SuccessResponse[CycleResponse],
    summary="Add issues to a cycle",
)
async def add_issues(cycle_id: UUID, data: CycleIssueAdd, current_user_id: CurrentUserID, db: DBSession):
    svc = CycleService(db)
    cycle = await svc.add_issues(cycle_id, data.issue_ids)
    return ok(_serialize(cycle, svc.compute_progress(cycle)))


@router.delete("/cycles/{cycle_id}/issues/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_issue(cycle_id: UUID, issue_id: UUID, current_user_id: CurrentUserID, db: DBSession):
    svc = CycleService(db)
    await svc.remove_issue(cycle_id, issue_id)
