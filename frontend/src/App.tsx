import { useStore, useActivePaper } from "./store/useStore";
import Sidebar from "./components/Sidebar";
import PDFViewer from "./components/PDFViewer";
import ChatPanel from "./components/ChatPanel";
import NotesPanel from "./components/NotesPanel";
import { createThread, streamSmartAction } from "./utils/api";

export default function App() {
  const paper = useActivePaper();
  const sidePanelView = useStore((s) => s.sidePanelView);
  const setActiveThread = useStore((s) => s.setActiveThread);
  const addMessage = useStore((s) => s.addMessage);
  const appendToLastMessage = useStore((s) => s.appendToLastMessage);
  const setLastMessageSources = useStore((s) => s.setLastMessageSources);
  const setStreaming = useStore((s) => s.setStreaming);
  const setAbortController = useStore((s) => s.setAbortController);
  const model = useStore((s) => s.model);

  async function handleSmartAction(action: string, selectedText: string) {
    if (!paper) return;

    const thread = await createThread(
      paper.paperId,
      selectedText,
      `${action.replace("_", " ")}: "${selectedText.slice(0, 40)}..."`
    );
    setActiveThread(thread.thread_id);

    addMessage({ role: "user", content: selectedText });
    addMessage({ role: "assistant", content: "" });
    setStreaming(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      await streamSmartAction(
        { paper_id: paper.paperId, selected_text: selectedText, action, thread_id: thread.thread_id, model },
        (event) => {
          if (event.type === "sources") setLastMessageSources(event.data);
          if (event.type === "token") appendToLastMessage(event.data);
        },
        controller.signal
      );
    } catch (e) {
      // aborted or errored: keep partial content, no crash
    } finally {
      setStreaming(false);
      setAbortController(null);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-content">
        {!paper ? (
          <div className="hero">
            <div className="hero-icon">◆</div>
            <h1>Verso</h1>
            <p>
              Upload a research paper from the sidebar to start chatting, exploring math, and
              diving deep into concepts — all locally.
            </p>
            <div className="hero-pills">
              <span>📄 PDF Viewer</span>
              <span>🤖 RAG Chat</span>
              <span>∑ Math Explanations</span>
              <span>⎇ Deep Dive Threads</span>
              <span>📝 Notes</span>
              <span>📋 Exam Mode</span>
              <span>🧸 ELI5 Mode</span>
              <span>🔒 100% Local</span>
            </div>
          </div>
        ) : (
          <div className="pdf-column">
            <PDFViewer onSmartAction={handleSmartAction} />
          </div>
        )}

        {paper && (
          <div className="side-column">
            {sidePanelView === "chat" ? <ChatPanel /> : <NotesPanel />}
          </div>
        )}
      </div>
    </div>
  );
}
