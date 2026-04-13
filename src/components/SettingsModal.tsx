import { X, FolderOpen, Trash2, Box, Gamepad2 } from "lucide-react";
import { useSettings } from "../store/settings-store";
import { dialogs } from "../lib/tauri-bridge";

export function SettingsModal() {
  const {
    settingsOpen,
    closeSettings,
    blenderPathOverride,
    godotPathOverride,
    setBlenderPathOverride,
    setGodotPathOverride,
    recentProjects,
    removeRecentProject,
  } = useSettings();

  if (!settingsOpen) return null;

  async function browseBlender() {
    const path = await dialogs.pickFolder("Select Blender installation");
    if (path) setBlenderPathOverride(path);
  }

  async function browseGodot() {
    const path = await dialogs.pickFolder("Select Godot installation");
    if (path) setGodotPathOverride(path);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={closeSettings}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold">Settings</h2>
          <button
            onClick={closeSettings}
            className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Tool Paths */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Tool Paths
            </h3>
            <p className="text-[10px] text-zinc-600 mb-3">
              Override auto-detected paths. Leave empty to use auto-detection.
            </p>

            {/* Blender */}
            <div className="mb-3">
              <label className="flex items-center gap-1.5 text-xs text-zinc-300 mb-1">
                <Box size={12} className="text-orange-400" /> Blender Path
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={blenderPathOverride ?? ""}
                  onChange={(e) =>
                    setBlenderPathOverride(e.target.value || null)
                  }
                  placeholder="Auto-detect"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <button
                  onClick={browseBlender}
                  className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors"
                >
                  <FolderOpen size={13} className="text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Godot */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-zinc-300 mb-1">
                <Gamepad2 size={12} className="text-blue-400" /> Godot Path
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={godotPathOverride ?? ""}
                  onChange={(e) =>
                    setGodotPathOverride(e.target.value || null)
                  }
                  placeholder="Auto-detect"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <button
                  onClick={browseGodot}
                  className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors"
                >
                  <FolderOpen size={13} className="text-zinc-400" />
                </button>
              </div>
            </div>
          </section>

          {/* Recent Projects */}
          <section>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Recent Projects
            </h3>
            {recentProjects.length === 0 ? (
              <p className="text-xs text-zinc-600">No recent projects</p>
            ) : (
              <div className="space-y-1">
                {recentProjects.map((p) => (
                  <div
                    key={p.path}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-zinc-800/50 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-zinc-200 truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-zinc-600 truncate">
                        {p.path}
                      </div>
                    </div>
                    <button
                      onClick={() => removeRecentProject(p.path)}
                      className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={closeSettings}
            className="px-4 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
