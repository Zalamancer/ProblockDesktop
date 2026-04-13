import { create } from "zustand";

export type ProcessStatus = "idle" | "running" | "error";

export interface AssetEntry {
  name: string;
  path: string;
  type: "model" | "scene" | "script" | "texture" | "audio";
  source: "blender" | "godot" | "manual";
  timestamp: number;
}

export interface ProjectState {
  name: string;
  path: string;
  godotProjectPath: string;
}

interface OrchestratorStore {
  // Project
  project: ProjectState | null;
  setProject: (project: ProjectState | null) => void;

  // Process status
  blenderStatus: ProcessStatus;
  godotStatus: ProcessStatus;
  setBlenderStatus: (s: ProcessStatus) => void;
  setGodotStatus: (s: ProcessStatus) => void;

  // Assets
  assets: AssetEntry[];
  addAsset: (asset: AssetEntry) => void;
  setAssets: (assets: AssetEntry[]) => void;
  removeAsset: (path: string) => void;

  // Blender detail
  blenderActiveTask: string | null;
  setBlenderActiveTask: (task: string | null) => void;

  // Godot detail
  godotSceneCount: number;
  godotScriptCount: number;
  setGodotCounts: (scenes: number, scripts: number) => void;
}

export const useOrchestrator = create<OrchestratorStore>((set) => ({
  project: null,
  setProject: (project) => set({ project }),

  blenderStatus: "idle",
  godotStatus: "idle",
  setBlenderStatus: (blenderStatus) => set({ blenderStatus }),
  setGodotStatus: (godotStatus) => set({ godotStatus }),

  assets: [],
  addAsset: (asset) =>
    set((s) => ({ assets: [...s.assets, asset] })),
  setAssets: (assets) => set({ assets }),
  removeAsset: (path) =>
    set((s) => ({ assets: s.assets.filter((a) => a.path !== path) })),

  blenderActiveTask: null,
  setBlenderActiveTask: (blenderActiveTask) => set({ blenderActiveTask }),

  godotSceneCount: 0,
  godotScriptCount: 0,
  setGodotCounts: (godotSceneCount, godotScriptCount) =>
    set({ godotSceneCount, godotScriptCount }),
}));
