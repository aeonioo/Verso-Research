const BASE_URL = "http://localhost:8000";

export interface SourceChunk {
  chunk_id: number;
  page: number;
  text: string;
  score: number;
}

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
}

export type SSEEvent =
  | { type: "sources"; data: SourceChunk[] }
  | { type: "web_sources"; data: WebSource[] }
  | { type: "token"; data: string }
  | { type: "done"; data: null };

export async function listModels() {
  const res = await fetch(`${BASE_URL}/models`);
  return res.json() as Promise<{ models: string[]; default: string }>;
}

export async function uploadPaper(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json() as Promise<{
    paper_id: string;
    filename: string;
    num_pages: number;
    num_chunks: number;
  }>;
}

async function _streamSSE(url: string, body: object, onEvent: (e: SSEEvent) => void, signal?: AbortSignal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as SSEEvent);
      } catch {
        // ignore malformed partial chunk
      }
    }
  }
}

/** Streams SSE events from /chat. Pass `signal` (from an AbortController) to allow stopping generation. */
export async function streamChat(
  params: {
    paper_id: string;
    message: string;
    mode: string;
    thread_id?: string | null;
    model?: string;
    use_web?: boolean;
  },
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
) {
  await _streamSSE(`${BASE_URL}/chat`, params, onEvent, signal);
}

/** Streams SSE events from /smart-action (Explain/Derive/etc on selected text). */
export async function streamSmartAction(
  params: { paper_id: string; selected_text: string; action: string; thread_id?: string | null; model?: string },
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
) {
  await _streamSSE(`${BASE_URL}/smart-action`, params, onEvent, signal);
}

// ---- Threads ----

export async function createThread(paper_id: string, seed_text?: string, title?: string) {
  const res = await fetch(`${BASE_URL}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paper_id, seed_text, title }),
  });
  return res.json();
}

export async function listThreads(paper_id: string) {
  const res = await fetch(`${BASE_URL}/threads/${paper_id}`);
  return res.json();
}

export async function getThread(paper_id: string, thread_id: string) {
  const res = await fetch(`${BASE_URL}/threads/${paper_id}/${thread_id}`);
  return res.json();
}

export async function deleteThread(paper_id: string, thread_id: string) {
  await fetch(`${BASE_URL}/threads/${paper_id}/${thread_id}`, { method: "DELETE" });
}

export async function promoteMessage(paper_id: string, thread_id: string, message_id: string) {
  const res = await fetch(`${BASE_URL}/threads/promote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paper_id, thread_id, message_id }),
  });
  return res.json();
}

/** Drops persisted thread messages from `keep_count` onward — used before resending an edited message. */
export async function truncateThread(paper_id: string, thread_id: string, keep_count: number) {
  const res = await fetch(`${BASE_URL}/threads/${paper_id}/${thread_id}/truncate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keep_count }),
  });
  return res.json();
}

// ---- Notes ----

export async function createNote(
  paper_id: string,
  text: string,
  source_page?: number | null,
  tag?: string | null
) {
  const res = await fetch(`${BASE_URL}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paper_id, text, source_page, tag }),
  });
  return res.json();
}

export async function listNotes(paper_id: string) {
  const res = await fetch(`${BASE_URL}/notes/${paper_id}`);
  return res.json();
}

export async function deleteNote(paper_id: string, note_id: string) {
  await fetch(`${BASE_URL}/notes/${paper_id}/${note_id}`, { method: "DELETE" });
}
