#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use skiller::db::connection::{init_database, DbConnection};
use skiller::services::LogService;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory")
                .to_string_lossy()
                .to_string();

            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");

            let conn = init_database(&app_data_dir).expect("Failed to initialize database");

            app.manage(DbConnection::new(conn));

            let log_service = LogService::new().expect("Failed to initialize LogService");
            app.manage(log_service);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            skiller::commands::config::get_config,
            skiller::commands::config::set_config,
            skiller::commands::desktop::select_folder,
            skiller::commands::desktop::open_folder,
            skiller::commands::log::get_logs,
            skiller::commands::log::export_logs,
            skiller::commands::log::clear_logs,
            skiller::commands::log::get_log_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
