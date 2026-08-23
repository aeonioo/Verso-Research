"""Core RAG loop: retrieve relevant chunks, build prompt, stream Ollama response.

Async generators (not sync) so routes/chat.py can stop pulling tokens the
instant a client disconnects (real cancellation, not just a hidden UI).

Fully local by default — embeddings AND generation both run through Ollama.
Web search (use_web=True, opt-in per request) is the one exception that
talks to the internet.
"""

import ollama

from config import settings
from embeddings.embedder import embed_query
from storage.vector_store import search
from rag.prompts import build_chat_system_prompt, build_smart_action_prompt
from rag.web_search import web_search

_client = ollama.AsyncClient(host=settings.OLLAMA_BASE_URL)


def retrieve_context(paper_id: str, query: str, top_k: int | None = None) -> list[dict]:
    query_embedding = embed_query(query)
    return search(paper_id, query_embedding, top_k=top_k)


def _format_context(chunks: list[dict]) -> str:
    return "\n\n".join(f"[Page {c['page']}]\n{c['text']}" for c in chunks)


def _format_web_context(results: list[dict]) -> str:
    return "\n\n".join(f"[Web: {r['title']}]({r['url']})\n{r['snippet']}" for r in results)


async def stream_chat_response(
    paper_id: str,
    message: str,
    mode: str = "research",
    history: list[dict] | None = None,
    model: str | None = None,
    use_web: bool = False,
):
    chunks = retrieve_context(paper_id, message)

    MIN_SCORE = 0.35
    if not chunks or chunks[0]["score"] < MIN_SCORE:
        yield {"type": "sources", "data": chunks}
        yield {"type": "token", "data": "I couldn't find strongly relevant content in this paper for that question — try rephrasing, or it may not be covered here."}
        yield {"type": "done", "data": None}
        return

    context = _format_context(chunks)

    web_results = []
    if use_web:
        web_results = web_search(message)
        if web_results:
            context += "\n\n---\n\nWeb search results:\n\n" + _format_web_context(web_results)

    system_prompt = build_chat_system_prompt(mode)
    user_prompt = f"Context from the paper:\n\n{context}\n\n---\n\nQuestion: {message}"

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_prompt})

    yield {"type": "sources", "data": chunks}
    if web_results:
        yield {"type": "web_sources", "data": web_results}

    stream = await _client.chat(
        model=model or settings.OLLAMA_MODEL,
        messages=messages,
        stream=True,
        options={"temperature": 0.3, "num_gpu": settings.OLLAMA_NUM_GPU_LAYERS},
    )

    async for chunk in stream:
        delta = chunk["message"]["content"]
        if delta:
            yield {"type": "token", "data": delta}

    yield {"type": "done", "data": None}


async def run_smart_action(paper_id: str, selected_text: str, action: str, model: str | None = None):
    chunks = retrieve_context(paper_id, selected_text, top_k=3)
    context = _format_context(chunks)
    prompt = build_smart_action_prompt(action, selected_text, paper_context=context)

    yield {"type": "sources", "data": chunks}

    stream = await _client.chat(
        model=model or settings.OLLAMA_MODEL,
        messages=[
            {"role": "system", "content": "You are Verso, an AI assistant helping a reader understand a research paper excerpt."},
            {"role": "user", "content": prompt},
        ],
        stream=True,
        options={"temperature": 0.3, "num_gpu": settings.OLLAMA_NUM_GPU_LAYERS},
    )

    async for chunk in stream:
        delta = chunk["message"]["content"]
        if delta:
            yield {"type": "token", "data": delta}

    yield {"type": "done", "data": None}