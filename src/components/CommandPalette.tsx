import { useState, useEffect, useRef, useMemo } from "react";
import {
  FolderPlus,
  FolderOpen,
  Box,
  Gamepad2,
  Play,
  Globe,
  Settings,
  Monitor,
  Code2,
  Clapperboard,
  Trash2,
  Search,
} from "lucide-react";

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Box;
  iconColor?: string;
  handler: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
}

export function CommandPalette({ open, onClose, actions }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [query, actions]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Clamp selection
  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].handler();
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-[420px] max-h-[50vh] flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800">
          <Search size={14} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-zinc-500 px-3 py-4 text-center">No matching commands</p>
          ) : (
            filtered.map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    action.handler();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    i === selectedIndex ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                  }`}
                >
                  <Icon size={15} className={`shrink-0 ${action.iconColor ?? "text-zinc-400"}`} />
                  <span className="text-xs text-zinc-200 flex-1">{action.label}</span>
                  {action.hint && (
                    <span className="text-[10px] text-zinc-600 font-mono">{action.hint}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/** Shared palette actions factory. Call with callbacks to build the action list. */
export function buildPaletteActions(callbacks: {
  newProject: () => void;
  openProject: () => void;
  switchTab: (tab: string) => void;
  openSettings: () => void;
  clearTerminal: () => void;
  openBlender: () => void;
  openGodot: () => void;
  runGame: () => void;
  exportHtml5: () => void;
}): PaletteAction[] {
  return [
    { id: "new-project", label: "New Project", hint: "", icon: FolderPlus, iconColor: "text-zinc-400", handler: callbacks.newProject },
    { id: "open-project", label: "Open Project", hint: "", icon: FolderOpen, iconColor: "text-zinc-400", handler: callbacks.openProject },
    { id: "tab-preview", label: "Switch to Preview", hint: "⌘1", icon: Monitor, iconColor: "text-zinc-400", handler: () => callbacks.switchTab("preview") },
    { id: "tab-assets", label: "Switch to Assets", hint: "⌘2", icon: FolderOpen, iconColor: "text-zinc-400", handler: () => callbacks.switchTab("assets") },
    { id: "tab-scripts", label: "Switch to Scripts", hint: "⌘3", icon: Code2, iconColor: "text-zinc-400", handler: () => callbacks.switchTab("scripts") },
    { id: "tab-scenes", label: "Switch to Scenes", hint: "⌘4", icon: Clapperboard, iconColor: "text-blue-400", handler: () => callbacks.switchTab("scenes") },
    { id: "open-blender", label: "Open Blender", hint: "", icon: Box, iconColor: "text-orange-400", handler: callbacks.openBlender },
    { id: "open-godot", label: "Open Godot Editor", hint: "", icon: Gamepad2, iconColor: "text-blue-400", handler: callbacks.openGodot },
    { id: "run-game", label: "Run Game", hint: "", icon: Play, iconColor: "text-green-400", handler: callbacks.runGame },
    { id: "export-html5", label: "Export HTML5", hint: "", icon: Globe, iconColor: "text-cyan-400", handler: callbacks.exportHtml5 },
    { id: "settings", label: "Open Settings", hint: "⌘,", icon: Settings, iconColor: "text-zinc-400", handler: callbacks.openSettings },
    { id: "clear-terminal", label: "Clear Terminal", hint: "⌘K", icon: Trash2, iconColor: "text-zinc-400", handler: callbacks.clearTerminal },
  ];
}
