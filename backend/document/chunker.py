"""Sliding window chunker — splits page text into overlapping chunks for embedding."""

from config import settings


def chunk_pages(pages: list[dict]) -> list[dict]:
    """
    Turn extracted pages into overlapping chunks, tagged with source page number.

    Args:
        pages: [{"page": 1, "text": "..."}, ...]

    Returns:
        [{"chunk_id": 0, "page": 1, "text": "..."}, ...]
    """
    chunk_size = settings.CHUNK_SIZE
    overlap = settings.CHUNK_OVERLAP

    chunks = []
    chunk_id = 0

    for page in pages:
        text = page["text"]
        start = 0

        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append({
                    "chunk_id": chunk_id,
                    "page": page["page"],
                    "text": chunk_text,
                })
                chunk_id += 1

            if end >= len(text):
                break
            start = end - overlap  # slide window back by overlap

    return chunks