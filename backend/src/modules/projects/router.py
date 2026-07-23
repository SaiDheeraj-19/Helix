
"""Helix — Projects Module: Router"""
from uuid import UUID

from fastapi import APIRouter, status
from fastapi.responses import ORJSONResponse

from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import ok_json
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
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
)
async def create_project(
    ws_slug: str,
    data: ProjectCreate,
    current_user_id: CurrentUserID,
    db: DBSession,
) -> ORJSONResponse:
    service = ProjectService(db)
    project = await service.create(ws_slug, data, current_user_id)
    return ORJSONResponse(
        content=ok_json(ProjectResponse.model_validate(project).model_dump(mode="json")),
        status_code=status.HTTP_201_CREATED,
    )


@router.get(
    "/workspaces/{ws_slug}/projects",
    summary="List projects in a workspace",
)
async def list_projects(ws_slug: str, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    from sqlalchemy import select

    from src.modules.workspaces.models import Workspace

    ws_result = await db.execute(select(Workspace).where(Workspace.slug == ws_slug, Workspace.deleted_at.is_(None)))
    ws = ws_result.scalar_one_or_none()
    if not ws:
        from src.core.exceptions import NotFoundError

        raise NotFoundError("Workspace", ws_slug)
    service = ProjectService(db)
    projects = await service.list_for_workspace(ws.id)
    return ORJSONResponse(content=ok_json([ProjectResponse.model_validate(p).model_dump(mode="json") for p in projects]))


@router.get(
    "/workspaces/{ws_slug}/projects/{identifier}",
    summary="Get project by identifier",
)
async def get_project(ws_slug: str, identifier: str, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    from sqlalchemy import select

    from src.modules.workspaces.models import Workspace

    ws_result = await db.execute(select(Workspace).where(Workspace.slug == ws_slug, Workspace.deleted_at.is_(None)))
    ws = ws_result.scalar_one_or_none()
    if not ws:
        from src.core.exceptions import NotFoundError

        raise NotFoundError("Workspace", ws_slug)
    service = ProjectService(db)
    project = await service.get_by_identifier(ws.id, identifier)
    return ORJSONResponse(content=ok_json(ProjectResponse.model_validate(project).model_dump(mode="json")))


@router.patch(
    "/projects/{project_id}",
    summary="Update project",
)
async def update_project(project_id: UUID, data: ProjectUpdate, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = ProjectService(db)
    project = await service.update(project_id, data, current_user_id)
    return ORJSONResponse(content=ok_json(ProjectResponse.model_validate(project).model_dump(mode="json")))


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> None:
    service = ProjectService(db)
    await service.delete(project_id, current_user_id)


# ─── States ────────────────────────────────────────────────────────────────────


@router.get(
    "/projects/{project_id}/states",
)
async def list_states(project_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = ProjectService(db)
    states = await service.get_states(project_id)
    return ORJSONResponse(content=ok_json([IssueStateResponse.model_validate(s).model_dump(mode="json") for s in states]))


@router.post(
    "/projects/{project_id}/states",
    status_code=status.HTTP_201_CREATED,
)
async def create_state(project_id: UUID, data: IssueStateCreate, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = ProjectService(db)
    state = await service.create_state(project_id, data)
    return ORJSONResponse(
        content=ok_json(IssueStateResponse.model_validate(state).model_dump(mode="json")),
        status_code=status.HTTP_201_CREATED,
    )


# ─── Labels ────────────────────────────────────────────────────────────────────


@router.get(
    "/projects/{project_id}/labels",
)
async def list_labels(project_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = ProjectService(db)
    labels = await service.get_labels(project_id)
    return ORJSONResponse(content=ok_json([LabelResponse.model_validate(lbl).model_dump(mode="json") for lbl in labels]))


@router.post(
    "/projects/{project_id}/labels",
    status_code=status.HTTP_201_CREATED,
)
async def create_label(project_id: UUID, data: LabelCreate, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = ProjectService(db)
    label = await service.create_label(project_id, data)
    return ORJSONResponse(
        content=ok_json(LabelResponse.model_validate(label).model_dump(mode="json")),
        status_code=status.HTTP_201_CREATED,
    )


# ─── Members ───────────────────────────────────────────────────────────────────


@router.get(
    "/projects/{project_id}/members",
)
async def list_members(project_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = ProjectService(db)
    members = await service.get_members(project_id)
    result = []
    for m in members:
        result.append(
            ProjectMemberResponse(
                id=m.id,
                user_id=m.user_id,
                display_name=m.user.display_name,
                email=m.user.email,
                avatar_url=m.user.avatar_url,
                role=m.role,
            ).model_dump(mode="json")
        )
    return ORJSONResponse(content=ok_json(result))
