"""Notes persistence — one JSON file per paper, list of note objects."""

import os
import json
import uuid
from datetime import datetime, timezone

from config import settings


def _notes_path(paper_id: str) -> str:
    return os.path.join(settings.NOTES_DIR, f"{paper_id}.json")


def _load(paper_id: str) -> list[dict]:
    path = _notes_path(paper_id)
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return json.load(f)


def _save(paper_id: str, notes: list[dict]) -> None:
    with open(_notes_path(paper_id), "w") as f:
        json.dump(notes, f)


def create_note(paper_id: str, text: str, source_page: int | None, tag: str | None) -> dict:
    notes = _load(paper_id)
    note = {
        "note_id": str(uuid.uuid4()),
        "paper_id": paper_id,
        "text": text,
        "source_page": source_page,
        "tag": tag,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    notes.append(note)
    _save(paper_id, notes)
    return note


def list_notes(paper_id: str) -> list[dict]:
    return sorted(_load(paper_id), key=lambda n: n["created_at"], reverse=True)


def delete_note(paper_id: str, note_id: str) -> bool:
    notes = _load(paper_id)
    filtered = [n for n in notes if n["note_id"] != note_id]
    if len(filtered) == len(notes):
        return False  # nothing removed
    _save(paper_id, filtered)
    return True