"""PDF text extraction using PyMuPDF (fitz)."""

import fitz  # PyMuPDF


def extract_text(pdf_path: str) -> list[dict]:
    """
    Extract text from a PDF, page by page.

    Returns:
        List of dicts: [{"page": 1, "text": "..."}, ...]
    """
    doc = fitz.open(pdf_path)
    pages = []

    for i, page in enumerate(doc):
        text = page.get_text("text").strip()
        if text:
            pages.append({"page": i + 1, "text": text})

    doc.close()
    return pages


def extract_full_text(pdf_path: str) -> str:
    """Concatenate all page text into a single string (used for summaries)."""
    pages = extract_text(pdf_path)
    return "\n\n".join(p["text"] for p in pages)