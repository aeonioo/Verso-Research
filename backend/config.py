import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # LLM chat (Ollama, local — requires e.g. `ollama pull qwen2.5:7b`)
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen3:1.7b")
    OLLAMA_NUM_GPU_LAYERS: int = int(os.getenv("OLLAMA_NUM_GPU_LAYERS", -1))

    # Embeddings (Ollama, local, no rate limits — requires `ollama pull nomic-embed-text`)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    EMBED_MODEL: str = os.getenv("EMBED_MODEL", "nomic-embed-text")
    EMBED_DIM: int = int(os.getenv("EMBED_DIM", 768))

    # Chunking
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", 1000))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", 200))

    # Retrieval
    TOP_K_CHUNKS: int = int(os.getenv("TOP_K_CHUNKS", 5))

    # Storage paths
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    VECTOR_STORE_DIR: str = os.getenv("VECTOR_STORE_DIR", "vector_stores")
    NOTES_DIR: str = os.getenv("NOTES_DIR", "notes")
    THREADS_DIR: str = os.getenv("THREADS_DIR", "threads")

    # CORS
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")


settings = Settings()

# ensure storage dirs exist
for path in (settings.UPLOAD_DIR, settings.VECTOR_STORE_DIR, settings.NOTES_DIR, settings.THREADS_DIR):
    os.makedirs(path, exist_ok=True)