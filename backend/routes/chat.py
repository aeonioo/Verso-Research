"""POST /chat — SSE-streamed RAG chat, scoped to a paper and optionally a thread.

Checks for client disconnect every loop iteration so a frontend "Stop" click
actually halts token generation, not just hides it in the UI. The partial
response generated before a stop is still saved to thread history.
"""

import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest
from rag.pipeline import stream_chat_response
from routes.threads import get_thread_history, append_message

router = APIRouter()


def _sse_format(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@router.post("/chat")
async def chat(req: ChatRequest, request: Request):
    thread_id = req.thread_id or "main"
    history = get_thread_history(req.paper_id, thread_id)
    trimmed_history = [{"role": m["role"], "content": m["content"]} for m in history]

    async def event_stream():
        full_response = ""
        append_message(req.paper_id, thread_id, "user", req.message)

        async for event in stream_chat_response(
            paper_id=req.paper_id,
            message=req.message,
            mode=req.mode,
            history=trimmed_history,
            model=req.model,
            use_web=req.use_web,
        ):
            if await request.is_disconnected():
                break
            if event["type"] == "token":
                full_response += event["data"]
            yield _sse_format(event)

        if full_response:
            append_message(req.paper_id, thread_id, "assistant", full_response)

    return StreamingResponse(event_stream(), media_type="text/event-stream")