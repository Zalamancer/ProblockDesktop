/**
 * Blender Python scripts that procedurally generate low-poly game assets.
 * Each script creates geometry from scratch and exports as GLB.
 */

export const ASSET_SCRIPTS: { name: string; filename: string; script: string }[] = [
  {
    name: "Terrain",
    filename: "terrain.glb",
    script: `
import bpy, bmesh, random, sys, os

output_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp"

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Create subdivided plane
bpy.ops.mesh.primitive_plane_add(size=20)
terrain = bpy.context.active_object
terrain.name = "Terrain"

# Subdivide
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(terrain.data)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=12)
bmesh.update_edit_mesh(terrain.data)
bpy.ops.object.mode_set(mode='OBJECT')

# Displace vertices for hills
random.seed(42)
for v in terrain.data.vertices:
    dist = (v.co.x**2 + v.co.y**2) ** 0.5
    v.co.z = random.uniform(0, 0.8) * max(0, 1 - dist/12) + random.uniform(-0.1, 0.1)

# Green material
mat = bpy.data.materials.new("Ground")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.2, 0.5, 0.15, 1)
bsdf.inputs["Roughness"].default_value = 0.9
terrain.data.materials.append(mat)

# Smooth shading
bpy.ops.object.shade_flat()

# Export
filepath = os.path.join(output_dir, "terrain.glb")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=filepath, export_format='GLB', use_selection=True)
print(f"[EXPORT] terrain -> {filepath}")
`.trim(),
  },

  {
    name: "Trees",
    filename: "tree.glb",
    script: `
import bpy, random, sys, os, math

output_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp"

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Trunk material
trunk_mat = bpy.data.materials.new("Trunk")
trunk_mat.use_nodes = True
bsdf = trunk_mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.35, 0.2, 0.1, 1)
bsdf.inputs["Roughness"].default_value = 0.95

# Leaves material
leaf_mat = bpy.data.materials.new("Leaves")
leaf_mat.use_nodes = True
bsdf = leaf_mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.15, 0.55, 0.1, 1)
bsdf.inputs["Roughness"].default_value = 0.8

# Create low-poly tree
# Trunk = tapered cylinder
bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.15, radius2=0.08, depth=1.2, location=(0, 0, 0.6))
trunk = bpy.context.active_object
trunk.name = "Trunk"
trunk.data.materials.append(trunk_mat)

# Canopy = 3 stacked cones
for i, (z, r, h) in enumerate([(1.4, 0.8, 0.9), (1.8, 0.65, 0.8), (2.2, 0.45, 0.7)]):
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=r, radius2=0.05, depth=h, location=(0, 0, z))
    canopy = bpy.context.active_object
    canopy.name = f"Canopy_{i}"
    canopy.data.materials.append(leaf_mat)

# Select all and export
bpy.ops.object.select_all(action='SELECT')
filepath = os.path.join(output_dir, "tree.glb")
bpy.ops.export_scene.gltf(filepath=filepath, export_format='GLB', use_selection=True)
print(f"[EXPORT] tree -> {filepath}")
`.trim(),
  },

  {
    name: "Rocks",
    filename: "rock.glb",
    script: `
import bpy, random, sys, os

output_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp"

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Rock material
rock_mat = bpy.data.materials.new("Rock")
rock_mat.use_nodes = True
bsdf = rock_mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.4, 0.38, 0.35, 1)
bsdf.inputs["Roughness"].default_value = 0.95

random.seed(7)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.4, location=(0, 0, 0.2))
rock = bpy.context.active_object
rock.name = "Rock"

# Deform for organic shape
for v in rock.data.vertices:
    v.co.x *= random.uniform(0.7, 1.3)
    v.co.y *= random.uniform(0.7, 1.3)
    v.co.z *= random.uniform(0.6, 1.0)

rock.data.materials.append(rock_mat)
bpy.ops.object.shade_flat()

bpy.ops.object.select_all(action='SELECT')
filepath = os.path.join(output_dir, "rock.glb")
bpy.ops.export_scene.gltf(filepath=filepath, export_format='GLB', use_selection=True)
print(f"[EXPORT] rock -> {filepath}")
`.trim(),
  },

  {
    name: "Player",
    filename: "player.glb",
    script: `
import bpy, sys, os

output_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp"

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Body material
body_mat = bpy.data.materials.new("Body")
body_mat.use_nodes = True
bsdf = body_mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.2, 0.5, 0.9, 1)
bsdf.inputs["Roughness"].default_value = 0.6

# Eye material
eye_mat = bpy.data.materials.new("Eyes")
eye_mat.use_nodes = True
bsdf = eye_mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)

# Body = capsule (cylinder + 2 spheres)
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.25, depth=0.6, location=(0, 0, 0.5))
body = bpy.context.active_object
body.name = "Body"
body.data.materials.append(body_mat)

# Head
bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=0.22, location=(0, 0, 1.0))
head = bpy.context.active_object
head.name = "Head"
head.data.materials.append(body_mat)

# Eyes
for x in [-0.08, 0.08]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=6, ring_count=4, radius=0.05, location=(x, -0.18, 1.05))
    eye = bpy.context.active_object
    eye.name = "Eye"
    eye.data.materials.append(eye_mat)

# Legs
for x in [-0.1, 0.1]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.08, depth=0.3, location=(x, 0, 0.15))
    leg = bpy.context.active_object
    leg.name = "Leg"
    leg.data.materials.append(body_mat)

bpy.ops.object.select_all(action='SELECT')
filepath = os.path.join(output_dir, "player.glb")
bpy.ops.export_scene.gltf(filepath=filepath, export_format='GLB', use_selection=True)
print(f"[EXPORT] player -> {filepath}")
`.trim(),
  },
];

