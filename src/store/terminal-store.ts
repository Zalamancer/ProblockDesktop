import { create } from "zustand";

export interface TerminalLine {
  id: number;
  source: "blender" | "godot" | "system";
  text: string;
  timestamp: number;
}

interface TerminalStore {
  lines: TerminalLine[];
  push: (source: TerminalLine["source"], text: string) => void;
  clear: () => void;
}

let nextId = 0;

export const useTerminal = create<TerminalStore>((set) => ({
  lines: [],
  push: (source, text) =>
    set((s) => ({
      lines: [
        ...s.lines,
        { id: ++nextId, source, text, timestamp: Date.now() },
      ],
    })),
  clear: () => set({ lines: [] }),
}));
