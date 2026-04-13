import {
  FolderOpen,
  FolderPlus,
  Box,
  Gamepad2,
  Play,
  Globe,
} from "lucide-react";
import { useOrchestrator } from "../store/orchestrator-store";
import { bridge, dialogs } from "../lib/tauri-bridge";
import { useActivity } from "../store/activity-store";

function StatusDot({ status }: { status: "idle" | "running" | "error" }) {
  const color =
    status === "running"
      ? "bg-green-400 animate-pulse"
      : status === "error"
        ? "bg-red-400"
        : "bg-zinc-600";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

export function PipelinePanel() {
  const {
    project,
    blenderStatus,
    godotStatus,
    assets,
    godotSceneCount,
    godotScriptCount,
    setProject,
    setAssets,
    setBlenderStatus,
    setGodotStatus,
    setGodotCounts,
  } = useOrchestrator();
  const log = useActivity((s) => s.add);

  async function handleCreateProject() {
    try {
      const baseDir = await dialogs.pickFolder("Choose location for new project");
      if (!baseDir) return;
      const name = baseDir.split("/").pop() ?? "Untitled";
      const info = await bridge.createProject(baseDir, name);
      setProject({
        name: info.name,
        path: info.path,
        godotProjectPath: info.godot_project_path,
      });
      log("system", "success", `Created project: ${info.name}`);
      await refreshAssets();
    } catch (e: any) {
      log("system", "error", `Create failed: ${e}`);
    }
  }

  async function handleOpenProject() {
    try {
      const folder = await dialogs.pickFolder("Open Problocks project");
      if (!folder) return;
      const info = await bridge.openProject(folder);
      setProject({
        name: info.name,
        path: info.path,
        godotProjectPath: info.godot_project_path,
      });
      log("system", "success", `Opened project: ${info.name}`);
      await refreshAssets();
      await refreshGodotCounts();
    } catch (e: any) {
      log("system", "error", `Open failed: ${e}`);
    }
  }

  async function refreshAssets() {
    try {
      const list = await bridge.listAssets();
      setAssets(
        list.map((a) => ({
          name: a.name,
          path: a.path,
          type: a.asset_type as any,
          source: a.source as any,
          timestamp: Date.now(),
        }))
      );
    } catch {
      /* no assets yet */
    }
  }

  async function refreshGodotCounts() {
    try {
      const [scenes, scripts] = await bridge.getGodotCounts();
      setGodotCounts(scenes, scripts);
    } catch {
      /* ignore */
    }
  }

  async function handleOpenBlender() {
    if (!project) return;
    try {
      const file = await dialogs.pickBlendFile();
      setBlenderStatus("running");
      await bridge.openInBlender(file ?? "");
      log("blender", "info", file ? `Opened ${file.split("/").pop()}` : "Blender opened");
    } catch (e: any) {
      setBlenderStatus("error");
      log("blender", "error", `Blender failed: ${e}`);
    }
  }

  async function handleOpenGodot() {
    if (!project) return;
    try {
      setGodotStatus("running");
      await bridge.openGodotEditor();
      log("godot", "info", "Godot editor opened");
    } catch (e: any) {
      setGodotStatus("error");
      log("godot", "error", `Godot failed: ${e}`);
    }
  }

  async function handleRunGame() {
    if (!project) return;
    try {
      setGodotStatus("running");
      await bridge.runGodotGame();
      log("godot", "info", "Game running");
    } catch (e: any) {
      setGodotStatus("error");
      log("godot", "error", `Run failed: ${e}`);
    }
  }

  async function handleExportHtml5() {
    if (!project) return;
    try {
      setGodotStatus("running");
      log("godot", "pending", "Exporting HTML5...");
      const result = await bridge.exportGodotHtml5();
      setGodotStatus("idle");
      if (result.success) {
        log("godot", "success", `Exported to ${result.output_path}`);
      } else {
        log("godot", "error", "Export failed");
      }
    } catch (e: any) {
      setGodotStatus("error");
      log("godot", "error", `Export failed: ${e}`);
    }
  }

  const hasProject = project !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Project info */}
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Project
        </h2>
        {project ? (
          <div className="text-sm font-medium truncate" title={project.path}>
            {project.name}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">No project open</p>
        )}
      </div>

      {/* Project actions */}
      <div className="flex gap-1.5 mb-4">
        <button
          onClick={handleCreateProject}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
        >
          <FolderPlus size={13} /> New
        </button>
        <button
          onClick={handleOpenProject}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
        >
          <FolderOpen size={13} /> Open
        </button>
      </div>

      {/* Tool status */}
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Tools
        </h2>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <StatusDot status={blenderStatus} />
            <Box size={13} className="text-orange-400" />
            <span>Blender</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot status={godotStatus} />
            <Gamepad2 size={13} className="text-blue-400" />
            <span>Godot</span>
          </div>
        </div>
      </div>

      {/* Pipeline actions */}
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Pipeline
        </h2>
        <div className="space-y-1">
          <button
            disabled={!hasProject}
            onClick={handleOpenBlender}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 rounded-md transition-colors text-left"
          >
            <Box size={13} className="text-orange-400" /> Open Blender
          </button>
          <button
            disabled={!hasProject}
            onClick={handleOpenGodot}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 rounded-md transition-colors text-left"
          >
            <Gamepad2 size={13} className="text-blue-400" /> Open Godot
          </button>
          <button
            disabled={!hasProject}
            onClick={handleRunGame}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 rounded-md transition-colors text-left"
          >
            <Play size={13} className="text-green-400" /> Run Game
          </button>
          <button
            disabled={!hasProject}
            onClick={handleExportHtml5}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 rounded-md transition-colors text-left"
          >
            <Globe size={13} className="text-cyan-400" /> Export HTML5
          </button>
        </div>
      </div>

      {/* Asset summary */}
      {hasProject && (
        <div className="mt-auto pt-3 border-t border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Assets
          </h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-400">
            <span>Models</span>
            <span className="text-right text-zinc-200">
              {assets.filter((a) => a.type === "model").length}
            </span>
            <span>Scenes</span>
            <span className="text-right text-zinc-200">{godotSceneCount}</span>
            <span>Scripts</span>
            <span className="text-right text-zinc-200">
              {godotScriptCount}
            </span>
            <span>Textures</span>
            <span className="text-right text-zinc-200">
              {assets.filter((a) => a.type === "texture").length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
