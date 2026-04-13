use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GodotExportResult {
    pub success: bool,
    pub output_path: String,
    pub stdout: String,
    pub stderr: String,
}

/// Detect Godot binary on the system
pub fn detect_godot() -> Option<String> {
    let candidates = if cfg!(target_os = "macos") {
        vec![
            "/Applications/Godot.app/Contents/MacOS/Godot".to_string(),
            which("godot"),
            which("godot4"),
        ]
    } else if cfg!(target_os = "windows") {
        vec![
            which("godot"),
            which("godot4"),
        ]
    } else {
        vec![which("godot"), which("godot4")]
    };

    candidates.into_iter().find(|p| !p.is_empty() && Path::new(p).exists())
}

fn which(name: &str) -> String {
    std::process::Command::new("which")
        .arg(name)
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            }
        })
        .unwrap_or_default()
}

/// Open Godot editor at a specific scene
pub async fn open_editor(
    godot_path: &str,
    project_path: &str,
    scene: Option<&str>,
) -> Result<(), String> {
    let mut cmd = Command::new(godot_path);
    cmd.arg("--editor").arg("--path").arg(project_path);

    if let Some(s) = scene {
        cmd.arg(s);
    }

    cmd.spawn()
        .map_err(|e| format!("Failed to launch Godot editor: {}", e))?;

    Ok(()) // Godot editor runs independently, we don't wait
}

/// Run the game in Godot
pub async fn run_game(
    app: &AppHandle,
    godot_path: &str,
    project_path: &str,
) -> Result<(), String> {
    let mut cmd = Command::new(godot_path);
    cmd.arg("--path")
        .arg(project_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to run game: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let app_clone = app.clone();
    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_clone.emit("godot:stdout", &line);
        }
    });

    Ok(())
}

/// Export project as HTML5 (Web)
pub async fn export_html5(
    app: &AppHandle,
    godot_path: &str,
    project_path: &str,
    output_dir: &str,
) -> Result<GodotExportResult, String> {
    let output_path = Path::new(output_dir).join("index.html");

    // Ensure export directory exists
    std::fs::create_dir_all(output_dir)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    let mut cmd = Command::new(godot_path);
    cmd.arg("--headless")
        .arg("--path")
        .arg(project_path)
        .arg("--export-release")
        .arg("Web")
        .arg(output_path.to_string_lossy().as_ref())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Godot export failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let _ = app.emit("godot:export_complete", &output_path.to_string_lossy().to_string());

    Ok(GodotExportResult {
        success: output.status.success(),
        output_path: output_path.to_string_lossy().to_string(),
        stdout,
        stderr,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GodotFileEntry {
    pub name: String,
    pub path: String,
    pub file_type: String, // "scene" or "script"
}

/// List all scene and script files in a Godot project
pub fn list_project_files(project_path: &str) -> Vec<GodotFileEntry> {
    let root = Path::new(project_path);
    let mut entries = Vec::new();

    fn walk(dir: &Path, root: &Path, entries: &mut Vec<GodotFileEntry>) {
        if let Ok(dir_entries) = std::fs::read_dir(dir) {
            for entry in dir_entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    // Skip hidden directories and .godot cache
                    if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                        if name.starts_with('.') {
                            continue;
                        }
                    }
                    walk(&p, root, entries);
                } else if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                    let file_type = match ext {
                        "tscn" | "scn" => "scene",
                        "gd" | "cs" => "script",
                        _ => continue,
                    };
                    let rel = p.strip_prefix(root).unwrap_or(&p);
                    entries.push(GodotFileEntry {
                        name: p.file_name().unwrap_or_default().to_string_lossy().to_string(),
                        path: rel.to_string_lossy().to_string(),
                        file_type: file_type.to_string(),
                    });
                }
            }
        }
    }

    walk(root, root, &mut entries);
    entries.sort_by(|a, b| a.path.cmp(&b.path));
    entries
}

/// Count scenes and scripts in a Godot project
pub fn count_project_files(project_path: &str) -> (usize, usize) {
    let path = Path::new(project_path);
    let mut scenes = 0;
    let mut scripts = 0;

    fn walk(dir: &Path, scenes: &mut usize, scripts: &mut usize) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    walk(&p, scenes, scripts);
                } else if let Some(ext) = p.extension() {
                    match ext.to_str().unwrap_or("") {
                        "tscn" | "scn" => *scenes += 1,
                        "gd" | "cs" => *scripts += 1,
                        _ => {}
                    }
                }
            }
        }
    }

    walk(path, &mut scenes, &mut scripts);
    (scenes, scripts)
}
