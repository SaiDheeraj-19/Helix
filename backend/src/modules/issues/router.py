from typing import Any

"""Helix — Issues Module: Router"""
from uuid import UUID

from fastapi import APIRouter, Query, status
from fastapi.responses import ORJSONResponse

from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import ok_json, paginated_json
from src.modules.issues.schemas import (
    ActivityResponse,
    AttachmentResponse,
    AttachmentUploadRequest,
    CommentCreate,
    CommentResponse,
    CommentUpdate,
    IssueCreate,
    IssueFilters,
    IssueMoveRequest,
    IssueResponse,
    IssueUpdate,
    LabelSlim,
    StateSlim,
    UserSlim,
)
from src.modules.issues.service import IssueService

router = APIRouter(tags=["Issues"])


# ─── Issues CRUD ───────────────────────────────────────────────────────────────


@router.post(
    "/projects/{project_id}/issues",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new issue",
)
async def create_issue(
    project_id: UUID,
    data: IssueCreate,
    current_user_id: CurrentUserID,
    db: DBSession,
) -> ORJSONResponse:
    service = IssueService(db)
    issue = await service.create(project_id, data, current_user_id)
    return ORJSONResponse(content=ok_json(IssueResponse.model_validate(_build_issue_dict(issue)).model_dump(mode="json")), status_code=status.HTTP_201_CREATED)


@router.get(
    "/projects/{project_id}/issues",
    summary="List issues with filters",
)
async def list_issues(
    project_id: UUID,
    current_user_id: CurrentUserID,
    db: DBSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    state_ids: list[str] = Query(default=[]),
    priority: list[str] = Query(default=[]),
    assignee_ids: list[str] = Query(default=[]),
    label_ids: list[str] = Query(default=[]),
    search: str | None = Query(None),
    order_by: str = Query("-created_at"),
) -> ORJSONResponse:
    filters = IssueFilters(
        state_ids=state_ids,
        priority=priority,
        assignee_ids=assignee_ids,
        label_ids=label_ids,
        search=search,
        order_by=order_by,
    )
    service = IssueService(db)
    issues, total = await service.list_for_project(project_id, filters, page, per_page)
    serialized = [IssueResponse.model_validate(_build_issue_dict(i)).model_dump(mode="json") for i in issues]
    return ORJSONResponse(content=paginated_json(data=serialized, total=total, page=page, per_page=per_page))


