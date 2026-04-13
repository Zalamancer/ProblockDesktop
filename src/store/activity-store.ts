import { create } from "zustand";

export type ActivitySource = "blender" | "godot" | "ai" | "system";
export type ActivityLevel = "info" | "success" | "error" | "pending";

export interface ActivityEntry {
  id: string;
  source: ActivitySource;
  level: ActivityLevel;
  message: string;
  timestamp: number;
}

interface ActivityStore {
  entries: ActivityEntry[];
  add: (source: ActivitySource, level: ActivityLevel, message: string) => void;
  clear: () => void;
}

let nextId = 0;

export const useActivity = create<ActivityStore>((set) => ({
  entries: [],
  add: (source, level, message) =>
    set((s) => ({
      entries: [
        ...s.entries,
        { id: String(++nextId), source, level, message, timestamp: Date.now() },
      ],
    })),
  clear: () => set({ entries: [] }),
}));
