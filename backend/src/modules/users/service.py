"""Helix — Users Module: Service"""
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import NotFoundError
from src.modules.users.models import User
from src.modules.users.schemas import UpdateUserRequest


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, user_id: UUID) -> User:
        result = await self._db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", str(user_id))
        return user

    async def update(self, user_id: UUID, data: UpdateUserRequest) -> User:
        updates = data.model_dump(exclude_none=True)
        if updates:
            await self._db.execute(
                update(User).where(User.id == user_id).values(**updates)
            )
        return await self.get_by_id(user_id)
