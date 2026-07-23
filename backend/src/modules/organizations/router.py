
"""Helix — Organizations Module: Router"""
from uuid import UUID

from fastapi import APIRouter, status
from fastapi.responses import ORJSONResponse

from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import ok_json
from src.modules.organizations.schemas import (
    AddMemberRequest,
    CreateOrgRequest,
    OrgMemberResponse,
    OrgResponse,
    UpdateMemberRoleRequest,
)
from src.modules.organizations.service import OrgService

router = APIRouter(prefix="/orgs", tags=["Organizations"])


@router.post("", status_code=201, summary="Create organization")
async def create_org(data: CreateOrgRequest, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = OrgService(db)
    org = await service.create(data, owner_id=current_user_id)
    return ORJSONResponse(content=ok_json(OrgResponse.model_validate(org).model_dump(mode="json")), status_code=status.HTTP_201_CREATED)


@router.get("/{slug}", summary="Get organization by slug")
async def get_org(slug: str, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = OrgService(db)
    org = await service.get_by_slug(slug)
    return ORJSONResponse(content=ok_json(OrgResponse.model_validate(org).model_dump(mode="json")))


@router.get("/{slug}/members")
async def list_members(slug: str, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = OrgService(db)
    members = await service.get_members(slug)
    result = []
    for m in members:
        result.append(
            OrgMemberResponse(
                id=m.id,
                user_id=m.user_id,
                display_name=m.user.display_name,
                email=m.user.email,
                avatar_url=m.user.avatar_url,
                role=m.role.value,
                joined_at=m.created_at.isoformat(),
            ).model_dump(mode="json")
        )
    return ORJSONResponse(content=ok_json(result))


@router.post("/{slug}/members", status_code=status.HTTP_201_CREATED)
async def add_member(slug: str, data: AddMemberRequest, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = OrgService(db)
    m = await service.add_member(slug, data.email, data.role)
    return ORJSONResponse(
        content=ok_json(
            OrgMemberResponse(
                id=m.id,
                user_id=m.user_id,
                display_name=m.user.display_name,
                email=m.user.email,
                avatar_url=m.user.avatar_url,
                role=m.role.value,
                joined_at=m.created_at.isoformat(),
            ).model_dump(mode="json")
        ),
        status_code=status.HTTP_201_CREATED,
    )


@router.patch("/{slug}/members/{membership_id}")
async def update_member(slug: str, membership_id: UUID, data: UpdateMemberRoleRequest, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = OrgService(db)
    m = await service.update_member_role(slug, membership_id, data.role)
    return ORJSONResponse(
        content=ok_json(
            OrgMemberResponse(
                id=m.id,
                user_id=m.user_id,
                display_name=m.user.display_name,
                email=m.user.email,
                avatar_url=m.user.avatar_url,
                role=m.role.value,
                joined_at=m.created_at.isoformat(),
            ).model_dump(mode="json")
        )
    )


@router.delete("/{slug}/members/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(slug: str, membership_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> None:
    service = OrgService(db)
    await service.remove_member(slug, membership_id)
