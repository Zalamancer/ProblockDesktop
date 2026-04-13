mod blender;
mod commands;
mod godot;
mod project;
mod watcher;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::detect_tools,
            commands::create_project,
            commands::open_project,
            commands::list_assets,
            commands::run_blender_script,
            commands::open_in_blender,
            commands::open_godot_editor,
            commands::run_godot_game,
            commands::export_godot_html5,
            commands::get_godot_counts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
