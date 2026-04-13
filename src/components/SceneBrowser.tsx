import { useEffect, useState } from "react";
import { Clapperboard, FileText, RefreshCw, FolderOpen } from "lucide-react";
import { bridge, type GodotFileEntry } from "../lib/tauri-bridge";
import { useOrchestrator } from "../store/orchestrator-store";
import { useActivity } from "../store/activity-store";

type FilterMode = "all" | "scene" | "script";

export function SceneBrowser() {
  const project = useOrchestrator((s) => s.project);
  const setGodotStatus = useOrchestrator((s) => s.setGodotStatus);
  const log = useActivity((s) => s.add);
  const [files, setFiles] = useState<GodotFileEntry[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!project) return;
    setLoading(true);
    try {
      const list = await bridge.listGodotFiles();
      setFiles(list);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  async function handleOpenScene(file: GodotFileEntry) {
    if (!project) return;
    try {
      setGodotStatus("running");
      await bridge.openGodotEditor(file.path);
      log("godot", "info", `Opened: ${file.name}`);
    } catch (e: any) {
      setGodotStatus("error");
      log("godot", "error", `Failed to open: ${e}`);
    }
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Clapperboard size={32} className="text-zinc-700" />
        <p className="text-sm text-zinc-500">Open a project to browse scenes</p>
      </div>
    );
  }

  const filtered = filter === "all" ? files : files.filter((f) => f.file_type === filter);
  const sceneCount = files.filter((f) => f.file_type === "scene").length;
  const scriptCount = files.filter((f) => f.file_type === "script").length;

  // Group files by directory
  const grouped = new Map<string, GodotFileEntry[]>();
  for (const file of filtered) {
    const dir = file.path.includes("/")
      ? file.path.substring(0, file.path.lastIndexOf("/"))
      : ".";
    if (!grouped.has(dir)) grouped.set(dir, []);
    grouped.get(dir)!.push(file);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Scenes & Scripts
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setFilter("all")}
          className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
            filter === "all" ? "bg-zinc-600 text-zinc-100" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          All ({files.length})
        </button>
        <button
          onClick={() => setFilter("scene")}
          className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
            filter === "scene" ? "bg-blue-600/30 text-blue-300" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Scenes ({sceneCount})
        </button>
        <button
          onClick={() => setFilter("script")}
          className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
            filter === "script" ? "bg-green-600/30 text-green-300" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Scripts ({scriptCount})
        </button>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-500 mt-4 text-center">
            {files.length === 0 ? "No scenes or scripts found" : "No matches"}
          </p>
        ) : (
          Array.from(grouped.entries()).map(([dir, dirFiles]) => (
            <div key={dir} className="mb-2">
              <div className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-zinc-500">
                <FolderOpen size={10} />
                <span>{dir}</span>
              </div>
              {dirFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => handleOpenScene(file)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60 rounded-md transition-colors text-left"
                >
                  {file.file_type === "scene" ? (
                    <Clapperboard size={13} className="text-blue-400 shrink-0" />
                  ) : (
                    <FileText size={13} className="text-green-400 shrink-0" />
                  )}
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
