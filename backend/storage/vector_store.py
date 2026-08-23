"""FAISS-backed vector store, one index per paper (paper_id)."""

import os
import json
import faiss
import numpy as np

from config import settings


def _index_path(paper_id: str) -> str:
    return os.path.join(settings.VECTOR_STORE_DIR, f"{paper_id}.index")


def _meta_path(paper_id: str) -> str:
    return os.path.join(settings.VECTOR_STORE_DIR, f"{paper_id}_meta.json")


def build_index(paper_id: str, chunks: list[dict], embeddings: np.ndarray) -> None:
    """
    Build and persist a FAISS index for a paper.

    Args:
        paper_id: unique id for the paper
        chunks: [{"chunk_id":..., "page":..., "text":...}, ...]
        embeddings: (n, dim) float32, L2-normalized
    """
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # inner product == cosine sim since vectors are normalized
    index.add(embeddings)

    faiss.write_index(index, _index_path(paper_id))

    with open(_meta_path(paper_id), "w") as f:
        json.dump(chunks, f)


def load_index(paper_id: str) -> tuple[faiss.Index, list[dict]]:
    """Load a paper's FAISS index + chunk metadata."""
    index_path = _index_path(paper_id)
    meta_path = _meta_path(paper_id)

    if not os.path.exists(index_path) or not os.path.exists(meta_path):
        raise FileNotFoundError(f"No index found for paper_id={paper_id}")

    index = faiss.read_index(index_path)
    with open(meta_path) as f:
        chunks = json.load(f)

    return index, chunks


def search(paper_id: str, query_embedding: np.ndarray, top_k: int | None = None) -> list[dict]:
    """
    Search a paper's index for the most relevant chunks.

    Returns chunks (with page/text) sorted by relevance, each tagged with a score.
    """
    top_k = top_k or settings.TOP_K_CHUNKS
    index, chunks = load_index(paper_id)

    scores, indices = index.search(query_embedding, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue
        chunk = dict(chunks[idx])
        chunk["score"] = float(score)
        results.append(chunk)

    return results


def index_exists(paper_id: str) -> bool:
    return os.path.exists(_index_path(paper_id))