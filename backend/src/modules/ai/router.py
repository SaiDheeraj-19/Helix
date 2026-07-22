"""Helix — AI Module: Router
Integrates Ollama (primary) + Groq (fallback) for AI-native features.
Streams responses via Server-Sent Events (SSE).
"""
from __future__ import annotations
import json
from uuid import UUID
from typing import AsyncIterator
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.core.dependencies import CurrentUserID, DBSession
from src.core.response import SuccessResponse, ok
from src.core.config import settings

router = APIRouter(prefix="/ai", tags=["AI"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str = "llama3.2"
    stream: bool = True


class IssueGenerateRequest(BaseModel):
    description: str
    project_id: str
    count: int = 5


# ── Client helpers ─────────────────────────────────────────────────────────────

async def _ollama_stream(messages: list[dict], model: str) -> AsyncIterator[str]:
    """Stream from local Ollama instance."""
    import httpx
    payload = {"model": model, "messages": messages, "stream": True}
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", url, json=payload) as resp:
            async for line in resp.aiter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield f"data: {json.dumps({'content': content})}\n\n"
                        if data.get("done"):
                            yield "data: [DONE]\n\n"
                    except json.JSONDecodeError:
                        continue


async def _groq_stream(messages: list[dict], model: str) -> AsyncIterator[str]:
    """Stream from Groq API as fallback."""
    import httpx
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": messages, "stream": True}
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream(
            "POST", "https://api.groq.com/openai/v1/chat/completions",
            headers=headers, json=payload
        ) as resp:
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    raw = line[6:]
                    if raw == "[DONE]":
                        yield "data: [DONE]\n\n"
                    else:
                        try:
                            chunk = json.loads(raw)
                            content = chunk["choices"][0]["delta"].get("content", "")
                            if content:
                                yield f"data: {json.dumps({'content': content})}\n\n"
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue


async def _complete_text(prompt: str, system: str = "") -> str:
    """Non-streaming completion using Ollama, fallback to Groq."""
    import httpx
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    # Try Ollama first
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={"model": "llama3.2", "messages": messages, "stream": False},
            )
            resp.raise_for_status()
            return resp.json()["message"]["content"]
    except Exception:
        pass  # Fallback to Groq

    # Groq fallback
    try:
        headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json={"model": "llama3-8b-8192", "messages": messages},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {e}")


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/chat", summary="Streaming AI chat (SSE)")
async def chat(request: ChatRequest, current_user_id: CurrentUserID):
    """
    Main AI chat endpoint.
    Returns a Server-Sent Events stream when stream=True.
    """
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    # Inject Helix system prompt
    system_msg = {
        "role": "system",
        "content": (
            "You are Helix AI, an expert project management assistant embedded in the Helix platform. "
            "You help teams plan work, write issue descriptions, break down features into tasks, "
            "suggest priorities, and analyze project health. Be concise and actionable."
        ),
    }
    messages = [system_msg] + messages

    if not request.stream:
        content = await _complete_text(messages[-1]["content"])
        return ok({"content": content})

    async def event_stream():
        try:
            async for chunk in _ollama_stream(messages, request.model):
                yield chunk
        except Exception:
            # Fallback to Groq
            try:
                async for chunk in _groq_stream(messages, "llama3-8b-8192"):
                    yield chunk
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/issues/{issue_id}/summarize", response_model=SuccessResponse[dict])
async def summarize_issue(issue_id: UUID, current_user_id: CurrentUserID, db: DBSession):
    """Generate a concise summary of an issue including its comments."""
    from src.modules.issues.models import Issue, Comment

    result = await db.execute(
        select(Issue)
        .where(Issue.id == issue_id)
        .options(selectinload(Issue.comments))
    )
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    comments_text = "\n".join(
        f"- {c.content}" for c in getattr(issue, "comments", [])
    ) or "No comments."

    prompt = (
        f"Summarize this project issue in 2-3 sentences:\n\n"
        f"**Title:** {issue.title}\n"
        f"**Description:** {issue.description or 'No description.'}\n"
        f"**Priority:** {issue.priority}\n"
        f"**Comments:**\n{comments_text}\n\n"
        "Provide a clear, actionable summary."
    )

    summary = await _complete_text(prompt)
    return ok({"summary": summary, "issue_id": str(issue_id)})


@router.post("/issues/generate", response_model=SuccessResponse[list])
async def generate_issues(request: IssueGenerateRequest, current_user_id: CurrentUserID):
    """
    Generate a list of actionable issues from a natural language feature description.
    """
    prompt = (
        f"Break down this feature into {request.count} concrete, actionable issues for a software project.\n\n"
        f"Feature: {request.description}\n\n"
        "Return ONLY a JSON array with this structure:\n"
        '[{"title": "...", "description": "...", "priority": "medium"}]\n'
        "Priority must be one of: urgent, high, medium, low.\n"
        "Be specific. No explanations outside the JSON."
    )

    raw = await _complete_text(prompt)

    # Parse JSON from response
    import re
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        raise HTTPException(status_code=422, detail="AI returned malformed response. Try rephrasing.")

    try:
        issues = json.loads(match.group())
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Could not parse AI response as JSON.")

    return ok(issues)


@router.post("/issues/{issue_id}/suggest-labels", response_model=SuccessResponse[list])
async def suggest_labels(issue_id: UUID, current_user_id: CurrentUserID, db: DBSession):
    """Suggest labels for an issue based on its title and description."""
    from src.modules.issues.models import Issue
    from src.modules.projects.models import Label

    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Get project labels to suggest from
    labels_result = await db.execute(
        select(Label).where(Label.project_id == issue.project_id)
    )
    labels = labels_result.scalars().all()
    label_names = [l.name for l in labels]

    if not label_names:
        return ok([])

    prompt = (
        f"Given these available labels: {', '.join(label_names)}\n\n"
        f"Issue title: {issue.title}\n"
        f"Issue description: {issue.description or 'No description'}\n\n"
        "Return ONLY a JSON array of label names that are most relevant (max 3).\n"
        'Example: ["bug", "frontend"]\n'
        "Only choose from the provided labels list."
    )

    raw = await _complete_text(prompt)
    match = __import__("re").search(r"\[.*?\]", raw, __import__("re").DOTALL)
    if not match:
        return ok([])

    try:
        suggested = json.loads(match.group())
        # Validate against real labels
        valid = [l for l in suggested if l in label_names]
        return ok(valid[:3])
    except json.JSONDecodeError:
        return ok([])
