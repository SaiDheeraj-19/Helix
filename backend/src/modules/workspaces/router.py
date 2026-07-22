"""Helix — Workspaces Module: Router"""
from fastapi import APIRouter

from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import SuccessResponse, ok
from src.modules.workspaces.schemas import CreateWorkspaceRequest, WorkspaceResponse
from src.modules.workspaces.service import WorkspaceService

router = APIRouter(prefix="/orgs/{org_slug}/workspaces", tags=["Workspaces"])


@router.post("", response_model=SuccessResponse[WorkspaceResponse], status_code=201)
async def create_workspace(
    org_slug: str,
    data: CreateWorkspaceRequest,
    current_user_id: CurrentUserID,
    db: DBSession,
):
    service = WorkspaceService(db)
    ws = await service.create(org_slug=org_slug, data=data, user_id=current_user_id)
    return ok(WorkspaceResponse.model_validate(ws))


@router.get("/{ws_slug}", response_model=SuccessResponse[WorkspaceResponse])
async def get_workspace(org_slug: str, ws_slug: str, current_user_id: CurrentUserID, db: DBSession):
    service = WorkspaceService(db)
    ws = await service.get_by_slug(org_slug=org_slug, slug=ws_slug)
    return ok(WorkspaceResponse.model_validate(ws))
