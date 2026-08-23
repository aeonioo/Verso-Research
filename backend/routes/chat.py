"""POST /chat — SSE-streamed RAG chat, scoped to a paper and optionally a thread."""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest
from rag.pipeline import stream_chat_response
from routes.threads import get_thread_history, append_message

router = APIRouter()


def _sse_format(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@router.post("/chat")
async def chat(req: ChatRequest):
    thread_id = req.thread_id or "main"
    history = get_thread_history(req.paper_id, thread_id)

    # Ollama expects plain {role, content} — strip our extra persisted fields
    trimmed_history = [{"role": m["role"], "content": m["content"]} for m in history]

    def event_stream():
        full_response = ""

        # persist the user's message first
        append_message(req.paper_id, thread_id, "user", req.message)

        for event in stream_chat_response(
            paper_id=req.paper_id,
            message=req.message,
            mode=req.mode,
            history=trimmed_history,
            model=req.model,
        ):
            if event["type"] == "token":
                full_response += event["data"]
            yield _sse_format(event)

        # persist the full assistant reply once streaming finishes
        if full_response:
            append_message(req.paper_id, thread_id, "assistant", full_response)

    return StreamingResponse(event_stream(), media_type="text/event-stream")