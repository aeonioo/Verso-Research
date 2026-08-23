from pydantic import BaseModel


class UploadResponse(BaseModel):
    paper_id: str
    filename: str
    num_pages: int
    num_chunks: int
    status: str = "indexed"


class ChatRequest(BaseModel):
    paper_id: str
    message: str
    mode: str = "research"  # "eli5" | "exam" | "research"
    thread_id: str | None = None  # None = main chat
    model: str | None = None  # None = use server default (OLLAMA_MODEL)


class SourceChunk(BaseModel):
    page: int
    text: str
    score: float


class SmartActionRequest(BaseModel):
    paper_id: str
    selected_text: str
    action: str  # "explain_simply" | "explain_math" | "derive" | "intuition" | "analogy" | "deep_dive"
    thread_id: str | None = None
    model: str | None = None


class ThreadCreateRequest(BaseModel):
    paper_id: str
    seed_text: str | None = None  # e.g. the highlighted text that spawned this thread
    title: str | None = None


class ThreadPromoteRequest(BaseModel):
    paper_id: str
    thread_id: str
    message_id: str


class NoteCreateRequest(BaseModel):
    paper_id: str
    text: str
    source_page: int | None = None
    tag: str | None = None


class NoteResponse(BaseModel):
    note_id: str
    paper_id: str
    text: str
    source_page: int | None
    tag: str | None
    created_at: str