from typing import Any

"""Helix — Organizations Module: Service"""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictError, NotFoundError
from src.modules.organizations.models import Organization, OrgMembership, OrgRole
from src.modules.organizations.schemas import CreateOrgRequest


class OrgService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, data: CreateOrgRequest, owner_id: UUID) -> Organization:
        # Check slug uniqueness
        existing = await self._db.execute(select(Organization).where(Organization.slug == data.slug, Organization.deleted_at.is_(None)))
        if existing.scalar_one_or_none():
            raise ConflictError(f"Organization with slug '{data.slug}' already exists")

        org = Organization(
            name=data.name,
            slug=data.slug,
            description=data.description,
        )
        self._db.add(org)
        await self._db.flush()

        # Add owner membership
        membership = OrgMembership(
            organization_id=org.id,
            user_id=owner_id,
            role=OrgRole.OWNER,
        )
        self._db.add(membership)
        await self._db.flush()

        return org

    async def get_by_slug(self, slug: str) -> Organization:
        result = await self._db.execute(select(Organization).where(Organization.slug == slug, Organization.deleted_at.is_(None)))
        org = result.scalar_one_or_none()
        if not org:
            raise NotFoundError("Organization", slug)
        return org

    async def get_members(self, org_slug: str) -> Any:
        from sqlalchemy.orm import selectinload

        org = await self.get_by_slug(org_slug)
        result = await self._db.execute(
            select(OrgMembership).where(OrgMembership.organization_id == org.id).options(selectinload(OrgMembership.user))
        )
        return result.scalars().all()

    async def add_member(self, org_slug: str, email: str, role: str) -> Any:
        from src.modules.users.models import User

        org = await self.get_by_slug(org_slug)

        # Find user
        user_result = await self._db.execute(select(User).where(User.email == email))
        user = user_result.scalar_one_or_none()
        if not user:
            import uuid

            import structlog
            logger = structlog.get_logger(__name__)
            username = f"invited_{uuid.uuid4().hex[:8]}"
            user = User(
                email=email,
                username=username,
                display_name=email.split("@")[0],
            )
            self._db.add(user)
            await self._db.flush()

            # Send Email
            from src.infrastructure.email.client import send_email

            invite_link = f"https://helix-seven-orpin.vercel.app/register?email={email}&org={org_slug}"
            subject = f"You've been invited to join the {org.name} Workspace on Helix"
            body = (
                f"Hello!\n\n"
                f"You have been invited to join the '{org.name}' workspace on Helix as a {role}.\n\n"
                f"Helix is an enterprise project management platform. To accept your invitation and join the workspace, "
                f"please click the link below to set up your account:\n\n"
                f"{invite_link}\n\n"
                f"Welcome aboard,\n"
                f"The Helix Team"
            )

            # Run this in the background (we can just await it since it's a fast mock for now)
            await send_email(to_email=email, subject=subject, body=body)

        # Check existing membership
        existing = await self._db.execute(select(OrgMembership).where(OrgMembership.organization_id == org.id, OrgMembership.user_id == user.id))
        if existing.scalar_one_or_none():
            raise ConflictError("User is already a member of this organization")

        membership = OrgMembership(
            organization_id=org.id,
            user_id=user.id,
            role=OrgRole(role),
        )
        self._db.add(membership)
        await self._db.flush()

        # Load user for response
        await self._db.refresh(membership, ["user"])
        return membership

    async def update_member_role(self, org_slug: str, membership_id: UUID, new_role: str) -> Any:
        org = await self.get_by_slug(org_slug)
        result = await self._db.execute(select(OrgMembership).where(OrgMembership.id == membership_id, OrgMembership.organization_id == org.id))
        membership = result.scalar_one_or_none()
        if not membership:
            raise NotFoundError("Membership", str(membership_id))

        membership.role = OrgRole(new_role)
        await self._db.flush()
        await self._db.refresh(membership, ["user"])
        return membership

    async def remove_member(self, org_slug: str, membership_id: UUID) -> Any:
        org = await self.get_by_slug(org_slug)
        result = await self._db.execute(select(OrgMembership).where(OrgMembership.id == membership_id, OrgMembership.organization_id == org.id))
        membership = result.scalar_one_or_none()
        if not membership:
            raise NotFoundError("Membership", str(membership_id))

        await self._db.delete(membership)
        await self._db.flush()