/**
 * Godot scene file (.tscn) for a complete 3D game level.
 * References the GLB assets and sets up player controller + camera.
 */
export function generateMainScene(): string {
  return `[gd_scene load_steps=7 format=3 uid="uid://main"]

[ext_resource type="PackedScene" path="res://assets/models/terrain.glb" id="1"]
[ext_resource type="PackedScene" path="res://assets/models/tree.glb" id="2"]
[ext_resource type="PackedScene" path="res://assets/models/rock.glb" id="3"]
[ext_resource type="PackedScene" path="res://assets/models/player.glb" id="4"]
[ext_resource type="Script" path="res://scripts/player_controller.gd" id="5"]
[ext_resource type="Script" path="res://scripts/camera_follow.gd" id="6"]

[node name="World" type="Node3D"]

[node name="Terrain" parent="." instance=ExtResource("1")]

[node name="Tree1" parent="." instance=ExtResource("2")]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 3, 0, 0.2)

[node name="Tree2" parent="." instance=ExtResource("2")]
transform = Transform3D(0.8, 0, 0, 0, 0.8, 0, 0, 0, 0.8, -4, 2, 0.1)

[node name="Tree3" parent="." instance=ExtResource("2")]
transform = Transform3D(1.2, 0, 0, 0, 1.2, 0, 0, 0, 1.2, 5, -3, 0.3)

[node name="Tree4" parent="." instance=ExtResource("2")]
transform = Transform3D(0.9, 0, 0, 0, 0.9, 0, 0, 0, 0.9, -2, -5, 0.15)

[node name="Rock1" parent="." instance=ExtResource("3")]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 1.5, 1, 0)

[node name="Rock2" parent="." instance=ExtResource("3")]
transform = Transform3D(1.5, 0, 0, 0, 1.5, 0, 0, 0, 1.5, -3, -2, 0)

[node name="Rock3" parent="." instance=ExtResource("3")]
transform = Transform3D(0.7, 0, 0, 0, 0.7, 0, 0, 0, 0.7, 6, 1, 0)

[node name="Player" parent="." instance=ExtResource("4")]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0.5)
script = ExtResource("5")

[node name="Camera3D" type="Camera3D" parent="."]
transform = Transform3D(1, 0, 0, 0, 0.85, 0.53, 0, -0.53, 0.85, 0, 5, 4)
script = ExtResource("6")

[node name="DirectionalLight3D" type="DirectionalLight3D" parent="."]
transform = Transform3D(1, 0, 0, 0, 0.7, -0.7, 0, 0.7, 0.7, 0, 10, 10)
shadow_enabled = true

[node name="WorldEnvironment" type="WorldEnvironment" parent="."]

[sub_resource type="Environment" id="env"]
background_mode = 1
background_color = Color(0.53, 0.76, 0.93, 1)
ambient_light_color = Color(0.6, 0.65, 0.7, 1)
ambient_light_energy = 0.5
`;
}

export function generatePlayerController(): string {
  return `extends Node3D

@export var speed := 5.0
@export var rotation_speed := 3.0

var velocity := Vector3.ZERO

func _physics_process(delta: float) -> void:
\tvar input := Vector3.ZERO

\tif Input.is_action_pressed("ui_right"):
\t\tinput.x += 1
\tif Input.is_action_pressed("ui_left"):
\t\tinput.x -= 1
\tif Input.is_action_pressed("ui_up"):
\t\tinput.z -= 1
\tif Input.is_action_pressed("ui_down"):
\t\tinput.z += 1

\tif input.length() > 0:
\t\tinput = input.normalized()
\t\tvar target_angle := atan2(input.x, input.z)
\t\trotation.y = lerp_angle(rotation.y, target_angle, rotation_speed * delta)

\tvelocity.x = input.x * speed
\tvelocity.z = input.z * speed

\tposition += velocity * delta
\tposition.x = clampf(position.x, -9.0, 9.0)
\tposition.z = clampf(position.z, -9.0, 9.0)
`;
}

export function generateCameraFollow(): string {
  return `extends Camera3D

@export var target_path := NodePath("../Player")
@export var offset := Vector3(0, 5, 4)
@export var smooth_speed := 5.0

var target: Node3D

func _ready() -> void:
\ttarget = get_node(target_path)

func _process(delta: float) -> void:
\tif target:
\t\tvar desired := target.global_position + offset
\t\tglobal_position = global_position.lerp(desired, smooth_speed * delta)
\t\tlook_at(target.global_position, Vector3.UP)
`;
}

export function generateProjectGodot(name: string): string {
  return `; Engine configuration file.
; It's best edited using the editor UI and not directly,
; but it can also be edited via code for automation.

config_version=5

[application]

config/name="${name}"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.6")

[rendering]

renderer/rendering_method="gl_compatibility"
`;
}
