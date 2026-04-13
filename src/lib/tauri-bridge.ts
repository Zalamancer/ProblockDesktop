import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// ── Types ──────────────────────────────────────────

export interface ToolDetection {
  blender: string | null;
  godot: string | null;
}

export interface ProjectInfo {
  name: string;
  path: string;
  godot_project_path: string;
}

export interface AssetInfo {
  name: string;
  path: string;
  asset_type: string;
  source: string;
  size_bytes: number;
}

export interface BlenderResult {
  success: boolean;
  output_files: string[];
  stdout: string;
  stderr: string;
}

export interface GodotExportResult {
  success: boolean;
  output_path: string;
  stdout: string;
  stderr: string;
}

export interface FileChangeEvent {
  kind: "created" | "modified" | "removed";
  path: string;
  extension: string;
}

// ── Commands ───────────────────────────────────────

export const bridge = {
  detectTools: () => invoke<ToolDetection>("detect_tools"),

  createProject: (baseDir: string, name: string) =>
    invoke<ProjectInfo>("create_project", { baseDir, name }),

  openProject: (projectPath: string) =>
    invoke<ProjectInfo>("open_project", { projectPath }),

  listAssets: () => invoke<AssetInfo[]>("list_assets"),

  runBlenderScript: (scriptContent: string) =>
    invoke<BlenderResult>("run_blender_script", { scriptContent }),

  openInBlender: (filePath: string) =>
    invoke<void>("open_in_blender", { filePath }),

  openGodotEditor: (scene?: string) =>
    invoke<void>("open_godot_editor", { scene: scene ?? null }),

  runGodotGame: () => invoke<void>("run_godot_game"),

  exportGodotHtml5: () => invoke<GodotExportResult>("export_godot_html5"),

  getGodotCounts: () => invoke<[number, number]>("get_godot_counts"),
};

// ── Event Listeners ────────────────────────────────

export const events = {
  onBlenderStdout: (cb: (line: string) => void): Promise<UnlistenFn> =>
    listen<string>("blender:stdout", (e) => cb(e.payload)),

  onGodotStdout: (cb: (line: string) => void): Promise<UnlistenFn> =>
    listen<string>("godot:stdout", (e) => cb(e.payload)),

  onGodotExportComplete: (cb: (path: string) => void): Promise<UnlistenFn> =>
    listen<string>("godot:export_complete", (e) => cb(e.payload)),

  onFileChange: (cb: (event: FileChangeEvent) => void): Promise<UnlistenFn> =>
    listen<FileChangeEvent>("fs:change", (e) => cb(e.payload)),
};
