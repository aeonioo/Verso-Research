"""Notes CRUD endpoints."""

from fastapi import APIRouter, HTTPException

from models.schemas import NoteCreateRequest
from storage import notes_store

router = APIRouter()


@router.post("/notes")
def create_note(req: NoteCreateRequest):
    return notes_store.create_note(req.paper_id, req.text, req.source_page, req.tag)


@router.get("/notes/{paper_id}")
def list_notes(paper_id: str):
    return notes_store.list_notes(paper_id)


@router.delete("/notes/{paper_id}/{note_id}")
def delete_note(paper_id: str, note_id: str):
    deleted = notes_store.delete_note(paper_id, note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"status": "deleted"}