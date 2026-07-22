"""Helix — Organizations Module: Router (stub)"""
from uuid import UUID

from fastapi import APIRouter, status

from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import SuccessResponse, ok
from src.modules.organizations.schemas import (
    AddMemberRequest,
    CreateOrgRequest,
    OrgMemberResponse,
    OrgResponse,
    UpdateMemberRoleRequest,
)
from src.modules.organizations.service import OrgService

router = APIRouter(prefix="/orgs", tags=["Organizations"])


@router.post("", response_model=SuccessResponse[OrgResponse], status_code=201, summary="Create organization")
async def create_org(data: CreateOrgRequest, current_user_id: CurrentUserID, db: DBSession):
    service = OrgService(db)
    org = await service.create(data, owner_id=current_user_id)
    return ok(OrgResponse.model_validate(org))


@router.get("/{slug}", response_model=SuccessResponse[OrgResponse], summary="Get organization by slug")
async def get_org(slug: str, current_user_id: CurrentUserID, db: DBSession):
    service = OrgService(db)
    org = await service.get_by_slug(slug)
    return ok(OrgResponse.model_validate(org))


@router.get("/{slug}/members", response_model=SuccessResponse[list[OrgMemberResponse]])
async def list_members(slug: str, current_user_id: CurrentUserID, db: DBSession):
    service = OrgService(db)
    members = await service.get_members(slug)
    result = []
    for m in members:
        result.append(OrgMemberResponse(
            id=str(m.id),
            user_id=str(m.user_id),
            display_name=m.user.display_name,
            email=m.user.email,
            avatar_url=m.user.avatar_url,
            role=m.role.value,
            joined_at=m.created_at.isoformat()
        ))
    return ok(result)


@router.post("/{slug}/members", response_model=SuccessResponse[OrgMemberResponse], status_code=status.HTTP_201_CREATED)
async def add_member(slug: str, data: AddMemberRequest, current_user_id: CurrentUserID, db: DBSession):
    service = OrgService(db)
    m = await service.add_member(slug, data.email, data.role)
    return ok(OrgMemberResponse(
        id=str(m.id), user_id=str(m.user_id), display_name=m.user.display_name,
        email=m.user.email, avatar_url=m.user.avatar_url, role=m.role.value,
        joined_at=m.created_at.isoformat()
    ))


@router.patch("/{slug}/members/{membership_id}", response_model=SuccessResponse[OrgMemberResponse])
async def update_member(slug: str, membership_id: UUID, data: UpdateMemberRoleRequest, current_user_id: CurrentUserID, db: DBSession):
    service = OrgService(db)
    m = await service.update_member_role(slug, membership_id, data.role)
    return ok(OrgMemberResponse(
        id=str(m.id), user_id=str(m.user_id), display_name=m.user.display_name,
        email=m.user.email, avatar_url=m.user.avatar_url, role=m.role.value,
        joined_at=m.created_at.isoformat()
    ))


@router.delete("/{slug}/members/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(slug: str, membership_id: UUID, current_user_id: CurrentUserID, db: DBSession):
    service = OrgService(db)
    await service.remove_member(slug, membership_id)
