use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlenderResult {
    pub success: bool,
    pub output_files: Vec<String>,
    pub stdout: String,
    pub stderr: String,
}

/// Detect Blender binary on the system
pub fn detect_blender() -> Option<String> {
    let candidates = if cfg!(target_os = "macos") {
        vec![
            "/Applications/Blender.app/Contents/MacOS/Blender".to_string(),
            which("blender"),
        ]
    } else if cfg!(target_os = "windows") {
        vec![
            r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe".to_string(),
            r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe".to_string(),
            which("blender"),
        ]
    } else {
        vec![which("blender")]
    };

    candidates.into_iter().find(|p| Path::new(p).exists())
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

/// Run a Blender Python script headlessly, streaming stdout as Tauri events
pub async fn run_script(
    app: &AppHandle,
    blender_path: &str,
    script_path: &str,
    blend_file: Option<&str>,
    output_dir: Option<&str>,
) -> Result<BlenderResult, String> {
    let mut cmd = Command::new(blender_path);
    cmd.arg("--background");

    if let Some(bf) = blend_file {
        cmd.arg(bf);
    }

    cmd.arg("--python").arg(script_path);

    // Pass output directory as custom arg after "--"
    if let Some(dir) = output_dir {
        std::fs::create_dir_all(dir)
            .map_err(|e| format!("Failed to create output dir: {}", e))?;
        cmd.arg("--").arg(dir);
    }

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn Blender: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_clone = app.clone();
    let stdout_handle = tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        let mut collected = String::new();
        while let Ok(Some(line)) = lines.next_line().await {
            collected.push_str(&line);
            collected.push('\n');
            let _ = app_clone.emit("blender:stdout", &line);
        }
        collected
    });

    let stderr_handle = tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        let mut collected = String::new();
        while let Ok(Some(line)) = lines.next_line().await {
            collected.push_str(&line);
            collected.push('\n');
        }
        collected
    });

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Blender process error: {}", e))?;

    let stdout_text = stdout_handle.await.unwrap_or_default();
    let stderr_text = stderr_handle.await.unwrap_or_default();

    // Parse output files from stdout (convention: lines starting with "EXPORT:")
    let output_files: Vec<String> = stdout_text
        .lines()
        .filter_map(|l| l.strip_prefix("EXPORT:").map(|p| p.trim().to_string()))
        .collect();

    Ok(BlenderResult {
        success: status.success(),
        output_files,
        stdout: stdout_text,
        stderr: stderr_text,
    })
}
