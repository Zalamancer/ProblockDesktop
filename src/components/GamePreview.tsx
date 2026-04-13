import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Maximize2, Globe } from "lucide-react";
import { bridge } from "../lib/tauri-bridge";
import { useOrchestrator } from "../store/orchestrator-store";
import { convertFileSrc } from "@tauri-apps/api/core";

export function GamePreview() {
  const project = useOrchestrator((s) => s.project);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const checkExport = useCallback(async () => {
    if (!project) {
      setExportPath(null);
      setIframeSrc(null);
      return;
    }
    try {
      const path = await bridge.getHtml5ExportPath();
      setExportPath(path);
      if (path) {
        setIframeSrc(convertFileSrc(path));
      } else {
        setIframeSrc(null);
      }
    } catch {
      setExportPath(null);
      setIframeSrc(null);
    }
  }, [project]);

  useEffect(() => {
    checkExport();
  }, [checkExport, refreshKey]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Globe size={32} className="text-zinc-700" />
        <p className="text-sm text-zinc-500">Open a project to preview</p>
      </div>
    );
  }

  if (!iframeSrc) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Globe size={32} className="text-zinc-700" />
        <p className="text-sm text-zinc-500">No HTML5 export yet</p>
        <p className="text-xs text-zinc-600">Use Pipeline &gt; Export HTML5 to build a preview</p>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
        >
          <RefreshCw size={12} /> Check again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800">
        <span className="text-[10px] text-zinc-500 truncate" title={exportPath ?? ""}>
          HTML5 Preview
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Refresh preview"
          >
            <RefreshCw size={12} />
          </button>
          <button
            onClick={() => {
              const iframe = document.querySelector<HTMLIFrameElement>("#game-preview-iframe");
              iframe?.requestFullscreen?.();
            }}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Fullscreen"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* iframe */}
      <div className="flex-1 min-h-0 bg-black">
        <iframe
          id="game-preview-iframe"
          key={refreshKey}
          src={iframeSrc}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Game Preview"
        />
      </div>
    </div>
  );
}
