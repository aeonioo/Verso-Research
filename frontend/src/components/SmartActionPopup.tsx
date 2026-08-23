import { useStore } from "../store/useStore";

const ACTIONS: { key: string; label: string }[] = [
  { key: "explain_simply", label: "Explain Simply" },
  { key: "explain_math", label: "Explain Mathematically" },
  { key: "derive", label: "Derive" },
  { key: "intuition", label: "Intuition" },
  { key: "analogy", label: "Analogy" },
];

interface Props {
  onAction: (action: string, selectedText: string) => void;
}

export default function SmartActionPopup({ onAction }: Props) {
  const selection = useStore((s) => s.selection);
  const setSelection = useStore((s) => s.setSelection);

  if (!selection) return null;

  return (
    <div
      className="smart-action-popup"
      style={{ left: selection.x, top: selection.y }}
      onMouseLeave={() => setSelection(null)}
    >
      {ACTIONS.map((a) => (
        <button
          key={a.key}
          onClick={() => {
            onAction(a.key, selection.text);
            setSelection(null);
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