@router.get(
    "/issues/{issue_id}",
    summary="Get issue by ID",
)
async def get_issue(issue_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = IssueService(db)
    issue = await service.get_by_id(issue_id)
    return ORJSONResponse(content=ok_json(IssueResponse.model_validate(_build_issue_dict(issue)).model_dump(mode="json")))


@router.patch(
    "/issues/{issue_id}",
    summary="Update an issue",
)
async def update_issue(
    issue_id: UUID,
    data: IssueUpdate,
    current_user_id: CurrentUserID,
    db: DBSession,
) -> ORJSONResponse:
    service = IssueService(db)
    issue = await service.update(issue_id, data, current_user_id)
    return ORJSONResponse(content=ok_json(IssueResponse.model_validate(_build_issue_dict(issue)).model_dump(mode="json")))


@router.delete("/issues/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue(issue_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> None:
    service = IssueService(db)
    await service.delete(issue_id, current_user_id)


@router.post(
    "/issues/{issue_id}/move",
    summary="Move issue to a different state (Kanban drag)",
)
async def move_issue(
    issue_id: UUID,
    data: IssueMoveRequest,
    current_user_id: CurrentUserID,
    db: DBSession,
) -> ORJSONResponse:
    service = IssueService(db)
    update_data = IssueUpdate(state_id=data.state_id, sort_order=data.sort_order)
    issue = await service.update(issue_id, update_data, current_user_id)
    return ORJSONResponse(content=ok_json(IssueResponse.model_validate(_build_issue_dict(issue)).model_dump(mode="json")))


# ─── Comments ──────────────────────────────────────────────────────────────────


@router.get(
    "/issues/{issue_id}/comments",
)
async def list_comments(issue_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = IssueService(db)
    comments = await service.get_comments(issue_id)
    serialized = [CommentResponse.model_validate(_build_comment_dict(c)).model_dump(mode="json") for c in comments]
    return ORJSONResponse(content=ok_json(serialized))


@router.post(
    "/issues/{issue_id}/comments",
    status_code=status.HTTP_201_CREATED,
)
async def add_comment(issue_id: UUID, data: CommentCreate, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = IssueService(db)
    comment = await service.add_comment(issue_id, data, current_user_id)
    return ORJSONResponse(content=ok_json(CommentResponse.model_validate(_build_comment_dict(comment)).model_dump(mode="json")), status_code=status.HTTP_201_CREATED)


@router.patch("/comments/{comment_id}")
async def update_comment(comment_id: UUID, data: CommentUpdate, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = IssueService(db)
    comment = await service.update_comment(comment_id, data, current_user_id)
    return ORJSONResponse(content=ok_json(CommentResponse.model_validate(_build_comment_dict(comment)).model_dump(mode="json")))


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(comment_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> None:
    service = IssueService(db)
    await service.delete_comment(comment_id)


# ─── Activities ────────────────────────────────────────────────────────────────


@router.get(
    "/issues/{issue_id}/activities",
)
async def get_activities(issue_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = IssueService(db)
    activities = await service.get_activities(issue_id)
    serialized = [ActivityResponse.model_validate(a).model_dump(mode="json") for a in activities]
    return ORJSONResponse(content=ok_json(serialized))


# ─── Attachments ───────────────────────────────────────────────────────────────


@router.post(
    "/issues/{issue_id}/attachments/upload-url",
    status_code=status.HTTP_201_CREATED,
    summary="Get presigned URL for direct file upload",
)
async def get_upload_url(issue_id: UUID, data: AttachmentUploadRequest, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = IssueService(db)
    result = await service.initiate_upload(issue_id, data, current_user_id)
    return ORJSONResponse(content=ok_json(result.model_dump(mode="json")), status_code=status.HTTP_201_CREATED)


@router.get(
    "/issues/{issue_id}/attachments",
)
async def list_attachments(issue_id: UUID, current_user_id: CurrentUserID, db: DBSession) -> ORJSONResponse:
    service = IssueService(db)
    attachments = await service.get_attachments(issue_id)
    from src.infrastructure.storage.minio import StorageService

    storage = StorageService()
    result = []
    for a in attachments:
        result.append(
            AttachmentResponse(
                id=a.id,
                issue_id=a.issue_id,
                file_name=a.file_name,
                file_size=a.file_size,
                content_type=a.content_type,
                download_url=storage.generate_presigned_download_url(bucket=a.bucket, key=a.storage_key, filename=a.file_name),
                created_at=a.created_at.isoformat(),
            ).model_dump(mode="json")
        )
    return ORJSONResponse(content=ok_json(result))


# ─── Internal serialization helpers ───────────────────────────────────────────


def _build_issue_dict(issue: Any) -> dict[str, Any]:
    """Build a dict from an Issue ORM object suitable for IssueResponse.model_validate()."""
    assignees = []
    for link in getattr(issue, "assignees", []):
        u = link.user
        if u:
            assignees.append(
                UserSlim(
                    id=u.id,
                    display_name=u.display_name,
                    email=u.email,
                    avatar_url=u.avatar_url,
                )
            )

    labels = []
    for link in getattr(issue, "label_links", []):
        lbl = link.label
        if lbl:
            labels.append(LabelSlim(id=lbl.id, name=lbl.name, color=lbl.color))

    state = issue.state
    sub_count = len(getattr(issue, "sub_issues", []))
    attach_count = len(getattr(issue, "attachments", []))
    comment_count = len(getattr(issue, "comments", []))

    return {
        "id": issue.id,
        "workspace_id": issue.workspace_id,
        "project_id": issue.project_id,
        "sequence_id": issue.sequence_id,
        "title": issue.title,
        "description": issue.description,
        "description_html": issue.description_html,
        "priority": issue.priority,
        "state": StateSlim(id=state.id, name=state.name, color=state.color, group=state.group),
        "assignees": assignees,
        "labels": labels,
        "parent_id": issue.parent_id,
        "estimate": issue.estimate,
        "due_date": issue.due_date,
        "started_at": issue.started_at,
        "completed_at": issue.completed_at,
        "sort_order": issue.sort_order,
        "sub_issues_count": sub_count,
        "attachment_count": attach_count,
        "comment_count": comment_count,
        "created_by": str(issue.created_by) if issue.created_by else None,
        "created_at": issue.created_at.isoformat(),
        "updated_at": issue.updated_at.isoformat(),
    }


def _build_comment_dict(comment: Any) -> dict[str, Any]:
    """Build a dict from a Comment ORM object suitable for CommentResponse.model_validate()."""
    actor = None
    if hasattr(comment, "created_by") and comment.created_by:
        actor = UserSlim(id=comment.created_by, display_name="Unknown", email="")

    return {
        "id": comment.id,
        "issue_id": comment.issue_id,
        "content": comment.content,
        "content_html": comment.content_html,
        "actor": actor or UserSlim(id=UUID("00000000-0000-0000-0000-000000000000"), display_name="Unknown", email=""),
        "edited_at": comment.edited_at,
        "created_at": comment.created_at.isoformat(),
        "updated_at": comment.updated_at.isoformat(),
    }
