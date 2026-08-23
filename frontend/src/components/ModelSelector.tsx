import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { listModels } from "../utils/api";

export default function ModelSelector() {
  const model = useStore((s) => s.model);
  const setModel = useStore((s) => s.setModel);
  const availableModels = useStore((s) => s.availableModels);
  const setAvailableModels = useStore((s) => s.setAvailableModels);

  useEffect(() => {
    listModels().then((res) => {
      setAvailableModels(res.models);
      if (res.models.length && !res.models.includes(model)) {
        setModel(res.default || res.models[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <select className="model-selector" value={model} onChange={(e) => setModel(e.target.value)}>
      {availableModels.length === 0 && <option value={model}>{model}</option>}
      {availableModels.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}
