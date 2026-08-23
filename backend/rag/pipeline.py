"""Core RAG loop: retrieve relevant chunks, build prompt, stream Ollama response.

Fully local — embeddings AND generation both run through Ollama, zero cloud
dependency, zero API keys, zero rate limits.
"""

import ollama

from config import settings
from embeddings.embedder import embed_query
from storage.vector_store import search
from rag.prompts import build_chat_system_prompt, build_smart_action_prompt

_client = ollama.Client(host=settings.OLLAMA_BASE_URL)


def retrieve_context(paper_id: str, query: str, top_k: int | None = None) -> list[dict]:
    """Embed the query and fetch the top-k most relevant chunks for this paper."""
    query_embedding = embed_query(query)
    return search(paper_id, query_embedding, top_k=top_k)


def _format_context(chunks: list[dict]) -> str:
    return "\n\n".join(
        f"[Page {c['page']}]\n{c['text']}" for c in chunks
    )


def stream_chat_response(
    paper_id: str,
    message: str,
    mode: str = "research",
    history: list[dict] | None = None,
    model: str | None = None,
):
    """
    Retrieve context, build messages, stream the Ollama completion.

    Yields raw text deltas as they arrive. Caller (routes/chat.py) is
    responsible for SSE formatting.

    Also returns the retrieved sources via the first yielded item being a
    dict marker — simpler: caller should call retrieve_context separately
    if it needs sources before streaming starts. Here we retrieve first,
    then yield source info as the FIRST item, followed by text chunks.
    """
    chunks = retrieve_context(paper_id, message)

    MIN_SCORE = 0.35  # cosine similarity threshold
    if not chunks or chunks[0]["score"] < MIN_SCORE:
        yield {"type": "sources", "data": chunks}
        yield {"type": "token", "data": "I couldn't find strongly relevant content in this paper for that question — try rephrasing, or it may not be covered here."}
        yield {"type": "done", "data": None}
        return

    context = _format_context(chunks)

    system_prompt = build_chat_system_prompt(mode)
    user_prompt = (
        f"Context from the paper:\n\n{context}\n\n"
        f"---\n\nQuestion: {message}"
    )

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_prompt})

    # first yield: sources, so the frontend can render "sources used" immediately
    yield {"type": "sources", "data": chunks}

    stream = _client.chat(
        model=model or settings.OLLAMA_MODEL,
        messages=messages,
        stream=True,
        options={"temperature": 0.3, "num_gpu": settings.OLLAMA_NUM_GPU_LAYERS},
    )

    for chunk in stream:
        delta = chunk["message"]["content"]
        if delta:
            yield {"type": "token", "data": delta}

    yield {"type": "done", "data": None}


def run_smart_action(paper_id: str, selected_text: str, action: str, model: str | None = None):
    """Same streaming pattern, but for text-selection smart actions (Explain/Derive/etc)."""
    # pull a bit of surrounding paper context for grounding
    chunks = retrieve_context(paper_id, selected_text, top_k=3)
    context = _format_context(chunks)

    prompt = build_smart_action_prompt(action, selected_text, paper_context=context)

    yield {"type": "sources", "data": chunks}

    stream = _client.chat(
        model=model or settings.OLLAMA_MODEL,
        messages=[
            {"role": "system", "content": "You are Verso, an AI assistant helping a reader understand a research paper excerpt."},
            {"role": "user", "content": prompt},
        ],
        stream=True,
        options={"temperature": 0.3, "num_gpu": settings.OLLAMA_NUM_GPU_LAYERS},
    )

    for chunk in stream:
        delta = chunk["message"]["content"]
        if delta:
            yield {"type": "token", "data": delta}

    yield {"type": "done", "data": None}