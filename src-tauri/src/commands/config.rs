use tauri::State;

use crate::db::connection::get_connection;
use crate::db::connection::DbConnection;
use crate::models::config::{CreateToolPresetRequest, ToolPreset, UpdateToolPresetRequest};
use crate::services::config_service;

#[tauri::command]
pub fn get_config(db: State<'_, DbConnection>, key: String) -> Result<Option<String>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    config_service::get_config(&conn, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_config(db: State<'_, DbConnection>, key: String, value: String) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    config_service::set_config(&conn, &key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tool_presets(db: State<'_, DbConnection>) -> Result<Vec<ToolPreset>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    config_service::get_tool_presets(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_tool_preset(
    db: State<'_, DbConnection>,
    request: CreateToolPresetRequest,
) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    config_service::create_tool_preset(&conn, &request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_tool_preset(
    db: State<'_, DbConnection>,
    request: UpdateToolPresetRequest,
) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    config_service::update_tool_preset(&conn, &request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_tool_preset(db: State<'_, DbConnection>, id: String) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    config_service::delete_tool_preset(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_storage_path() -> String {
    let home = dirs::home_dir().expect("Unable to get home directory");
    home.join(".skiller").to_string_lossy().to_string()
}
