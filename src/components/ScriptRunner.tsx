import { useState } from "react";
import { Play, ChevronDown, ChevronRight, Code2, Loader2 } from "lucide-react";
import {
  SCRIPT_TEMPLATES,
  type ScriptTemplate,
  type ScriptParam,
} from "../lib/blender-scripts";
import { bridge } from "../lib/tauri-bridge";
import { useOrchestrator } from "../store/orchestrator-store";
import { useActivity } from "../store/activity-store";
import { useToasts } from "../store/toast-store";

export function ScriptRunner() {
  const project = useOrchestrator((s) => s.project);
  const blenderStatus = useOrchestrator((s) => s.blenderStatus);
  const setBlenderStatus = useOrchestrator((s) => s.setBlenderStatus);
  const setBlenderActiveTask = useOrchestrator((s) => s.setBlenderActiveTask);
  const log = useActivity((s) => s.add);
  const toast = useToasts((s) => s.push);

  const [selectedId, setSelectedId] = useState(SCRIPT_TEMPLATES[0].id);
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string | number | boolean>>>({});
  const [showPreview, setShowPreview] = useState(false);

  const template = SCRIPT_TEMPLATES.find((t) => t.id === selectedId)!;
  const isRunning = blenderStatus === "running";

  function getValues(tmpl: ScriptTemplate): Record<string, string | number | boolean> {
    const saved = paramValues[tmpl.id] ?? {};
    const values: Record<string, string | number | boolean> = {};
    for (const p of tmpl.params) {
      values[p.key] = saved[p.key] ?? p.default;
    }
    return values;
  }

  function setParam(key: string, value: string | number | boolean) {
    setParamValues((prev) => ({
      ...prev,
      [selectedId]: { ...getValues(template), [key]: value },
    }));
  }

  async function handleRun() {
    if (!project || isRunning) return;
    const values = getValues(template);
    const script = template.build(values);

    try {
      setBlenderStatus("running");
      setBlenderActiveTask(template.name);
      log("blender", "pending", `Running: ${template.name}`);

      const result = await bridge.runBlenderScript(script);

      if (result.success) {
        setBlenderStatus("idle");
        log("blender", "success", `${template.name} completed`);
        toast("success", `${template.name} completed`);
        if (result.output_files.length > 0) {
          log("blender", "info", `Output: ${result.output_files.join(", ")}`);
        }
      } else {
        setBlenderStatus("error");
        log("blender", "error", `${template.name} failed`);
        toast("error", `${template.name} failed`);
        if (result.stderr) {
          log("blender", "error", result.stderr.slice(0, 200));
        }
      }
    } catch (e: any) {
      setBlenderStatus("error");
      log("blender", "error", `Script error: ${e}`);
      toast("error", `Script error: ${e}`);
    } finally {
      setBlenderActiveTask(null);
    }
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Code2 size={32} className="text-zinc-700" />
        <p className="text-sm text-zinc-500">Open a project to run scripts</p>
      </div>
    );
  }

  const values = getValues(template);
  const previewCode = template.build(values);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Script selector */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Script Template</label>
        <select
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setShowPreview(false);
          }}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
        >
          {SCRIPT_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-zinc-500 mt-1">{template.description}</p>
      </div>

      {/* Parameters */}
      {template.params.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Parameters
          </h3>
          {template.params.map((p) => (
            <ParamField
              key={p.key}
              param={p}
              value={values[p.key]}
              onChange={(v) => setParam(p.key, v)}
              isCustomScript={template.id === "custom"}
            />
          ))}
        </div>
      )}

      {/* Preview toggle */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors self-start"
      >
        {showPreview ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        Preview generated script
      </button>

      {showPreview && (
        <pre className="bg-zinc-800/60 rounded-md p-2 text-[10px] text-zinc-400 font-mono overflow-auto max-h-48 border border-zinc-800">
          {previewCode}
        </pre>
      )}

      {/* Run button */}
      <div className="mt-auto pt-2 border-t border-zinc-800">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:hover:bg-orange-600 rounded-md transition-colors"
        >
          {isRunning ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Running...
            </>
          ) : (
            <>
              <Play size={13} /> Run in Blender
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ParamField({
  param,
  value,
  onChange,
  isCustomScript,
}: {
  param: ScriptParam;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
  isCustomScript: boolean;
}) {
  if (param.type === "boolean") {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500/30"
        />
        <span className="text-xs text-zinc-300">{param.label}</span>
      </label>
    );
  }

  if (isCustomScript && param.key === "script") {
    return (
      <div>
        <label className="text-[10px] text-zinc-500 mb-0.5 block">{param.label}</label>
        <textarea
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-500 resize-y"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div>
      <label className="text-[10px] text-zinc-500 mb-0.5 block">{param.label}</label>
      <input
        type={param.type === "number" ? "number" : "text"}
        value={String(value)}
        onChange={(e) =>
          onChange(param.type === "number" ? Number(e.target.value) : e.target.value)
        }
        step={param.type === "number" ? "0.1" : undefined}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
      />
      <p className="text-[9px] text-zinc-600 mt-0.5">{param.description}</p>
    </div>
  );
}
