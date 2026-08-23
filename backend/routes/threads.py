"""Deep dive threads — isolated side-conversations spawned from a highlight,
kept separate from the main chat until the user chooses to promote a message."""

import os
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from config import settings
from models.schemas import ThreadCreateRequest, ThreadPromoteRequest, TruncateThreadRequest

router = APIRouter()


def _thread_path(paper_id: str, thread_id: str) -> str:
    return os.path.join(settings.THREADS_DIR, f"{paper_id}__{thread_id}.json")


def _list_thread_files(paper_id: str) -> list[str]:
    prefix = f"{paper_id}__"
    return [
        f for f in os.listdir(settings.THREADS_DIR)
        if f.startswith(prefix) and f.endswith(".json")
    ]


def get_thread_history(paper_id: str, thread_id: str) -> list[dict]:
    """Used by routes/chat.py to fetch prior messages for context."""
    path = _thread_path(paper_id, thread_id)
    if not os.path.exists(path):
        return []
    with open(path) as f:
        thread = json.load(f)
    return thread.get("messages", [])


def append_message(paper_id: str, thread_id: str, role: str, content: str) -> None:
    """Used by routes/chat.py to persist each turn. Auto-creates the thread
    file if missing (covers the reserved 'main' chat thread)."""
    path = _thread_path(paper_id, thread_id)
    if not os.path.exists(path):
        thread = {
            "thread_id": thread_id,
            "paper_id": paper_id,
            "title": "Main chat" if thread_id == "main" else "New thread",
            "seed_text": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "messages": [],
        }
        with open(path, "w") as f:
            json.dump(thread, f)

    with open(path) as f:
        thread = json.load(f)

    thread["messages"].append({
        "message_id": str(uuid.uuid4()),
        "role": role,
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    with open(path, "w") as f:
        json.dump(thread, f)


@router.post("/threads")
def create_thread(req: ThreadCreateRequest):
    thread_id = str(uuid.uuid4())
    thread = {
        "thread_id": thread_id,
        "paper_id": req.paper_id,
        "title": req.title or (req.seed_text[:60] if req.seed_text else "New thread"),
        "seed_text": req.seed_text,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "messages": [],
    }
    with open(_thread_path(req.paper_id, thread_id), "w") as f:
        json.dump(thread, f)

    return thread


@router.get("/threads/{paper_id}")
def list_threads(paper_id: str):
    threads = []
    for filename in _list_thread_files(paper_id):
        with open(os.path.join(settings.THREADS_DIR, filename)) as f:
            thread = json.load(f)
        threads.append({
            "thread_id": thread["thread_id"],
            "title": thread["title"],
            "seed_text": thread.get("seed_text"),
            "created_at": thread["created_at"],
            "message_count": len(thread.get("messages", [])),
        })
    return sorted(threads, key=lambda t: t["created_at"], reverse=True)


@router.get("/threads/{paper_id}/{thread_id}")
def get_thread(paper_id: str, thread_id: str):
    path = _thread_path(paper_id, thread_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Thread not found")
    with open(path) as f:
        return json.load(f)


@router.delete("/threads/{paper_id}/{thread_id}")
def delete_thread(paper_id: str, thread_id: str):
    path = _thread_path(paper_id, thread_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Thread not found")
    os.remove(path)
    return {"status": "deleted"}


@router.post("/threads/promote")
def promote_message(req: ThreadPromoteRequest):
    """Copy a message from a deep-dive thread into the main chat history."""
    path = _thread_path(req.paper_id, req.thread_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Thread not found")

    with open(path) as f:
        thread = json.load(f)

    message = next((m for m in thread["messages"] if m["message_id"] == req.message_id), None)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found in thread")

    # main chat is just thread_id=None -> stored under a reserved "main" thread id
    append_message(req.paper_id, "main", "assistant", message["content"])
    return {"status": "promoted"}


@router.post("/threads/{paper_id}/{thread_id}/truncate")
def truncate_thread(paper_id: str, thread_id: str, req: TruncateThreadRequest):
    """Drop all persisted messages from keep_count onward — used when the
    user edits a past message, so regenerating doesn't see the stale tail."""
    path = _thread_path(paper_id, thread_id)
    if not os.path.exists(path):
        return {"status": "no-op", "remaining": 0}  # nothing persisted yet, fine

    with open(path) as f:
        thread = json.load(f)

    thread["messages"] = thread["messages"][: req.keep_count]

    with open(path, "w") as f:
        json.dump(thread, f)

    return {"status": "truncated", "remaining": len(thread["messages"])}