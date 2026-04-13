import { useState } from "react";
import {
  Box,
  FileText,
  Image,
  Music,
  Clapperboard,
  LayoutGrid,
  List,
} from "lucide-react";
import { useOrchestrator, type AssetEntry } from "../store/orchestrator-store";

const TYPE_ICON: Record<AssetEntry["type"], typeof Box> = {
  model: Box,
  scene: Clapperboard,
  script: FileText,
  texture: Image,
  audio: Music,
};

const TYPE_COLOR: Record<AssetEntry["type"], string> = {
  model: "text-orange-400",
  scene: "text-blue-400",
  script: "text-green-400",
  texture: "text-pink-400",
  audio: "text-yellow-400",
};

const SOURCE_BADGE: Record<AssetEntry["source"], { label: string; color: string }> = {
  blender: { label: "B", color: "bg-orange-500/20 text-orange-400" },
  godot: { label: "G", color: "bg-blue-500/20 text-blue-400" },
  manual: { label: "M", color: "bg-zinc-500/20 text-zinc-400" },
};

type FilterType = "all" | AssetEntry["type"];
const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "model", label: "Models" },
  { key: "scene", label: "Scenes" },
  { key: "script", label: "Scripts" },
  { key: "texture", label: "Textures" },
  { key: "audio", label: "Audio" },
];

export function AssetBrowser() {
  const assets = useOrchestrator((s) => s.assets);
  const project = useOrchestrator((s) => s.project);
  const [filter, setFilter] = useState<FilterType>("all");
  const [view, setView] = useState<"grid" | "list">("list");

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-zinc-500">Open a project to browse assets</p>
      </div>
    );
  }

  const filtered = filter === "all" ? assets : assets.filter((a) => a.type === filter);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Assets ({filtered.length})
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView("list")}
            className={`p-1 rounded ${view === "list" ? "text-zinc-200 bg-zinc-700" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <List size={13} />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`p-1 rounded ${view === "grid" ? "text-zinc-200 bg-zinc-700" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <LayoutGrid size={13} />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
              filter === f.key
                ? "bg-zinc-600 text-zinc-100"
                : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Asset list/grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-500 mt-4 text-center">
            {filter === "all" ? "No assets yet" : `No ${filter} assets`}
          </p>
        ) : view === "list" ? (
          <div className="space-y-0.5">
            {filtered.map((asset) => (
              <AssetRow key={asset.path} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {filtered.map((asset) => (
              <AssetCard key={asset.path} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetRow({ asset }: { asset: AssetEntry }) {
  const Icon = TYPE_ICON[asset.type];
  const badge = SOURCE_BADGE[asset.source];

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-800/60 cursor-default group">
      <Icon size={14} className={TYPE_COLOR[asset.type]} />
      <span className="text-xs text-zinc-200 truncate flex-1">{asset.name}</span>
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badge.color}`}>
        {badge.label}
      </span>
    </div>
  );
}

function AssetCard({ asset }: { asset: AssetEntry }) {
  const Icon = TYPE_ICON[asset.type];
  const badge = SOURCE_BADGE[asset.source];

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/70 cursor-default">
      <Icon size={22} className={TYPE_COLOR[asset.type]} />
      <span className="text-[10px] text-zinc-300 truncate w-full text-center">
        {asset.name}
      </span>
      <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${badge.color}`}>
        {badge.label}
      </span>
    </div>
  );
}
