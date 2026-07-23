"""
Helix — Sticky Notes API Router
"""

import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload

from src.api.dependencies import CurrentUserID, DBSession
from src.core.exceptions import NotFoundError
from src.infrastructure.realtime.redis_pubsub import publish_event
from src.modules.projects.models import Project, StickyNote

router = APIRouter(tags=["Notes"])


class StickyNoteCreate(BaseModel):
    content: str
    color: Optional[str] = "#FEF3C7"
    position_x: float = 0
    position_y: float = 0
    z_index: int = 1


class StickyNoteUpdate(BaseModel):
    content: Optional[str] = None
    color: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    z_index: Optional[int] = None


class StickyNoteResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    content: str
    color: str
    position_x: float
    position_y: float
    z_index: int
    created_by: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


@router.get("/projects/{project_id}/notes", response_model=list[StickyNoteResponse])
async def list_notes(
    project_id: uuid.UUID,
    db: DBSession,
    user_id: CurrentUserID,
) -> Any:
    result = await db.execute(select(StickyNote).where(StickyNote.project_id == project_id))
    return list(result.scalars().all())


@router.post("/projects/{project_id}/notes", response_model=StickyNoteResponse)
async def create_note(
    project_id: uuid.UUID,
    data: StickyNoteCreate,
    db: DBSession,
    user_id: CurrentUserID,
) -> Any:
    note = StickyNote(
        project_id=project_id,
        content=data.content,
        color=data.color,
        position_x=data.position_x,
        position_y=data.position_y,
        z_index=data.z_index,
        created_by=user_id,
        updated_by=user_id,
    )
    db.add(note)
    await db.flush()

    # Real-time event
    await publish_event(
        room_id=str(project_id),
        event_type="note.created",
        data={"id": str(note.id)},
        exclude_user=str(user_id),
    )

    return note


@router.patch("/notes/{note_id}", response_model=StickyNoteResponse)
async def update_note(
    note_id: uuid.UUID,
    data: StickyNoteUpdate,
    db: DBSession,
    user_id: CurrentUserID,
) -> Any:
    result = await db.execute(select(StickyNote).where(StickyNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise NotFoundError("StickyNote", str(note_id))

    updates = data.model_dump(exclude_none=True)
    if updates:
        updates["updated_by"] = user_id
        await db.execute(update(StickyNote).where(StickyNote.id == note_id).values(**updates))
        await db.flush()

        # Real-time event
        payload = {"id": str(note.id)}
        payload.update(updates)
        
        await publish_event(
            room_id=str(note.project_id),
            event_type="note.updated",
            data=payload,
            exclude_user=str(user_id),
        )

    await db.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(
    note_id: uuid.UUID,
    db: DBSession,
    user_id: CurrentUserID,
) -> Any:
    result = await db.execute(select(StickyNote).where(StickyNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise NotFoundError("StickyNote", str(note_id))

    project_id_str = str(note.project_id)
    await db.execute(delete(StickyNote).where(StickyNote.id == note_id))
    await db.flush()

    # Real-time event
    await publish_event(
        room_id=project_id_str,
        event_type="note.deleted",
        data={"id": str(note_id)},
        exclude_user=str(user_id),
    )
