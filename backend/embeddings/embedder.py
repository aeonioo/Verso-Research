"""Embeddings via a local Ollama server (nomic-embed-text by default).

Fully local -> zero rate limits, zero API cost, data never leaves your
machine. nomic-embed-text requires task-specific prefixes on BOTH sides
(unlike BGE/mxbai, which only prefix the query) — "search_query: " for
queries and "search_document: " for passages — per its usage instructions.

Requires Ollama running locally with the model pulled:
    ollama pull nomic-embed-text
"""

import numpy as np
import ollama

from config import settings

_QUERY_PREFIX = "search_query: "
_DOCUMENT_PREFIX = "search_document: "

_client = ollama.Client(host=settings.OLLAMA_BASE_URL)


def embed_texts(texts: list[str], is_query: bool = False) -> np.ndarray:
    """Embed a batch of texts. Returns float32 array, shape (n, dim), L2-normalized."""
    prefix = _QUERY_PREFIX if is_query else _DOCUMENT_PREFIX
    prefixed = [prefix + t for t in texts]

    response = _client.embed(model=settings.EMBED_MODEL, input=prefixed)
    vectors = np.array(response["embeddings"], dtype="float32")

    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / norms


def embed_query(query: str) -> np.ndarray:
    """Embed a single query string (with the 'search_query:' prefix)."""
    return embed_texts([query], is_query=True)