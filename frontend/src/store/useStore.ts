import { create } from "zustand";
import type { SourceChunk, WebSource } from "../utils/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  webSources?: WebSource[];
}

export interface Thread {
  thread_id: string;
  title: string;
  seed_text: string | null;
  message_count: number;
}

export interface Note {
  note_id: string;
  text: string;
  source_page: number | null;
  tag: string | null;
}

interface Selection {
  text: string;
  x: number;
  y: number;
}

export interface Paper {
  paperId: string;
  filename: string;
  numPages: number;
  pdfFile: File;
}

interface VersoState {
  papers: Paper[];
  activePaperId: string | null;
  sidePanelView: "chat" | "notes";
  zoom: number;

  mode: "eli5" | "exam" | "research";
  model: string;
  availableModels: string[];
  useWeb: boolean;
  activeThreadId: string | null; // null = main chat
  messages: ChatMessage[];
  isStreaming: boolean;
  abortController: AbortController | null;

  threads: Thread[];
  notes: Note[];

  selection: Selection | null;

  setPaper: (paperId: string, filename: string, numPages: number, pdfFile: File) => void;
  setActivePaper: (paperId: string) => void;
  setSidePanelView: (v: "chat" | "notes") => void;
  setZoom: (z: number) => void;
  setMode: (mode: VersoState["mode"]) => void;
  setModel: (model: string) => void;
  setAvailableModels: (models: string[]) => void;
  setUseWeb: (v: boolean) => void;
  setActiveThread: (threadId: string | null) => void;
  addMessage: (msg: ChatMessage) => void;
  appendToLastMessage: (delta: string) => void;
  setLastMessageSources: (sources: SourceChunk[]) => void;
  setLastMessageWebSources: (sources: WebSource[]) => void;
  truncateMessages: (index: number) => void;
  setStreaming: (v: boolean) => void;
  setAbortController: (c: AbortController | null) => void;
  stopStreaming: () => void;
  resetMessages: () => void;

  setThreads: (threads: Thread[]) => void;
  setNotes: (notes: Note[]) => void;

  setSelection: (sel: Selection | null) => void;
}

export const useStore = create<VersoState>((set, get) => ({
  papers: [],
  activePaperId: null,
  sidePanelView: "chat",
  zoom: 100,

  mode: "research",
  model: "qwen3:1.7b",
  availableModels: [],
  useWeb: false,
  activeThreadId: null,
  messages: [],
  isStreaming: false,
  abortController: null,

  threads: [],
  notes: [],

  selection: null,

  setPaper: (paperId, filename, numPages, pdfFile) =>
    set((s) => ({
      papers: [...s.papers, { paperId, filename, numPages, pdfFile }],
      activePaperId: paperId,
      activeThreadId: null,
      messages: [],
      threads: [],
      notes: [],
    })),

  setActivePaper: (activePaperId) =>
    set({ activePaperId, activeThreadId: null, messages: [], threads: [], notes: [] }),
  setSidePanelView: (sidePanelView) => set({ sidePanelView }),
  setZoom: (zoom) => set({ zoom }),

  setMode: (mode) => set({ mode }),
  setModel: (model) => set({ model }),
  setAvailableModels: (availableModels) => set({ availableModels }),
  setUseWeb: (useWeb) => set({ useWeb }),
  setActiveThread: (activeThreadId) => set({ activeThreadId, messages: [] }),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  appendToLastMessage: (delta) =>
    set((s) => {
      const messages = [...s.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        messages[messages.length - 1] = { ...last, content: last.content + delta };
      }
      return { messages };
    }),

  setLastMessageSources: (sources) =>
    set((s) => {
      const messages = [...s.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        messages[messages.length - 1] = { ...last, sources };
      }
      return { messages };
    }),

  setLastMessageWebSources: (webSources) =>
    set((s) => {
      const messages = [...s.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant") {
        messages[messages.length - 1] = { ...last, webSources };
      }
      return { messages };
    }),

  truncateMessages: (index) => set((s) => ({ messages: s.messages.slice(0, index) })),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setAbortController: (abortController) => set({ abortController }),
  stopStreaming: () => {
    get().abortController?.abort();
  },
  resetMessages: () => set({ messages: [] }),

  setThreads: (threads) => set({ threads }),
  setNotes: (notes) => set({ notes }),

  setSelection: (selection) => set({ selection }),
}));

export const useActivePaper = () =>
  useStore((s) => s.papers.find((p) => p.paperId === s.activePaperId) ?? null);
