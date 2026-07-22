"""
Helix — Auth Module: Repository
Data access layer — no business logic here.
"""

import hashlib
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.models import OAuthAccount, RefreshToken
from src.modules.users.models import User


class AuthRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ─────────────────────────────────────────────
    # User queries
    # ─────────────────────────────────────────────

    async def get_user_by_email(self, email: str) -> User | None:
        result = await self._db.execute(
            select(User)
            .where(User.email == email.lower(), User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: UUID) -> User | None:
        result = await self._db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_user_by_username(self, username: str) -> User | None:
        result = await self._db.execute(
            select(User).where(User.username == username.lower(), User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def create_user(
        self,
        email: str,
        username: str,
        display_name: str,
        hashed_password: str | None = None,
    ) -> User:
        user = User(
            email=email.lower(),
            username=username.lower(),
            display_name=display_name,
            hashed_password=hashed_password,
        )
        self._db.add(user)
        await self._db.flush()  # Get ID without committing
        return user

    async def mark_email_verified(self, user_id: UUID) -> None:
        await self._db.execute(
            update(User)
            .where(User.id == user_id)
            .values(is_email_verified=True, status="active")
        )

    # ─────────────────────────────────────────────
    # Refresh Token management
    # ─────────────────────────────────────────────

    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    async def store_refresh_token(
        self,
        user_id: UUID,
        token: str,
        expires_at: datetime,
        ip_address: str | None = None,
        user_agent: str | None = None,
        family: str | None = None,
    ) -> RefreshToken:
        import uuid

        rt = RefreshToken(
            user_id=user_id,
            token_hash=self._hash_token(token),
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
            family=family or str(uuid.uuid4()),
        )
        self._db.add(rt)
        await self._db.flush()
        return rt

    async def get_refresh_token(self, token: str) -> RefreshToken | None:
        token_hash = self._hash_token(token)
        result = await self._db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, token: str) -> None:
        token_hash = self._hash_token(token)
        await self._db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .values(revoked_at=datetime.now(UTC))
        )

    async def revoke_token_family(self, family: str) -> None:
        """Revoke all tokens in a family (reuse attack detection)."""
        await self._db.execute(
            update(RefreshToken)
            .where(RefreshToken.family == family, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )

    async def revoke_all_user_tokens(self, user_id: UUID) -> None:
        """Revoke all refresh tokens for a user (logout-all-devices)."""
        await self._db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )

    # ─────────────────────────────────────────────
    # OAuth
    # ─────────────────────────────────────────────

    async def get_oauth_account(
        self, provider: str, provider_user_id: str
    ) -> OAuthAccount | None:
        result = await self._db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_user_id == provider_user_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_oauth_account(
        self,
        user_id: UUID,
        provider: str,
        provider_user_id: str,
        provider_email: str | None = None,
        access_token: str | None = None,
    ) -> OAuthAccount:
        account = OAuthAccount(
            user_id=user_id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=provider_email,
            access_token=access_token,
        )
        self._db.add(account)
        await self._db.flush()
        return account
