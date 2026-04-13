import { Box, Gamepad2, FolderOpen, Loader2 } from "lucide-react";
import { useOrchestrator } from "../store/orchestrator-store";

export function StatusBar() {
  const project = useOrchestrator((s) => s.project);
  const blenderStatus = useOrchestrator((s) => s.blenderStatus);
  const godotStatus = useOrchestrator((s) => s.godotStatus);
  const blenderActiveTask = useOrchestrator((s) => s.blenderActiveTask);
  const assets = useOrchestrator((s) => s.assets);

  return (
    <div className="h-6 flex items-center justify-between px-3 bg-zinc-900 border-t border-zinc-800 text-[10px] text-zinc-500 shrink-0">
      {/* Left: project path */}
      <div className="flex items-center gap-1.5 min-w-0">
        <FolderOpen size={10} />
        <span className="truncate max-w-[300px]">
          {project ? project.path : "No project open"}
        </span>
      </div>

      {/* Center: active task */}
      <div className="flex items-center gap-1.5">
        {blenderActiveTask && (
          <>
            <Loader2 size={10} className="animate-spin text-orange-400" />
            <span className="text-orange-400">{blenderActiveTask}</span>
          </>
        )}
      </div>

      {/* Right: tool status + asset count */}
      <div className="flex items-center gap-3">
        {project && (
          <span>{assets.length} asset{assets.length !== 1 ? "s" : ""}</span>
        )}

        <div className="flex items-center gap-1">
          <Box size={10} className={blenderStatus === "running" ? "text-green-400" : blenderStatus === "error" ? "text-red-400" : "text-zinc-600"} />
          <span className={blenderStatus === "running" ? "text-green-400" : blenderStatus === "error" ? "text-red-400" : ""}>
            {blenderStatus === "idle" ? "Blender" : blenderStatus === "running" ? "Running" : "Error"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Gamepad2 size={10} className={godotStatus === "running" ? "text-green-400" : godotStatus === "error" ? "text-red-400" : "text-zinc-600"} />
          <span className={godotStatus === "running" ? "text-green-400" : godotStatus === "error" ? "text-red-400" : ""}>
            {godotStatus === "idle" ? "Godot" : godotStatus === "running" ? "Running" : "Error"}
          </span>
        </div>
      </div>
    </div>
  );
}
