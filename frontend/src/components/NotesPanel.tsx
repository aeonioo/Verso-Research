import { useEffect } from "react";
import { useStore, useActivePaper } from "../store/useStore";
import { listNotes, deleteNote } from "../utils/api";

export default function NotesPanel() {
  const paper = useActivePaper();
  const notes = useStore((s) => s.notes);
  const setNotes = useStore((s) => s.setNotes);
  const setSidePanelView = useStore((s) => s.setSidePanelView);

  async function refresh() {
    if (!paper) return;
    const data = await listNotes(paper.paperId);
    setNotes(data);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper?.paperId]);

  return (
    <div className="notes-panel-full">
      <div className="chat-header">
        <span className="chat-title">My Notes</span>
        <div className="chat-toolbar-spacer" />
        <button className="new-thread-btn" onClick={() => setSidePanelView("chat")}>← Back to Chat</button>
      </div>
      <div className="notes-panel">
        {notes.length === 0 && <p className="empty">No notes saved yet.</p>}
        {notes.map((n) => (
          <div key={n.note_id} className="note">
            <p>{n.text}</p>
            <div className="note-meta">
              {n.source_page != null && <span>p.{n.source_page}</span>}
              <span
                className="delete-note"
                onClick={async () => {
                  if (!paper) return;
                  await deleteNote(paper.paperId, n.note_id);
                  refresh();
                }}
              >
                Delete
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
