const BASE_URL = "http://localhost:8000";

export interface SourceChunk {
  chunk_id: number;
  page: number;
  text: string;
  score: number;
}

export type SSEEvent =
  | { type: "sources"; data: SourceChunk[] }
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

/** Streams SSE events from /chat, calling onEvent for each one as it arrives. */
export async function streamChat(
  params: { paper_id: string; message: string; mode: string; thread_id?: string | null; model?: string },
  onEvent: (event: SSEEvent) => void
) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
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
      const jsonStr = line.slice(5).trim();
      try {
        onEvent(JSON.parse(jsonStr) as SSEEvent);
      } catch {
        // ignore malformed partial chunk
      }
    }
  }
}

/** Streams SSE events from /smart-action (Explain/Derive/etc on selected text). */
export async function streamSmartAction(
  params: { paper_id: string; selected_text: string; action: string; thread_id?: string | null; model?: string },
  onEvent: (event: SSEEvent) => void
) {
  const res = await fetch(`${BASE_URL}/smart-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
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
