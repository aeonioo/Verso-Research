"""POST /upload — accepts a PDF, extracts/chunks/embeds/indexes it."""

import os
import uuid
import shutil

from fastapi import APIRouter, UploadFile, File, HTTPException

from config import settings
from document.processor import extract_text
from document.chunker import chunk_pages
from embeddings.embedder import embed_texts
from storage.vector_store import build_index
from models.schemas import UploadResponse

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_paper(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    paper_id = str(uuid.uuid4())
    save_path = os.path.join(settings.UPLOAD_DIR, f"{paper_id}.pdf")

    # save uploaded file to disk
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        pages = extract_text(save_path)
        if not pages:
            raise HTTPException(status_code=422, detail="Could not extract any text from this PDF.")

        chunks = chunk_pages(pages)
        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)

        build_index(paper_id, chunks, embeddings)

    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Indexing failed: {e}")

    return UploadResponse(
        paper_id=paper_id,
        filename=file.filename,
        num_pages=len(pages),
        num_chunks=len(chunks),
    )