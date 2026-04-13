import { useEffect, useState, useCallback, useRef } from "react";
import { bridge, events } from "../lib/tauri-bridge";
import { useOrchestrator } from "../store/orchestrator-store";
import { useActivity } from "../store/activity-store";
import { useTerminal } from "../store/terminal-store";
import { PipelinePanel } from "./PipelinePanel";
import { ActivityLog } from "./ActivityLog";
import { Terminal } from "./Terminal";
import { GamePreview } from "./GamePreview";
import { AssetBrowser } from "./AssetBrowser";
import { ScriptRunner } from "./ScriptRunner";
import { SettingsModal } from "./SettingsModal";
import { ToastContainer } from "./ToastContainer";
import { StatusBar } from "./StatusBar";
import { SceneBrowser } from "./SceneBrowser";
import { CommandPalette, buildPaletteActions } from "./CommandPalette";
import { AutoBuilder } from "./AutoBuilder";
import { useSettings } from "../store/settings-store";
import { useToasts } from "../store/toast-store";
import { useHotkeys } from "../lib/use-hotkeys";
import { dialogs } from "../lib/tauri-bridge";
import { Wrench, Monitor, FolderOpen, Code2, Settings, GripHorizontal, Clapperboard, Rocket } from "lucide-react";

export function DesktopLayout() {
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [toolsDetected, setToolsDetected] = useState(false);
  const [centerTab, setCenterTab] = useState<"preview" | "assets" | "scripts" | "scenes" | "build">("build");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<number | null>(null);

  const project = useOrchestrator((s) => s.project);
  const setGodotStatus = useOrchestrator((s) => s.setGodotStatus);
  const addAsset = useOrchestrator((s) => s.addAsset);
  const removeAsset = useOrchestrator((s) => s.removeAsset);
  const log = useActivity((s) => s.add);
  const pushTerminal = useTerminal((s) => s.push);
  const toast = useToasts((s) => s.push);
  const clearTerminal = useTerminal((s) => s.clear);

  // Terminal resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = e.clientY;
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    function handleMouseMove(e: MouseEvent) {
      if (resizeRef.current === null) return;
      const delta = resizeRef.current - e.clientY;
      resizeRef.current = e.clientY;
      setTerminalHeight((h) => Math.min(500, Math.max(80, h + delta)));
    }

    function handleMouseUp() {
      setIsResizing(false);
      resizeRef.current = null;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Keyboard shortcuts
  useHotkeys({
    "mod+1": () => setCenterTab("preview"),
    "mod+2": () => setCenterTab("assets"),
    "mod+3": () => setCenterTab("scripts"),
    "mod+4": () => setCenterTab("scenes"),
    "mod+5": () => setCenterTab("build"),
    "mod+,": () => useSettings.getState().openSettings(),
    "mod+k": () => clearTerminal(),
    "mod+p": () => setPaletteOpen(true),
  });

  // Detect tools on mount
  useEffect(() => {
    bridge
      .detectTools()
      .then((tools) => {
        setToolsDetected(true);
        if (tools.blender) {
          log("system", "success", `Blender found: ${tools.blender}`);
        } else {
          log("system", "info", "Blender not found");
        }
        if (tools.godot) {
          log("system", "success", `Godot found: ${tools.godot}`);
        } else {
          log("system", "info", "Godot not found");
        }
      })
      .catch(() => {
        log("system", "error", "Tool detection failed");
        toast("error", "Tool detection failed");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to Tauri events
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    events.onBlenderStdout((line) => {
      pushTerminal("blender", line);
    }).then((u) => unsubs.push(u));

    events.onGodotStdout((line) => {
      pushTerminal("godot", line);
    }).then((u) => unsubs.push(u));

    events.onGodotExportComplete((path) => {
      setGodotStatus("idle");
      log("godot", "success", `Export complete: ${path}`);
    }).then((u) => unsubs.push(u));

    events.onFileChange((ev) => {
      if (ev.kind === "created") {
        log("system", "info", `File created: ${ev.path}`);
        addAsset({
          name: ev.path.split("/").pop() ?? ev.path,
          path: ev.path,
          type: extToType(ev.extension),
          source: extToSource(ev.extension),
          timestamp: Date.now(),
        });
      } else if (ev.kind === "removed") {
        log("system", "info", `File removed: ${ev.path}`);
        removeAsset(ev.path);
      } else {
        log("system", "info", `File modified: ${ev.path}`);
      }
    }).then((u) => unsubs.push(u));

    return () => {
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`h-screen flex flex-col bg-zinc-950 text-zinc-100 ${isResizing ? "select-none" : ""}`}>
      {/* Top bar */}
      <div className="h-10 flex items-center justify-between px-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <span
          className="text-sm font-semibold tracking-wide cursor-pointer hover:text-zinc-300 transition-colors"
          onClick={() => setCenterTab("preview")}
        >
          Problocks
        </span>

        {project && (
          <span className="text-xs text-zinc-500 absolute left-1/2 -translate-x-1/2">
            {project.name}
          </span>
        )}

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Wrench size={12} />
            <span>{toolsDetected ? "Tools detected" : "Detecting..."}</span>
          </div>
          <button
            onClick={useSettings.getState().openSettings}
            className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
            title="Settings (⌘,)"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      <SettingsModal />

      {/* Main content */}
      <div className="flex-1 flex gap-px min-h-0">
        {/* Left: Pipeline */}
        <div className="w-56 bg-zinc-900 border-r border-zinc-800 p-3 overflow-y-auto">
          <PipelinePanel />
        </div>

        {/* Center: Preview/Assets/Scripts + Terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 bg-zinc-900 flex flex-col min-h-0 overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-0.5 px-2 pt-1.5 pb-0.5 border-b border-zinc-800">
              {([
                { key: "preview" as const, icon: Monitor, label: "Preview", hint: "⌘1" },
                { key: "assets" as const, icon: FolderOpen, label: "Assets", hint: "⌘2" },
                { key: "scripts" as const, icon: Code2, label: "Scripts", hint: "⌘3" },
                { key: "scenes" as const, icon: Clapperboard, label: "Scenes", hint: "⌘4" },
                { key: "build" as const, icon: Rocket, label: "Build", hint: "⌘5" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCenterTab(tab.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
                    centerTab === tab.key
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  title={tab.hint}
                >
                  <tab.icon size={12} />
                  {tab.label}
                  <span className="text-[9px] text-zinc-600 ml-0.5 hidden lg:inline">{tab.hint}</span>
                </button>
              ))}
            </div>
            {/* Tab content */}
            <div className="flex-1 min-h-0 p-2">
              {centerTab === "preview" ? (
                <GamePreview />
              ) : centerTab === "assets" ? (
                <AssetBrowser />
              ) : centerTab === "scripts" ? (
                <ScriptRunner />
              ) : centerTab === "scenes" ? (
                <SceneBrowser />
              ) : (
                <AutoBuilder />
              )}
            </div>
          </div>

          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="h-1.5 bg-zinc-950 cursor-row-resize flex items-center justify-center hover:bg-zinc-700 transition-colors group"
          >
            <GripHorizontal size={12} className="text-zinc-700 group-hover:text-zinc-400" />
          </div>

          {/* Bottom: Terminal */}
          <div
            className="bg-zinc-900 border-t border-zinc-800 p-3 overflow-y-auto shrink-0"
            style={{ height: terminalHeight }}
          >
            <Terminal />
          </div>
        </div>

        {/* Right: Activity Log */}
        <div className="w-64 bg-zinc-900 border-l border-zinc-800 p-3 overflow-y-auto">
          <ActivityLog />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={buildPaletteActions({
          newProject: async () => {
            const dir = await dialogs.pickFolder("Choose location for new project");
            if (dir) {
              const name = dir.split("/").pop() ?? "Untitled";
              try {
                const info = await bridge.createProject(dir, name);
                useOrchestrator.getState().setProject({
                  name: info.name,
                  path: info.path,
                  godotProjectPath: info.godot_project_path,
                });
                toast("success", `Created: ${info.name}`);
              } catch (e: any) {
                toast("error", `Create failed: ${e}`);
              }
            }
          },
          openProject: async () => {
            const dir = await dialogs.pickFolder("Open Problocks project");
            if (dir) {
              try {
                const info = await bridge.openProject(dir);
                useOrchestrator.getState().setProject({
                  name: info.name,
                  path: info.path,
                  godotProjectPath: info.godot_project_path,
                });
                toast("success", `Opened: ${info.name}`);
              } catch (e: any) {
                toast("error", `Open failed: ${e}`);
              }
            }
          },
          switchTab: (tab) => setCenterTab(tab as typeof centerTab),
          openSettings: () => useSettings.getState().openSettings(),
          clearTerminal,
          openBlender: async () => {
            try {
              const file = await dialogs.pickBlendFile();
              await bridge.openInBlender(file ?? "");
            } catch (e: any) {
              toast("error", `Blender failed: ${e}`);
            }
          },
          openGodot: async () => {
            try {
              await bridge.openGodotEditor();
            } catch (e: any) {
              toast("error", `Godot failed: ${e}`);
            }
          },
          runGame: async () => {
            try {
              await bridge.runGodotGame();
            } catch (e: any) {
              toast("error", `Run failed: ${e}`);
            }
          },
          exportHtml5: async () => {
            try {
              await bridge.exportGodotHtml5();
              toast("success", "HTML5 export complete");
            } catch (e: any) {
              toast("error", `Export failed: ${e}`);
            }
          },
        })}
      />

      <ToastContainer />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────

function extToType(ext: string): "model" | "scene" | "script" | "texture" | "audio" {
  switch (ext) {
    case "glb":
    case "gltf":
    case "blend":
      return "model";
    case "tscn":
    case "scn":
      return "scene";
    case "gd":
    case "cs":
      return "script";
    case "png":
    case "jpg":
    case "svg":
      return "texture";
    case "wav":
    case "ogg":
    case "mp3":
      return "audio";
    default:
      return "model";
  }
}

function extToSource(ext: string): "blender" | "godot" | "manual" {
  switch (ext) {
    case "blend":
    case "glb":
    case "gltf":
      return "blender";
    case "tscn":
    case "scn":
    case "gd":
    case "cs":
    case "tres":
    case "res":
    case "gdshader":
      return "godot";
    default:
      return "manual";
  }
}
