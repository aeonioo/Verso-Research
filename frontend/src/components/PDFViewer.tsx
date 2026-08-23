import { useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useStore, useActivePaper } from "../store/useStore";
import SmartActionPopup from "./SmartActionPopup";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface Props {
  onSmartAction: (action: string, selectedText: string) => void;
}

export default function PDFViewer({ onSmartAction }: Props) {
  const paper = useActivePaper();
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);
  const setSelection = useStore((s) => s.setSelection);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  function handleMouseUp() {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setSelection({
      text,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
    });
  }

  if (!paper) return null;

  return (
    <div className="pdf-wrapper" ref={wrapperRef}>
      <div className="pdf-toolbar">
        <span className="pdf-toolbar-title">📄 {paper.numPages}pp</span>
        <div className="pdf-toolbar-spacer" />
        <button onClick={() => setZoom(Math.max(50, zoom - 10))}>−</button>
        <span className="zoom-label">{zoom}%</span>
        <button onClick={() => setZoom(Math.min(200, zoom + 10))}>+</button>
        <button onClick={() => wrapperRef.current?.requestFullscreen()}>⛶</button>
      </div>

      <div className="pdf-viewer" ref={containerRef} onMouseUp={handleMouseUp}>
        <Document file={paper.pdfFile} loading="Loading PDF...">
          {Array.from({ length: paper.numPages }, (_, i) => (
            <Page
              key={i}
              pageNumber={i + 1}
              scale={zoom / 100}
              renderAnnotationLayer={true}
              renderTextLayer={true}
            />
          ))}
        </Document>
        <SmartActionPopup onAction={onSmartAction} />
      </div>

      <div className="pdf-statusbar">
        <span>✓ Indexed &amp; Ready</span>
        <span>Select text to get AI explanations</span>
      </div>
    </div>
  );
}
