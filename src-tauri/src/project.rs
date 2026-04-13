use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub godot_project_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectManifest {
    pub name: String,
    pub created_at: String,
    pub engine: String,
}

/// Create a new Problocks project with Godot project structure inside it
pub fn create_project(base_dir: &str, name: &str) -> Result<ProjectInfo, String> {
    let project_path = Path::new(base_dir).join(name);
    if project_path.exists() {
        return Err(format!("Project '{}' already exists", name));
    }

    // Create directory structure
    let dirs = [
        "",
        "assets/models",
        "assets/textures",
        "assets/audio",
        "scenes",
        "scripts",
        ".problocks/blender-scripts",
    ];
    for dir in &dirs {
        fs::create_dir_all(project_path.join(dir))
            .map_err(|e| format!("Failed to create {}: {}", dir, e))?;
    }

    // Create Godot project.godot
    let godot_config = format!(
        r#"; Engine configuration file.
; It's best edited using the editor UI and not directly.

[application]
config/name="{}"
run/main_scene="res://scenes/main.tscn"

[rendering]
renderer/rendering_method="gl_compatibility"
"#,
        name
    );
    fs::write(project_path.join("project.godot"), godot_config)
        .map_err(|e| format!("Failed to write project.godot: {}", e))?;

    // Create manifest
    let manifest = ProjectManifest {
        name: name.to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
        engine: "godot".to_string(),
    };
    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
    fs::write(project_path.join(".problocks/manifest.json"), manifest_json)
        .map_err(|e| format!("Failed to write manifest: {}", e))?;

    let path_str = project_path.to_string_lossy().to_string();
    Ok(ProjectInfo {
        name: name.to_string(),
        godot_project_path: path_str.clone(),
        path: path_str,
    })
}

/// Open an existing project by reading its manifest
pub fn open_project(project_path: &str) -> Result<ProjectInfo, String> {
    let path = Path::new(project_path);
    let manifest_path = path.join(".problocks/manifest.json");

    if !manifest_path.exists() {
        return Err("Not a Problocks project (missing .problocks/manifest.json)".to_string());
    }

    let manifest_str = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;
    let manifest: ProjectManifest = serde_json::from_str(&manifest_str)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;

    Ok(ProjectInfo {
        name: manifest.name,
        godot_project_path: project_path.to_string(),
        path: project_path.to_string(),
    })
}

/// List all assets in a project directory
pub fn list_assets(project_path: &str) -> Result<Vec<AssetInfo>, String> {
    let path = Path::new(project_path);
    let mut assets = Vec::new();

    scan_dir(&path.join("assets/models"), "model", "blender", &mut assets);
    scan_dir(&path.join("assets/textures"), "texture", "manual", &mut assets);
    scan_dir(&path.join("assets/audio"), "audio", "manual", &mut assets);
    scan_dir(&path.join("scenes"), "scene", "godot", &mut assets);
    scan_dir(&path.join("scripts"), "script", "godot", &mut assets);

    Ok(assets)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetInfo {
    pub name: String,
    pub path: String,
    pub asset_type: String,
    pub source: String,
    pub size_bytes: u64,
}

fn scan_dir(dir: &Path, asset_type: &str, source: &str, out: &mut Vec<AssetInfo>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let meta = fs::metadata(&path).ok();
                out.push(AssetInfo {
                    name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                    path: path.to_string_lossy().to_string(),
                    asset_type: asset_type.to_string(),
                    source: source.to_string(),
                    size_bytes: meta.map(|m| m.len()).unwrap_or(0),
                });
            }
        }
    }
}
