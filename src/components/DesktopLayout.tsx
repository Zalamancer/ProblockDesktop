import { useState } from "react";

export function DesktopLayout() {
  const [terminalHeight, setTerminalHeight] = useState(200);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 p-1.5 gap-1.5">
      {/* Top bar */}
      <div className="h-10 flex items-center px-3 bg-zinc-900 rounded-lg border border-zinc-800">
        <span className="text-sm font-semibold tracking-wide">Problocks</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-1.5 min-h-0">
        {/* Left: Pipeline */}
        <div className="w-56 bg-zinc-900 rounded-lg border border-zinc-800 p-3 overflow-y-auto">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Pipeline</h2>
          <p className="text-xs text-zinc-500">No project open</p>
        </div>

        {/* Center: Preview */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div className="flex-1 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center">
            <p className="text-sm text-zinc-500">Game Preview</p>
          </div>

          {/* Bottom: Terminal */}
          <div
            className="bg-zinc-900 rounded-lg border border-zinc-800 p-3 overflow-y-auto"
            style={{ height: terminalHeight }}
          >
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Terminal</h2>
            <p className="text-xs text-zinc-500 font-mono">Ready.</p>
          </div>
        </div>

        {/* Right: Activity Log */}
        <div className="w-64 bg-zinc-900 rounded-lg border border-zinc-800 p-3 overflow-y-auto">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Activity</h2>
          <p className="text-xs text-zinc-500">No activity yet</p>
        </div>
      </div>
    </div>
  );
}
