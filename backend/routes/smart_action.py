"""POST /smart-action — SSE-streamed response for text-selection actions
(Explain Simply/Math, Derive, Intuition, Analogy)."""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.schemas import SmartActionRequest
from rag.pipeline import run_smart_action

router = APIRouter()


def _sse_format(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@router.post("/smart-action")
async def smart_action(req: SmartActionRequest):
    def event_stream():
        for event in run_smart_action(req.paper_id, req.selected_text, req.action, model=req.model):
            yield _sse_format(event)

    return StreamingResponse(event_stream(), media_type="text/event-stream")