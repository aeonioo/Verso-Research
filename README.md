# Verso

A local-first RAG research paper reader. Upload a PDF, chat with it, get math explained, and dive deep into concepts, entirely offline.

## Features

- **Chat with any paper** - ask questions, get answers grounded in the actual PDF content with page citations
- **Three modes** - ELI5, Exam prep, and Research-depth explanations
- **Smart actions** - select any text to Explain Simply, Explain Mathematically, Derive, get Intuition, or an Analogy
- **Deep dive threads** - spin off isolated side-conversations from a highlight without cluttering the main chat
- **Notes** - save any AI response as a note, tied to its source page
- **Markdown + LaTeX rendering** - formatted answers with properly rendered equations
- **Model picker** - swap between any locally installed Ollama model on the fly
- **100% local** - embeddings and chat generation both run through Ollama. No API keys, no rate limits, no data leaving your machine

## Stack

- **Backend:** FastAPI, FAISS, Ollama (`nomic-embed-text` for embeddings, any Ollama chat model for generation), managed with [uv](https://docs.astral.sh/uv/)
- **Frontend:** React, Vite, Zustand, react-pdf, react-markdown + KaTeX

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) installed and running

### 1. Pull the models
```bash
ollama pull nomic-embed-text
ollama pull qwen3:1.7b
```

### 2. First-time setup

```bash
cd backend
uv sync                     # installs deps from pyproject.toml / uv.lock
cp ../.env.example .env     # then fill in your values
cd ../frontend
npm install
```

### 3. Run it

**Windows:** just double-click `start_verso.bat` in the project root, it activates the venv, starts the backend and frontend in their own windows, and opens `http://localhost:5173` in your browser automatically.

**macOS/Linux / manual start:**
```bash
# terminal 1
cd backend
uv run uvicorn main:app --reload --port 8000

# terminal 2
cd frontend
npm run dev
```

Then open `http://localhost:5173`, drop in a PDF, and start chatting.

## Configuration

Key `.env` values (see `.env.example`):

| Variable | Default | Notes |
|---|---|---|
| `OLLAMA_MODEL` | `qwen3:1.7b` | Chat model — swap for `qwen2.5:7b` etc. if your hardware allows |
| `EMBED_MODEL` | `nomic-embed-text` | Embedding model |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `1000` / `200` | Sentence-aware chunking params |
| `TOP_K_CHUNKS` | `5` | Retrieved chunks per query |

## Project structure

```
backend/
├── document/      # PDF extraction + chunking
├── embeddings/     # Ollama embedding client
├── storage/         # FAISS vector store + notes persistence
├── rag/               # Retrieval + generation pipeline, prompts
├── routes/             # FastAPI endpoints
└── models/              # Pydantic schemas

frontend/src/
├── components/     # Sidebar, PDFViewer, ChatPanel, NotesPanel, etc.
├── store/           # Zustand global state
└── utils/             # API + SSE client
```

> `start_verso.bat` assumes the venv lives at `.venv` in the project root, edit the path inside it if yours is elsewhere.

