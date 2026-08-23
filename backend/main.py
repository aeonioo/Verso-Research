"""Verso backend entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes import upload, chat, threads, notes, smart_action, models

app = FastAPI(title="Verso API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, tags=["upload"])
app.include_router(chat.router, tags=["chat"])
app.include_router(threads.router, tags=["threads"])
app.include_router(notes.router, tags=["notes"])
app.include_router(smart_action.router, tags=["smart-action"])
app.include_router(models.router, tags=["models"])


@app.get("/health")
def health():
    return {"status": "ok"}

# testing
# curl.exe -X POST http://localhost:8000/upload -F "file=@D:/Coding/Personal/Learning/GenAI/Projects/verso/docu.pdf"
# curl.exe -N -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d "@test_chat.json"