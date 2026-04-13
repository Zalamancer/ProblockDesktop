use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::mpsc;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChangeEvent {
    pub kind: String,  // "created", "modified", "removed"
    pub path: String,
    pub extension: String,
}

/// Start watching a project directory. Emits "fs:change" events to the frontend.
/// Returns a handle that stops watching when dropped.
pub fn watch_project(
    app: AppHandle,
    project_path: &str,
) -> Result<RecommendedWatcher, String> {
    let (tx, rx) = mpsc::channel();

    let mut watcher = RecommendedWatcher::new(tx, Config::default())
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(Path::new(project_path), RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch path: {}", e))?;

    // Spawn a thread to process filesystem events
    std::thread::spawn(move || {
        while let Ok(event_result) = rx.recv() {
            if let Ok(event) = event_result {
                if let Some(change) = classify_event(&event) {
                    let _ = app.emit("fs:change", &change);
                }
            }
        }
    });

    Ok(watcher)
}

fn classify_event(event: &Event) -> Option<FileChangeEvent> {
    let path = event.paths.first()?;
    let ext = path
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    // Only emit for relevant file types
    let relevant = matches!(
        ext.as_str(),
        "glb" | "gltf" | "blend" | "tscn" | "scn" | "gd" | "cs"
            | "png" | "jpg" | "svg" | "wav" | "ogg" | "mp3"
            | "tres" | "res" | "gdshader"
    );

    if !relevant {
        return None;
    }

    let kind = match event.kind {
        EventKind::Create(_) => "created",
        EventKind::Modify(_) => "modified",
        EventKind::Remove(_) => "removed",
        _ => return None,
    };

    Some(FileChangeEvent {
        kind: kind.to_string(),
        path: path.to_string_lossy().to_string(),
        extension: ext,
    })
}
