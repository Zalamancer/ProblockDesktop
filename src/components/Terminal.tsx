import { useEffect, useRef } from "react";
import { Trash2, Box, Gamepad2, Settings } from "lucide-react";
import { useTerminal, type TerminalLine } from "../store/terminal-store";

const SOURCE_COLOR: Record<TerminalLine["source"], string> = {
  blender: "text-orange-400",
  godot: "text-blue-400",
  system: "text-zinc-500",
};

const SOURCE_ICON: Record<TerminalLine["source"], typeof Box> = {
  blender: Box,
  godot: Gamepad2,
  system: Settings,
};

function Line({ line }: { line: TerminalLine }) {
  const Icon = SOURCE_ICON[line.source];
  return (
    <div className="flex items-start gap-2 leading-5">
      <Icon size={11} className={`mt-1 shrink-0 ${SOURCE_COLOR[line.source]}`} />
      <span className="text-zinc-300 whitespace-pre-wrap break-all">
        {line.text}
      </span>
    </div>
  );
}

export function Terminal() {
  const lines = useTerminal((s) => s.lines);
  const clear = useTerminal((s) => s.clear);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Terminal
        </h2>
        {lines.length > 0 && (
          <button
            onClick={clear}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Clear terminal"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 font-mono text-xs">
        {lines.length === 0 ? (
          <span className="text-zinc-500">Ready.</span>
        ) : (
          <>
            {lines.map((l) => (
              <Line key={l.id} line={l} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}
