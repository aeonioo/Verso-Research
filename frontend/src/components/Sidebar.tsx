import { useState, useRef } from "react";
import { uploadPaper } from "../utils/api";
import { useStore } from "../store/useStore";
import ModelSelector from "./ModelSelector";

export default function Sidebar() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const papers = useStore((s) => s.papers);
  const activePaperId = useStore((s) => s.activePaperId);
  const setPaper = useStore((s) => s.setPaper);
  const setActivePaper = useStore((s) => s.setActivePaper);
  const sidePanelView = useStore((s) => s.sidePanelView);
  const setSidePanelView = useStore((s) => s.setSidePanelView);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await uploadPaper(file);
      setPaper(result.paper_id, result.filename, result.num_pages, file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">◆</span>
        <span>Verso</span>
      </div>

      <div
        className="dropzone-compact"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {loading ? "Indexing..." : (
          <>
            Drop PDF here or <span className="link">browse</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      {error && <p className="error-compact">{error}</p>}

      <ModelSelector />

      <div className="papers-label">PAPERS ({papers.length})</div>
      <div className="papers-list">
        {papers.length === 0 && <p className="empty">No papers yet</p>}
        {papers.map((p) => (
          <div
            key={p.paperId}
            className={`paper-item ${p.paperId === activePaperId ? "active" : ""}`}
            onClick={() => setActivePaper(p.paperId)}
          >
            <span className="paper-icon">📄</span>
            <div>
              <div className="paper-name">{p.filename}</div>
              <div className="paper-meta">{p.numPages} pages</div>
            </div>
          </div>
        ))}
      </div>

      {activePaperId && (
        <div className="sidebar-nav">
          <button
            className={sidePanelView === "notes" ? "active" : ""}
            onClick={() => setSidePanelView(sidePanelView === "notes" ? "chat" : "notes")}
          >
            📝 My Notes
          </button>
        </div>
      )}
    </div>
  );
}
