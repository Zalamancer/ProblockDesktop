import { useEffect, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
  Trash2,
  Box,
  Gamepad2,
  Cpu,
  Settings,
} from "lucide-react";
import {
  useActivity,
  type ActivityEntry,
  type ActivitySource,
  type ActivityLevel,
} from "../store/activity-store";

const SOURCE_CONFIG: Record<
  ActivitySource,
  { icon: typeof Box; color: string; label: string }
> = {
  blender: { icon: Box, color: "text-orange-400", label: "Blender" },
  godot: { icon: Gamepad2, color: "text-blue-400", label: "Godot" },
  ai: { icon: Cpu, color: "text-purple-400", label: "AI" },
  system: { icon: Settings, color: "text-zinc-400", label: "System" },
};

const LEVEL_ICON: Record<ActivityLevel, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
  pending: Loader2,
};

const LEVEL_COLOR: Record<ActivityLevel, string> = {
  info: "text-zinc-400",
  success: "text-green-400",
  error: "text-red-400",
  pending: "text-yellow-400",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function Entry({ entry }: { entry: ActivityEntry }) {
  const src = SOURCE_CONFIG[entry.source];
  const LevelIcon = LEVEL_ICON[entry.level];
  const SourceIcon = src.icon;

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-zinc-800/50 last:border-0">
      <LevelIcon
        size={14}
        className={`mt-0.5 shrink-0 ${LEVEL_COLOR[entry.level]} ${entry.level === "pending" ? "animate-spin" : ""}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <SourceIcon size={11} className={src.color} />
          <span className={`text-[10px] font-medium ${src.color}`}>
            {src.label}
          </span>
          <span className="text-[10px] text-zinc-600 ml-auto">
            {formatTime(entry.timestamp)}
          </span>
        </div>
        <p className="text-xs text-zinc-300 leading-snug break-words">
          {entry.message}
        </p>
      </div>
    </div>
  );
}

export function ActivityLog() {
  const entries = useActivity((s) => s.entries);
  const clear = useActivity((s) => s.clear);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Activity
        </h2>
        {entries.length > 0 && (
          <button
            onClick={clear}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Clear log"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.length === 0 ? (
          <p className="text-xs text-zinc-500">No activity yet</p>
        ) : (
          <>
            {entries.map((e) => (
              <Entry key={e.id} entry={e} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}
