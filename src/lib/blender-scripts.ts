/** Built-in Blender Python script templates for the asset pipeline. */

export interface ScriptParam {
  key: string;
  label: string;
  type: "string" | "number" | "boolean";
  default: string | number | boolean;
  description: string;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  params: ScriptParam[];
  /** Returns the final Python source with params interpolated. */
  build: (values: Record<string, string | number | boolean>) => string;
}

// ── Templates ─────────────────────────────────────

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: "export-glb",
    name: "Export Active as GLB",
    description: "Export the active Blender object to a GLB file in the project's models folder.",
    params: [
      {
        key: "filename",
        label: "Output filename",
        type: "string",
        default: "model.glb",
        description: "Name of the exported file (with .glb extension)",
      },
      {
        key: "apply_modifiers",
        label: "Apply modifiers",
        type: "boolean",
        default: true,
        description: "Apply all modifiers before export",
      },
    ],
    build: (v) => `
import bpy, os, sys

output_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp"
filepath = os.path.join(output_dir, "${v.filename}")

bpy.ops.export_scene.gltf(
    filepath=filepath,
    export_format='GLB',
    use_selection=True,
    export_apply=${v.apply_modifiers ? "True" : "False"},
)
print(f"[EXPORT] Saved to {filepath}")
`.trim(),
  },

  {
    id: "batch-export-glb",
    name: "Batch Export All Objects",
    description: "Export every mesh object in the scene as individual GLB files.",
    params: [
      {
        key: "apply_modifiers",
        label: "Apply modifiers",
        type: "boolean",
        default: true,
        description: "Apply all modifiers before export",
      },
    ],
    build: (v) => `
import bpy, os, sys

output_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp"

bpy.ops.object.select_all(action='DESELECT')

for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    name = bpy.path.clean_name(obj.name)
    filepath = os.path.join(output_dir, f"{name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_apply=${v.apply_modifiers ? "True" : "False"},
    )
    print(f"[EXPORT] {obj.name} -> {filepath}")
    obj.select_set(False)

print("[DONE] Batch export complete")
`.trim(),
  },

  {
    id: "export-with-textures",
    name: "Export with Embedded Textures",
    description: "Export active object as GLB with all textures packed inside the file.",
    params: [
      {
        key: "filename",
        label: "Output filename",
        type: "string",
        default: "model_textured.glb",
        description: "Name of the exported file",
      },
    ],
    build: (v) => `
import bpy, os, sys

output_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp"
filepath = os.path.join(output_dir, "${v.filename}")

# Pack all images so they embed in GLB
bpy.ops.file.pack_all()

bpy.ops.export_scene.gltf(
    filepath=filepath,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_image_format='AUTO',
)
print(f"[EXPORT] Saved with textures to {filepath}")
`.trim(),
  },

  {
    id: "decimate-and-export",
    name: "Decimate & Export",
    description: "Add a decimate modifier to reduce poly count, then export as GLB. Great for game-ready assets.",
    params: [
      {
        key: "filename",
        label: "Output filename",
        type: "string",
        default: "model_lowpoly.glb",
        description: "Name of the exported file",
      },
      {
        key: "ratio",
        label: "Decimate ratio",
        type: "number",
        default: 0.5,
        description: "Target face ratio (0.1 = 10% of original, 1.0 = no change)",
      },
    ],
    build: (v) => `
import bpy, os, sys

output_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp"
filepath = os.path.join(output_dir, "${v.filename}")

obj = bpy.context.active_object
if obj and obj.type == 'MESH':
    mod = obj.modifiers.new(name="Decimate_Export", type='DECIMATE')
    mod.ratio = ${v.ratio}
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print(f"[DECIMATE] Reduced to {len(obj.data.polygons)} faces")

bpy.ops.export_scene.gltf(
    filepath=filepath,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
)
print(f"[EXPORT] Saved to {filepath}")
`.trim(),
  },

  {
    id: "custom",
    name: "Custom Script",
    description: "Write and run your own Blender Python script.",
    params: [
      {
        key: "script",
        label: "Python script",
        type: "string",
        default: 'import bpy\nprint("Hello from Blender")',
        description: "Full Python script to execute in Blender",
      },
    ],
    build: (v) => String(v.script),
  },
];
