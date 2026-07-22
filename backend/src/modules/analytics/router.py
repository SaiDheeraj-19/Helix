"""Helix — Analytics Module: Router"""
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import SuccessResponse, ok
from src.modules.issues.models import Issue
from src.modules.projects.models import IssueState

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/projects/{project_id}/overview", response_model=SuccessResponse[dict])
async def project_overview(project_id: UUID, current_user_id: CurrentUserID, db: DBSession):
    """Total issues, by-state breakdown, by-priority breakdown."""
    # All issues in project
    issues_result = await db.execute(
        select(Issue).where(Issue.project_id == project_id, Issue.deleted_at.is_(None))
    )
    issues = issues_result.scalars().all()

    # States map
    states_result = await db.execute(
        select(IssueState).where(IssueState.project_id == project_id)
    )
    states = {str(s.id): s for s in states_result.scalars().all()}

    # By-state
    by_state: dict[str, int] = {}
    by_group: dict[str, int] = {"backlog": 0, "unstarted": 0, "started": 0, "completed": 0, "cancelled": 0}
    by_priority: dict[str, int] = {"urgent": 0, "high": 0, "medium": 0, "low": 0, "none": 0}

    for issue in issues:
        state = states.get(str(issue.state_id))
        state_name = state.name if state else "Unknown"
        by_state[state_name] = by_state.get(state_name, 0) + 1
        if state:
            by_group[state.group] = by_group.get(state.group, 0) + 1
        by_priority[issue.priority] = by_priority.get(issue.priority, 0) + 1

    return ok({
        "total": len(issues),
        "by_state": [{"name": k, "count": v} for k, v in by_state.items()],
        "by_group": [{"name": k, "count": v} for k, v in by_group.items()],
        "by_priority": [
            {"name": k, "count": v, "color": _priority_color(k)}
            for k, v in by_priority.items()
        ],
        "open_count": by_group.get("backlog", 0) + by_group.get("unstarted", 0) + by_group.get("started", 0),
        "completed_count": by_group.get("completed", 0),
        "overdue_count": sum(
            1 for i in issues
            if i.due_date and i.due_date < datetime.now(tz=UTC).date()
            and str(states.get(str(i.state_id), IssueState()).group or "") not in ("completed", "cancelled")
        ),
    })


@router.get("/projects/{project_id}/velocity", response_model=SuccessResponse[list])
async def velocity(
    project_id: UUID,
    current_user_id: CurrentUserID,
    db: DBSession,
    weeks: int = Query(8, ge=2, le=26),
):
    """Issues completed per week for the last N weeks."""
    now = datetime.now(tz=UTC)
    data = []

    for week_offset in range(weeks - 1, -1, -1):
        week_start = now - timedelta(weeks=week_offset + 1)
        week_end = now - timedelta(weeks=week_offset)

        result = await db.execute(
            select(func.count()).where(
                Issue.project_id == project_id,
                Issue.completed_at.isnot(None),
                Issue.completed_at >= week_start,
                Issue.completed_at < week_end,
                Issue.deleted_at.is_(None),
            )
        )
        count = result.scalar_one()
        data.append({
            "week": week_start.strftime("W%W"),
            "date": week_start.strftime("%b %d"),
            "completed": count,
        })

    return ok(data)


@router.get("/projects/{project_id}/assignee-workload", response_model=SuccessResponse[list])
async def assignee_workload(project_id: UUID, current_user_id: CurrentUserID, db: DBSession):
    """Count of open issues per assignee."""
    from src.modules.issues.models import IssueAssignee
    from src.modules.users.models import User

    result = await db.execute(
        select(User.display_name, User.avatar_url, func.count(IssueAssignee.issue_id).label("count"))
        .join(IssueAssignee, IssueAssignee.user_id == User.id)
        .join(Issue, Issue.id == IssueAssignee.issue_id)
        .where(Issue.project_id == project_id, Issue.deleted_at.is_(None))
        .group_by(User.id, User.display_name, User.avatar_url)
        .order_by(func.count(IssueAssignee.issue_id).desc())
        .limit(15)
    )
    rows = result.all()
    return ok([{"name": r.display_name, "avatar_url": r.avatar_url, "count": r.count} for r in rows])


def _priority_color(p: str) -> str:
    return {"urgent": "#ef4444", "high": "#f97316", "medium": "#eab308", "low": "#3b82f6", "none": "#6b7280"}.get(p, "#6b7280")
