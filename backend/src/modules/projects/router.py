from typing import Any

"""Helix — Projects Module: Router"""
from uuid import UUID

from fastapi import APIRouter, status

from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import SuccessResponse, ok
from src.modules.projects.schemas import (
    IssueStateCreate,
    IssueStateResponse,
    LabelCreate,
    LabelResponse,
    ProjectCreate,
    ProjectMemberResponse,
    ProjectResponse,
    ProjectUpdate,
)
from src.modules.projects.service import ProjectService

router = APIRouter(tags=["Projects"])


# ─── Projects ──────────────────────────────────────────────────────────────────


@router.post(
    "/workspaces/{ws_slug}/projects",
    response_model=SuccessResponse[ProjectResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
)
async def create_project(
    ws_slug: str,
    data: ProjectCreate,
    current_user_id: CurrentUserID,
    db: DBSession,
) -> Any:
    service = ProjectService(db)
    project = await service.create(ws_slug, data, current_user_id)
    return ok(ProjectResponse.model_validate(project))


@router.get(
    "/workspaces/{ws_slug}/projects",
    response_model=SuccessResponse[list[ProjectResponse]],
    summary="List projects in a workspace",
)
async def list_projects(ws_slug: str, current_user_id: CurrentUserID, db: DBSession) -> Any:
    from sqlalchemy import select

    from src.modules.workspaces.models import Workspace

    ws_result = await db.execute(select(Workspace).where(Workspace.slug == ws_slug, Workspace.deleted_at.is_(None)))
    ws = ws_result.scalar_one_or_none()
    if not ws:
        from src.core.exceptions import NotFoundError

        raise NotFoundError("Workspace", ws_slug)
    service = ProjectService(db)
    projects = await service.list_for_workspace(ws.id)
    return ok([ProjectResponse.model_validate(p) for p in projects])


@router.get(
    "/workspaces/{ws_slug}/projects/{identifier}",
    response_model=SuccessResponse[ProjectResponse],
    summary="Get project by identifier",
)
async def get_project(ws_slug: str, identifier: str, current_user_id: CurrentUserID, db: DBSession) -> Any:
    from sqlalchemy import select

    from src.modules.workspaces.models import Workspace

    ws_result = await db.execute(select(Workspace).where(Workspace.slug == ws_slug, Workspace.deleted_at.is_(None)))
    ws = ws_result.scalar_one_or_none()
    if not ws:
        from src.core.exceptions import NotFoundError

        raise NotFoundError("Workspace", ws_slug)
    service = ProjectService(db)
    project = await service.get_by_identifier(ws.id, identifier)
    return ok(ProjectResponse.model_validate(project))


@router.patch(
    "/projects/{project_id}",
    response_model=SuccessResponse[ProjectResponse],
    summary="Update project",
)
async def update_project(project_id: UUID, data: ProjectUpdate, current_user_id: CurrentUserID, db: DBSession) -> Any:
    service = ProjectService(db)
    project = await service.update(project_id, data, current_user_id)
    return ok(ProjectResponse.model_validate(project))


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> Any:
    service = ProjectService(db)
    await service.delete(project_id, current_user_id)


# ─── States ────────────────────────────────────────────────────────────────────


@router.get(
    "/projects/{project_id}/states",
    response_model=SuccessResponse[list[IssueStateResponse]],
)
async def list_states(project_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> Any:
    service = ProjectService(db)
    states = await service.get_states(project_id)
    return ok([IssueStateResponse.model_validate(s) for s in states])


@router.post(
    "/projects/{project_id}/states",
    response_model=SuccessResponse[IssueStateResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_state(project_id: UUID, data: IssueStateCreate, current_user_id: CurrentUserID, db: DBSession) -> Any:
    service = ProjectService(db)
    state = await service.create_state(project_id, data)
    return ok(IssueStateResponse.model_validate(state))


# ─── Labels ────────────────────────────────────────────────────────────────────


@router.get(
    "/projects/{project_id}/labels",
    response_model=SuccessResponse[list[LabelResponse]],
)
async def list_labels(project_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> Any:
    service = ProjectService(db)
    labels = await service.get_labels(project_id)
    return ok([LabelResponse.model_validate(l) for l in labels])


@router.post(
    "/projects/{project_id}/labels",
    response_model=SuccessResponse[LabelResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_label(project_id: UUID, data: LabelCreate, current_user_id: CurrentUserID, db: DBSession) -> Any:
    service = ProjectService(db)
    label = await service.create_label(project_id, data)
    return ok(LabelResponse.model_validate(label))


# ─── Members ───────────────────────────────────────────────────────────────────


@router.get(
    "/projects/{project_id}/members",
    response_model=SuccessResponse[list[ProjectMemberResponse]],
)
async def list_members(project_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> Any:
    service = ProjectService(db)
    members = await service.get_members(project_id)
    result = []
    for m in members:
        result.append(
            ProjectMemberResponse(
                id=str(m.id),
                user_id=str(m.user_id),
                display_name=m.user.display_name,
                email=m.user.email,
                avatar_url=m.user.avatar_url,
                role=m.role,
            )
        )
    return ok(result)
