"""
Helix — Issues Module: Service
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from src.core.config import settings
from src.core.exceptions import NotFoundError
from src.infrastructure.storage.minio import StorageService
from src.modules.issues.models import (
    Activity,
    Attachment,
    Comment,
    Issue,
    IssueAssignee,
    IssueLabelLink,
)
from src.modules.issues.schemas import (
    AttachmentUploadRequest,
    AttachmentUploadResponse,
    CommentCreate,
    CommentUpdate,
    IssueCreate,
    IssueFilters,
    IssueUpdate,
)
from src.modules.projects.service import ProjectService


class IssueService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._project_service = ProjectService(db)

    # ─── Issues ────────────────────────────────────────────────────────────────

    async def create(
        self,
        project_id: uuid.UUID,
        data: IssueCreate,
        created_by: uuid.UUID,
    ) -> Issue:
        project = await self._project_service.get_by_id(project_id)

        # Resolve state
        state_id: uuid.UUID
        if data.state_id:
            state_id = data.state_id
        else:
            default_state = await self._project_service.get_default_state(project_id)
            state_id = default_state.id

        # Get next sequence ID atomically
        sequence_id = await self._project_service.next_sequence_id(project_id)

        # Compute initial sort_order (bottom of the list)
        max_order_result = await self._db.execute(
            select(func.max(Issue.sort_order)).where(
                Issue.project_id == project_id,
                Issue.state_id == state_id,
                Issue.deleted_at.is_(None),
            )
        )
        max_order = max_order_result.scalar_one_or_none() or 0.0
        sort_order = max_order + 1000.0

        issue = Issue(
            workspace_id=project.workspace_id,
            project_id=project_id,
            sequence_id=sequence_id,
            title=data.title,
            description=data.description,
            description_html=data.description_html,
            priority=data.priority,
            state_id=state_id,
            parent_id=data.parent_id,
            estimate=data.estimate,
            due_date=data.due_date,
            started_at=data.started_at,
            sort_order=sort_order,
            created_by=created_by,
            updated_by=created_by,
        )
        self._db.add(issue)
        await self._db.flush()

        # Add assignees
        for uid_str in data.assignee_ids or []:
            self._db.add(IssueAssignee(issue_id=issue.id, user_id=uuid.UUID(uid_str)))

        # Add labels
        for lid_str in data.label_ids or []:
            self._db.add(IssueLabelLink(issue_id=issue.id, label_id=uuid.UUID(lid_str)))

        await self._db.flush()

        # Log activity
        self._db.add(
            Activity(
                issue_id=issue.id,
                actor_id=created_by,
                field="title",
                old_value=None,
                new_value=data.title,
                activity_type="created",
            )
        )
        await self._db.flush()

        return await self.get_by_id(issue.id)

    async def get_by_id(self, issue_id: uuid.UUID) -> Issue:
        result = await self._db.execute(
            select(Issue)
            .where(Issue.id == issue_id, Issue.deleted_at.is_(None))
            .options(
                joinedload(Issue.state),
                selectinload(Issue.assignees).selectinload(IssueAssignee.user),
                selectinload(Issue.label_links).selectinload(IssueLabelLink.label),
            )
        )
        issue = result.unique().scalar_one_or_none()
        if not issue:
            raise NotFoundError("Issue", str(issue_id))
        return issue

    async def list_for_project(
        self,
        project_id: uuid.UUID,
        filters: IssueFilters,
        page: int = 1,
        per_page: int = 50,
    ) -> tuple[list[Issue], int]:
        query = (
            select(Issue)
            .where(Issue.project_id == project_id, Issue.deleted_at.is_(None))
            .options(
                joinedload(Issue.state),
                selectinload(Issue.assignees).selectinload(IssueAssignee.user),
                selectinload(Issue.label_links).selectinload(IssueLabelLink.label),
            )
        )

        # Apply filters
        if filters.state_ids:
            query = query.where(Issue.state_id.in_([uuid.UUID(s) for s in filters.state_ids]))
        if filters.priority:
            query = query.where(Issue.priority.in_(filters.priority))
        if filters.assignee_ids:
            query = query.join(IssueAssignee).where(IssueAssignee.user_id.in_([uuid.UUID(a) for a in filters.assignee_ids]))
        if filters.label_ids:
            query = query.join(IssueLabelLink).where(IssueLabelLink.label_id.in_([uuid.UUID(l) for l in filters.label_ids]))
        if filters.parent_id:
            query = query.where(Issue.parent_id == filters.parent_id)
        elif not filters.parent_id:
            query = query.where(Issue.parent_id.is_(None))  # top-level only by default
        if filters.search:
            query = query.where(Issue.title.ilike(f"%{filters.search}%"))

        # Sorting
        order_field = filters.order_by.lstrip("-")
        desc = filters.order_by.startswith("-")
        col_map = {
            "created_at": Issue.created_at,
            "updated_at": Issue.updated_at,
            "priority": Issue.priority,
            "sort_order": Issue.sort_order,
            "due_date": Issue.due_date,
            "sequence_id": Issue.sequence_id,
        }
        order_col = col_map.get(order_field, Issue.created_at)
        query = query.order_by(order_col.desc() if desc else order_col.asc())

        # Count
        count_query = select(func.count()).select_from(select(Issue.id).where(Issue.project_id == project_id, Issue.deleted_at.is_(None)).subquery())
        total_result = await self._db.execute(count_query)
        total = total_result.scalar_one()

        # Paginate
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)
        result = await self._db.execute(query)
        issues = list(result.unique().scalars().all())

        return issues, total

    async def update(
        self,
        issue_id: uuid.UUID,
        data: IssueUpdate,
        updated_by: uuid.UUID,
    ) -> Issue:
        issue = await self.get_by_id(issue_id)
        updates = data.model_dump(exclude_none=True)

        # Handle M2M separately
        assignee_ids = updates.pop("assignee_ids", None)
        label_ids = updates.pop("label_ids", None)

        # Track changes for activity log
        activities = []
        trackable = {"title", "priority", "state_id", "due_date", "estimate"}
        for field, new_val in updates.items():
            if field in trackable:
                old_val = getattr(issue, field, None)
                if str(old_val) != str(new_val):
                    activities.append(
                        Activity(
                            issue_id=issue_id,
                            actor_id=updated_by,
                            field=field,
                            old_value=str(old_val) if old_val is not None else None,
                            new_value=str(new_val),
                            activity_type="updated",
                        )
                    )

        if updates:
            updates["updated_by"] = updated_by
            await self._db.execute(update(Issue).where(Issue.id == issue_id).values(**updates))

        # Update assignees
        if assignee_ids is not None:
            await self._db.execute(delete(IssueAssignee).where(IssueAssignee.issue_id == issue_id))
            for uid_str in assignee_ids:
                self._db.add(IssueAssignee(issue_id=issue_id, user_id=uuid.UUID(uid_str)))

        # Update labels
        if label_ids is not None:
            await self._db.execute(delete(IssueLabelLink).where(IssueLabelLink.issue_id == issue_id))
            for lid_str in label_ids:
                self._db.add(IssueLabelLink(issue_id=issue_id, label_id=uuid.UUID(lid_str)))

        for activity in activities:
            self._db.add(activity)

        await self._db.flush()
        return await self.get_by_id(issue_id)

    async def delete(self, issue_id: uuid.UUID, deleted_by: uuid.UUID) -> None:
        await self._db.execute(
            update(Issue)
            .where(Issue.id == issue_id)
            .values(
                deleted_at=datetime.now(UTC),
                updated_by=deleted_by,
            )
        )

    # ─── Comments ──────────────────────────────────────────────────────────────

    async def add_comment(
        self,
        issue_id: uuid.UUID,
        data: CommentCreate,
        actor_id: uuid.UUID,
    ) -> Comment:
        comment = Comment(
            issue_id=issue_id,
            content=data.content,
            content_html=data.content_html,
            created_by=actor_id,
            updated_by=actor_id,
        )
        self._db.add(comment)

        # Log activity
        self._db.add(
            Activity(
                issue_id=issue_id,
                actor_id=actor_id,
                field="comment",
                activity_type="commented",
                comment=data.content[:200],
            )
        )
        await self._db.flush()
        return comment

    async def update_comment(self, comment_id: uuid.UUID, data: CommentUpdate, actor_id: uuid.UUID) -> Comment:
        await self._db.execute(
            update(Comment)
            .where(Comment.id == comment_id)
            .values(
                content=data.content,
                content_html=data.content_html,
                edited_at=datetime.now(UTC).isoformat(),
                updated_by=actor_id,
            )
        )
        result = await self._db.execute(select(Comment).where(Comment.id == comment_id))
        return result.scalar_one()

    async def delete_comment(self, comment_id: uuid.UUID) -> None:
        await self._db.execute(delete(Comment).where(Comment.id == comment_id))

    async def get_comments(self, issue_id: uuid.UUID) -> list[Comment]:
        result = await self._db.execute(select(Comment).where(Comment.issue_id == issue_id).order_by(Comment.created_at.asc()))
        return list(result.scalars().all())

    async def get_activities(self, issue_id: uuid.UUID) -> list[Activity]:
        result = await self._db.execute(
            select(Activity).where(Activity.issue_id == issue_id).options(selectinload(Activity.actor)).order_by(Activity.created_at.asc())
        )
        return list(result.scalars().all())

    # ─── Attachments ───────────────────────────────────────────────────────────

    async def initiate_upload(
        self,
        issue_id: uuid.UUID,
        data: AttachmentUploadRequest,
        uploaded_by: uuid.UUID,
    ) -> AttachmentUploadResponse:
        """Create attachment record and return presigned MinIO upload URL."""
        storage_key = f"attachments/{issue_id}/{uuid.uuid4()}/{data.file_name}"
        bucket = settings.MINIO_BUCKET_ATTACHMENTS

        attachment = Attachment(
            issue_id=issue_id,
            uploaded_by=uploaded_by,
            file_name=data.file_name,
            file_size=data.file_size,
            content_type=data.content_type,
            storage_key=storage_key,
            bucket=bucket,
        )
        self._db.add(attachment)
        await self._db.flush()

        storage = StorageService()
        presigned = storage.generate_presigned_upload_url(
            bucket=bucket,
            key=storage_key,
            content_type=data.content_type,
        )

        return AttachmentUploadResponse(
            attachment_id=str(attachment.id),
            upload_url=presigned["upload_url"],
            storage_key=storage_key,
        )

    async def get_attachments(self, issue_id: uuid.UUID) -> list[Attachment]:
        result = await self._db.execute(select(Attachment).where(Attachment.issue_id == issue_id).order_by(Attachment.created_at.desc()))
        return list(result.scalars().all())
