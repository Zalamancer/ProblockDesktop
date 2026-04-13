import { create } from "zustand";

export interface RecentProject {
  name: string;
  path: string;
  lastOpened: number;
}

interface SettingsStore {
  // Tool path overrides (null = use auto-detected)
  blenderPathOverride: string | null;
  godotPathOverride: string | null;
  setBlenderPathOverride: (path: string | null) => void;
  setGodotPathOverride: (path: string | null) => void;

  // Recent projects
  recentProjects: RecentProject[];
  addRecentProject: (name: string, path: string) => void;
  removeRecentProject: (path: string) => void;

  // Settings modal
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const STORAGE_KEY = "problocks-settings";

function loadFromStorage(): Partial<SettingsStore> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return {
      blenderPathOverride: data.blenderPathOverride ?? null,
      godotPathOverride: data.godotPathOverride ?? null,
      recentProjects: data.recentProjects ?? [],
    };
  } catch {
    return {};
  }
}

function persist(state: SettingsStore) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        blenderPathOverride: state.blenderPathOverride,
        godotPathOverride: state.godotPathOverride,
        recentProjects: state.recentProjects,
      })
    );
  } catch {
    /* localStorage unavailable */
  }
}

const saved = loadFromStorage();

export const useSettings = create<SettingsStore>((set, get) => ({
  blenderPathOverride: saved.blenderPathOverride ?? null,
  godotPathOverride: saved.godotPathOverride ?? null,
  recentProjects: saved.recentProjects ?? [],
  settingsOpen: false,

  setBlenderPathOverride: (path) => {
    set({ blenderPathOverride: path });
    persist(get());
  },

  setGodotPathOverride: (path) => {
    set({ godotPathOverride: path });
    persist(get());
  },

  addRecentProject: (name, path) => {
    set((s) => {
      const filtered = s.recentProjects.filter((p) => p.path !== path);
      const updated = [{ name, path, lastOpened: Date.now() }, ...filtered].slice(0, 8);
      return { recentProjects: updated };
    });
    persist(get());
  },

  removeRecentProject: (path) => {
    set((s) => ({
      recentProjects: s.recentProjects.filter((p) => p.path !== path),
    }));
    persist(get());
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}));
