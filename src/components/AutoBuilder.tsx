import { useState } from "react";
import { Rocket, Loader2, CheckCircle2, XCircle, Circle } from "lucide-react";
import { bridge } from "../lib/tauri-bridge";
import { useOrchestrator } from "../store/orchestrator-store";
import { useActivity } from "../store/activity-store";
import { useTerminal } from "../store/terminal-store";
import { useToasts } from "../store/toast-store";
import {
  ASSET_SCRIPTS,
  generateMainScene,
  generatePlayerController,
  generateCameraFollow,
  generateProjectGodot,
} from "../lib/auto-build-scripts";

type StepStatus = "pending" | "running" | "done" | "error";

interface BuildStep {
  label: string;
  status: StepStatus;
}

const INITIAL_STEPS: BuildStep[] = [
  { label: "Generate terrain", status: "pending" },
  { label: "Generate trees", status: "pending" },
  { label: "Generate rocks", status: "pending" },
  { label: "Generate player character", status: "pending" },
  { label: "Write player controller script", status: "pending" },
  { label: "Write camera follow script", status: "pending" },
  { label: "Create main scene", status: "pending" },
  { label: "Write project config", status: "pending" },
];

const STEP_ICONS: Record<StepStatus, typeof Circle> = {
  pending: Circle,
  running: Loader2,
  done: CheckCircle2,
  error: XCircle,
};

const STEP_COLORS: Record<StepStatus, string> = {
  pending: "text-zinc-600",
  running: "text-yellow-400",
  done: "text-green-400",
  error: "text-red-400",
};

export function AutoBuilder({ onComplete }: { onComplete?: () => void } = {}) {
  const project = useOrchestrator((s) => s.project);
  const log = useActivity((s) => s.add);
  const pushTerminal = useTerminal((s) => s.push);
  const toast = useToasts((s) => s.push);
  const [steps, setSteps] = useState<BuildStep[]>(INITIAL_STEPS);
  const [building, setBuilding] = useState(false);
  const [completed, setCompleted] = useState(false);

  function updateStep(index: number, status: StepStatus) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    );
  }

  async function runBuild() {
    if (!project || building) return;
    setBuilding(true);
    setCompleted(false);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));

    pushTerminal("system", "═══ AUTO BUILD STARTED ═══");
    log("system", "pending", "Auto-building game...");

    try {
      // Steps 0-3: Generate assets in Blender
      for (let i = 0; i < ASSET_SCRIPTS.length; i++) {
        const asset = ASSET_SCRIPTS[i];
        updateStep(i, "running");
        pushTerminal("system", `▸ Generating ${asset.name}...`);

        const result = await bridge.runBlenderScript(asset.script);

        if (result.success) {
          updateStep(i, "done");
          pushTerminal("blender", `✓ ${asset.name} exported as ${asset.filename}`);
        } else {
          updateStep(i, "error");
          pushTerminal("blender", `✗ ${asset.name} failed: ${result.stderr.slice(0, 200)}`);
          throw new Error(`Failed to generate ${asset.name}`);
        }
      }

      // Step 4: Write player controller
      updateStep(4, "running");
      pushTerminal("system", "▸ Writing player controller...");
      await bridge.writeProjectFile("scripts/player_controller.gd", generatePlayerController());
      updateStep(4, "done");
      pushTerminal("godot", "✓ player_controller.gd written");

      // Step 5: Write camera follow
      updateStep(5, "running");
      pushTerminal("system", "▸ Writing camera follow script...");
      await bridge.writeProjectFile("scripts/camera_follow.gd", generateCameraFollow());
      updateStep(5, "done");
      pushTerminal("godot", "✓ camera_follow.gd written");

      // Step 6: Create main scene
      updateStep(6, "running");
      pushTerminal("system", "▸ Creating main scene...");
      await bridge.writeProjectFile("scenes/main.tscn", generateMainScene());
      updateStep(6, "done");
      pushTerminal("godot", "✓ main.tscn created with terrain, trees, rocks, player");

      // Step 7: Write project.godot
      updateStep(7, "running");
      pushTerminal("system", "▸ Writing project config...");
      await bridge.writeProjectFile("project.godot", generateProjectGodot(project.name));
      updateStep(7, "done");
      pushTerminal("godot", "✓ project.godot configured");

      pushTerminal("system", "═══ AUTO BUILD COMPLETE ═══");
      pushTerminal("system", 'Click "Open Godot" to see your game, or "Run Game" to play!');
      log("system", "success", "Game auto-built successfully!");
      toast("success", "Game built! Switching to Preview...");
      setCompleted(true);
      // Switch to live preview after a short delay
      setTimeout(() => onComplete?.(), 500);
    } catch (e: any) {
      pushTerminal("system", `═══ BUILD FAILED: ${e} ═══`);
      log("system", "error", `Auto-build failed: ${e}`);
      toast("error", `Build failed: ${e}`);
    } finally {
      setBuilding(false);
    }
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Rocket size={32} className="text-zinc-700" />
        <p className="text-sm text-zinc-500">Open a project first</p>
        <p className="text-xs text-zinc-600">Use New/Open in the Pipeline panel</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
          Auto Builder
        </h2>
        <p className="text-xs text-zinc-500">
          Generate a complete low-poly 3D game with one click.
          Blender creates the assets, Godot gets the scene + scripts.
        </p>
      </div>

      {/* Step list */}
      <div className="flex-1 space-y-1.5 mb-4">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.status];
          return (
            <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
              <Icon
                size={14}
                className={`shrink-0 ${STEP_COLORS[step.status]} ${step.status === "running" ? "animate-spin" : ""}`}
              />
              <span className={`text-xs ${step.status === "done" ? "text-zinc-300" : step.status === "error" ? "text-red-300" : "text-zinc-500"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Build button */}
      <div className="mt-auto pt-3 border-t border-zinc-800">
        {completed && (
          <p className="text-xs text-green-400 mb-2 text-center">
            Game ready! Use Pipeline → Open Godot or Run Game
          </p>
        )}
        <button
          onClick={runBuild}
          disabled={building}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 rounded-lg transition-all"
        >
          {building ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Building...
            </>
          ) : (
            <>
              <Rocket size={15} /> Build Game
            </>
          )}
        </button>
      </div>
    </div>
  );
}
