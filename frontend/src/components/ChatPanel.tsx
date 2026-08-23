
import { useState } from "react";
import { useStore, useActivePaper } from "../store/useStore";
import { streamChat, createNote, createThread, deleteThread, truncateThread } from "../utils/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const MODES: { key: "eli5" | "exam" | "research"; label: string; icon: string }[] = [
  { key: "eli5", label: "ELI5", icon: "🧸" },
  { key: "exam", label: "Exam", icon: "📋" },
  { key: "research", label: "Research", icon: "🔬" },
];

export default function ChatPanel() {
  const paper = useActivePaper();
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const activeThreadId = useStore((s) => s.activeThreadId);
  const setActiveThread = useStore((s) => s.setActiveThread);
  const messages = useStore((s) => s.messages);
  const addMessage = useStore((s) => s.addMessage);
  const appendToLastMessage = useStore((s) => s.appendToLastMessage);
  const setLastMessageSources = useStore((s) => s.setLastMessageSources);
  const setLastMessageWebSources = useStore((s) => s.setLastMessageWebSources);
  const truncateMessages = useStore((s) => s.truncateMessages);
  const isStreaming = useStore((s) => s.isStreaming);
  const setStreaming = useStore((s) => s.setStreaming);
  const setAbortController = useStore((s) => s.setAbortController);
  const stopStreaming = useStore((s) => s.stopStreaming);
  const model = useStore((s) => s.model);
  const useWeb = useStore((s) => s.useWeb);
  const setUseWeb = useStore((s) => s.setUseWeb);

  const [input, setInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  async function send(overrideMessage?: string) {
    const message = (overrideMessage ?? input).trim();
    if (!message || !paper || isStreaming) return;
    setInput("");

    addMessage({ role: "user", content: message });
    addMessage({ role: "assistant", content: "" });
    setStreaming(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      await streamChat(
        { paper_id: paper.paperId, message, mode, thread_id: activeThreadId, model, use_web: useWeb },
        (event) => {
          if (event.type === "sources") setLastMessageSources(event.data);
          if (event.type === "web_sources") setLastMessageWebSources(event.data);
          if (event.type === "token") appendToLastMessage(event.data);
        },
        controller.signal
      );
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        appendToLastMessage("\n\n[Error: could not reach the server]");
      }
      // aborted: keep whatever partial content already streamed in, no error text
    } finally {
      setStreaming(false);
      setAbortController(null);
    }
  }

  async function handleNewThread() {
    if (!paper) return;
    const thread = await createThread(paper.paperId);
    setActiveThread(thread.thread_id);
  }

  async function handleDeleteThread() {
    if (!paper || !activeThreadId) return;
    await deleteThread(paper.paperId, activeThreadId);
    setActiveThread(null);
  }

  function startEdit(index: number, content: string) {
    setEditingIndex(index);
    setEditText(content);
  }

  async function submitEdit() {
    if (editingIndex === null || !paper) return;
    const text = editText.trim();
    if (!text) return;

    // drop the persisted history from this message onward, then resend fresh
    await truncateThread(paper.paperId, activeThreadId ?? "main", editingIndex);
    truncateMessages(editingIndex);
    setEditingIndex(null);
    setEditText("");
    await send(text);
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-title">Chat</span>
        <span className="chat-status">{isStreaming ? "streaming" : "ready"}</span>
        <div className="chat-toolbar-spacer" />
        <button className="new-thread-btn" onClick={handleNewThread}>+ New Thread</button>
        {activeThreadId && (
          <button className="delete-thread-btn" onClick={handleDeleteThread} title="Delete thread">
            🗑
          </button>
        )}
      </div>

      <div className="mode-toggle">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={mode === m.key ? "active" : ""}
            onClick={() => setMode(m.key)}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <div className="message-list">
        {messages.map((m, i) => (
          <div key={i} className={`message-row ${m.role}`}>
            {m.role === "assistant" && <span className="sender-label">Verso</span>}

            {editingIndex === i ? (
              <div className="edit-box">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="edit-actions">
                  <button className="edit-cancel" onClick={() => setEditingIndex(null)}>Cancel</button>
                  <button className="edit-send" onClick={submitEdit}>Send</button>
                </div>
              </div>
            ) : (
              <div className={`message ${m.role}`}>
                <div className="content">
                  {m.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {m.content}
                    </ReactMarkdown>
                  ) : (
                    isStreaming && i === messages.length - 1 ? "..." : ""
                  )}
                </div>
              </div>
            )}

            {m.role === "user" && editingIndex !== i && (
              <div className="message-actions">
                <span className="icon-btn" title="Edit" onClick={() => startEdit(i, m.content)}>
                  ✎
                </span>
              </div>
            )}

            {m.role === "assistant" && m.content && editingIndex !== i && (
              <div className="message-actions">
                {m.sources && m.sources.length > 0 && (
                  <span className="sources-chip" title={m.sources.map((s) => `p.${s.page}`).join(", ")}>
                    {m.sources.length} sources
                  </span>
                )}
                {m.webSources && m.webSources.length > 0 && (
                  <span
                    className="sources-chip web"
                    title={m.webSources.map((s) => s.title).join(" · ")}
                  >
                    🌐 {m.webSources.length} web
                  </span>
                )}
                <span className="icon-btn" onClick={() => navigator.clipboard.writeText(m.content)} title="Copy">
                  ⧉
                </span>
                <span
                  className="icon-btn"
                  title="Save as note"
                  onClick={() => paper && createNote(paper.paperId, m.content, m.sources?.[0]?.page ?? null)}
                >
                  🔖
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="chat-toolbar-row">
        <button
          className={`web-toggle ${useWeb ? "active" : ""}`}
          onClick={() => setUseWeb(!useWeb)}
          title="Include live web search results (leaves the local-only default)"
        >
          🌐 Web {useWeb ? "on" : "off"}
        </button>
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about this paper?"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button className="stop-btn" onClick={stopStreaming} title="Stop generating">
            ■
          </button>
        ) : (
          <button onClick={() => send()} disabled={isStreaming}>
            ➤
          </button>
        )}
      </div>
    </div>
  );
}