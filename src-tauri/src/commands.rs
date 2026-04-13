use crate::{blender, godot, project};
use notify::RecommendedWatcher;
use std::sync::Mutex;
use tauri::{AppHandle, State};

pub struct AppState {
    pub blender_path: Mutex<Option<String>>,
    pub godot_path: Mutex<Option<String>>,
    pub project_path: Mutex<Option<String>>,
    pub watcher: Mutex<Option<RecommendedWatcher>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            blender_path: Mutex::new(None),
            godot_path: Mutex::new(None),
            project_path: Mutex::new(None),
            watcher: Mutex::new(None),
        }
    }
}

// ── Detection ──────────────────────────────────────

#[tauri::command]
pub fn detect_tools(state: State<'_, AppState>) -> serde_json::Value {
    let bp = blender::detect_blender();
    let gp = godot::detect_godot();

    if let Some(ref p) = bp {
        *state.blender_path.lock().unwrap() = Some(p.clone());
    }
    if let Some(ref p) = gp {
        *state.godot_path.lock().unwrap() = Some(p.clone());
    }

    serde_json::json!({
        "blender": bp,
        "godot": gp,
    })
}

// ── Project ────────────────────────────────────────

#[tauri::command]
pub fn create_project(
    app: AppHandle,
    state: State<'_, AppState>,
    base_dir: String,
    name: String,
) -> Result<project::ProjectInfo, String> {
    let info = project::create_project(&base_dir, &name)?;

    *state.project_path.lock().unwrap() = Some(info.path.clone());

    // Start watching the new project
    let watcher = crate::watcher::watch_project(app, &info.path)?;
    *state.watcher.lock().unwrap() = Some(watcher);

    Ok(info)
}

#[tauri::command]
pub fn open_project(
    app: AppHandle,
    state: State<'_, AppState>,
    project_path: String,
) -> Result<project::ProjectInfo, String> {
    let info = project::open_project(&project_path)?;

    *state.project_path.lock().unwrap() = Some(info.path.clone());

    let watcher = crate::watcher::watch_project(app, &info.path)?;
    *state.watcher.lock().unwrap() = Some(watcher);

    Ok(info)
}

#[tauri::command]
pub fn list_assets(state: State<'_, AppState>) -> Result<Vec<project::AssetInfo>, String> {
    let path = state.project_path.lock().unwrap();
    let path = path.as_ref().ok_or("No project open")?;
    project::list_assets(path)
}

// ── Blender ────────────────────────────────────────

#[tauri::command]
pub async fn run_blender_script(
    app: AppHandle,
    state: State<'_, AppState>,
    script_content: String,
) -> Result<blender::BlenderResult, String> {
    let bp = state.blender_path.lock().unwrap().clone()
        .ok_or("Blender not detected")?;
    let pp = state.project_path.lock().unwrap().clone()
        .ok_or("No project open")?;

    // Write script to temp file inside project
    let script_path = format!("{}/.problocks/blender-scripts/_current.py", pp);
    std::fs::write(&script_path, &script_content)
        .map_err(|e| format!("Failed to write script: {}", e))?;

    blender::run_script(&app, &bp, &script_path, None).await
}

#[tauri::command]
pub fn open_in_blender(state: State<'_, AppState>, file_path: String) -> Result<(), String> {
    let bp = state.blender_path.lock().unwrap().clone()
        .ok_or("Blender not detected")?;

    std::process::Command::new(&bp)
        .arg(&file_path)
        .spawn()
        .map_err(|e| format!("Failed to open Blender: {}", e))?;

    Ok(())
}

// ── Godot ──────────────────────────────────────────

#[tauri::command]
pub async fn open_godot_editor(
    state: State<'_, AppState>,
    scene: Option<String>,
) -> Result<(), String> {
    let gp = state.godot_path.lock().unwrap().clone()
        .ok_or("Godot not detected")?;
    let pp = state.project_path.lock().unwrap().clone()
        .ok_or("No project open")?;

    godot::open_editor(&gp, &pp, scene.as_deref()).await
}

#[tauri::command]
pub async fn run_godot_game(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let gp = state.godot_path.lock().unwrap().clone()
        .ok_or("Godot not detected")?;
    let pp = state.project_path.lock().unwrap().clone()
        .ok_or("No project open")?;

    godot::run_game(&app, &gp, &pp).await
}

#[tauri::command]
pub async fn export_godot_html5(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<godot::GodotExportResult, String> {
    let gp = state.godot_path.lock().unwrap().clone()
        .ok_or("Godot not detected")?;
    let pp = state.project_path.lock().unwrap().clone()
        .ok_or("No project open")?;

    let output_dir = format!("{}/.problocks/html5-export", pp);
    godot::export_html5(&app, &gp, &pp, &output_dir).await
}

#[tauri::command]
pub fn list_godot_files(state: State<'_, AppState>) -> Result<Vec<godot::GodotFileEntry>, String> {
    let pp = state.project_path.lock().unwrap().clone()
        .ok_or("No project open")?;
    Ok(godot::list_project_files(&pp))
}

#[tauri::command]
pub fn get_godot_counts(state: State<'_, AppState>) -> Result<(usize, usize), String> {
    let pp = state.project_path.lock().unwrap().clone()
        .ok_or("No project open")?;
    Ok(godot::count_project_files(&pp))
}

// ── File Writer ───────────────────────────────────

#[tauri::command]
pub fn write_project_file(
    state: State<'_, AppState>,
    relative_path: String,
    content: String,
) -> Result<(), String> {
    let pp = state.project_path.lock().unwrap().clone()
        .ok_or("No project open")?;
    let full_path = std::path::Path::new(&pp).join(&relative_path);

    // Ensure parent directory exists
    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    std::fs::write(&full_path, &content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

// ── Preview ───────────────────────────────────────

#[tauri::command]
pub fn get_html5_export_path(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let pp = state.project_path.lock().unwrap().clone()
        .ok_or("No project open")?;
    let index = format!("{}/.problocks/html5-export/index.html", pp);
    if std::path::Path::new(&index).exists() {
        Ok(Some(index))
    } else {
        Ok(None)
    }
}
