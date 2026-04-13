import { useEffect, useState } from "react";
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
import { Wrench, Monitor, FolderOpen, Code2 } from "lucide-react";

export function DesktopLayout() {
  const [terminalHeight] = useState(200);
  const [toolsDetected, setToolsDetected] = useState(false);
  const [centerTab, setCenterTab] = useState<"preview" | "assets" | "scripts">("preview");

  const setGodotStatus = useOrchestrator((s) => s.setGodotStatus);
  const addAsset = useOrchestrator((s) => s.addAsset);
  const removeAsset = useOrchestrator((s) => s.removeAsset);
  const log = useActivity((s) => s.add);
  const pushTerminal = useTerminal((s) => s.push);

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
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 p-1.5 gap-1.5">
      {/* Top bar */}
      <div className="h-10 flex items-center justify-between px-3 bg-zinc-900 rounded-lg border border-zinc-800">
        <span className="text-sm font-semibold tracking-wide">Problocks</span>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Wrench size={12} />
          <span>{toolsDetected ? "Tools detected" : "Detecting tools..."}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-1.5 min-h-0">
        {/* Left: Pipeline */}
        <div className="w-56 bg-zinc-900 rounded-lg border border-zinc-800 p-3 overflow-y-auto">
          <PipelinePanel />
        </div>

        {/* Center: Preview/Assets + Terminal */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div className="flex-1 bg-zinc-900 rounded-lg border border-zinc-800 flex flex-col min-h-0 overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-0.5 px-2 pt-1.5 pb-0.5 border-b border-zinc-800">
              <button
                onClick={() => setCenterTab("preview")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
                  centerTab === "preview"
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Monitor size={12} /> Preview
              </button>
              <button
                onClick={() => setCenterTab("assets")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
                  centerTab === "assets"
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <FolderOpen size={12} /> Assets
              </button>
              <button
                onClick={() => setCenterTab("scripts")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
                  centerTab === "scripts"
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Code2 size={12} /> Scripts
              </button>
            </div>
            {/* Tab content */}
            <div className="flex-1 min-h-0 p-2">
              {centerTab === "preview" ? (
                <GamePreview />
              ) : centerTab === "assets" ? (
                <AssetBrowser />
              ) : (
                <ScriptRunner />
              )}
            </div>
          </div>

          {/* Bottom: Terminal */}
          <div
            className="bg-zinc-900 rounded-lg border border-zinc-800 p-3 overflow-y-auto"
            style={{ height: terminalHeight }}
          >
            <Terminal />
          </div>
        </div>

        {/* Right: Activity Log */}
        <div className="w-64 bg-zinc-900 rounded-lg border border-zinc-800 p-3 overflow-y-auto">
          <ActivityLog />
        </div>
      </div>
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
