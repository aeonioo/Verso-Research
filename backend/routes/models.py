"""GET /models — lists locally installed Ollama chat models, for the frontend selector."""

import ollama

from fastapi import APIRouter
from config import settings

router = APIRouter()
_client = ollama.Client(host=settings.OLLAMA_BASE_URL)


@router.get("/models")
def list_models():
    try:
        result = _client.list()
        raw = result.get("models") if isinstance(result, dict) else getattr(result, "models", [])
        names = []
        for m in raw:
            name = m.get("model") if isinstance(m, dict) else getattr(m, "model", None)
            if not name:
                continue
            # exclude embedding-only models (e.g. nomic-embed-text) — not chat-capable
            if "embed" in name.lower() or name == settings.EMBED_MODEL:
                continue
            names.append(name)
    except Exception:
        names = []

    return {"models": names, "default": settings.OLLAMA_MODEL}