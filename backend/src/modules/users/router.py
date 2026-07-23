
"""Helix — Users Module: Router"""
from fastapi import APIRouter
from fastapi.responses import ORJSONResponse

from src.core.config import settings
from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import ok_json
from src.infrastructure.storage.minio import StorageService
from src.modules.users.schemas import UpdateUserRequest, UserResponse
from src.modules.users.service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", summary="Get current user profile")
async def get_me(current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = UserService(db)
    user = await service.get_by_id(current_user_id)
    return ORJSONResponse(content=ok_json(UserResponse.model_validate(user).model_dump(mode="json")))


@router.patch("/me", summary="Update current user profile")
async def update_me(data: UpdateUserRequest, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = UserService(db)
    user = await service.update(current_user_id, data)
    return ORJSONResponse(content=ok_json(UserResponse.model_validate(user).model_dump(mode="json")))


from pydantic import BaseModel


class AvatarUploadRequest(BaseModel):
    file_name: str
    content_type: str


class AvatarUploadResponse(BaseModel):
    upload_url: str
    avatar_url: str


@router.post("/me/avatar/upload-url", summary="Get upload URL for user avatar")
async def get_avatar_upload_url(data: AvatarUploadRequest, current_user_id: CurrentUserID) -> ORJSONResponse:
    import uuid

    storage = StorageService()
    ext = data.file_name.split(".")[-1] if "." in data.file_name else "png"
    storage_key = f"{current_user_id}/{uuid.uuid4().hex}.{ext}"

    upload_url = storage.generate_presigned_upload_url(
        bucket=settings.MINIO_ATTACHMENTS_BUCKET,
        key=storage_key,
        content_type=data.content_type,
    )
    avatar_url = storage.generate_presigned_download_url(
        bucket=settings.MINIO_ATTACHMENTS_BUCKET,
        key=storage_key,
        filename=data.file_name,
        expires_in=604800,
    )

    return ORJSONResponse(content=ok_json(AvatarUploadResponse(upload_url=upload_url, avatar_url=avatar_url).model_dump(mode="json")))
