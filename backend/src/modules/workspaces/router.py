
"""Helix — Workspaces Module: Router"""
from fastapi import APIRouter
from fastapi.responses import ORJSONResponse

from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import ok_json
from src.modules.workspaces.schemas import CreateWorkspaceRequest, WorkspaceResponse
from src.modules.workspaces.service import WorkspaceService

router = APIRouter(prefix="/orgs/{org_slug}/workspaces", tags=["Workspaces"])


@router.post("", status_code=201)
async def create_workspace(
    org_slug: str,
    data: CreateWorkspaceRequest,
    current_user_id: CurrentUserID,
    db: DBSession,
) -> ORJSONResponse:
    service = WorkspaceService(db)
    ws = await service.create(org_slug=org_slug, data=data, user_id=current_user_id)
    return ORJSONResponse(content=ok_json(WorkspaceResponse.model_validate(ws).model_dump(mode="json")), status_code=201)


@router.get("/{ws_slug}")
async def get_workspace(org_slug: str, ws_slug: str, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = WorkspaceService(db)
    ws = await service.get_by_slug(org_slug=org_slug, slug=ws_slug)
    return ORJSONResponse(content=ok_json(WorkspaceResponse.model_validate(ws).model_dump(mode="json")))
