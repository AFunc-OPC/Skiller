use tauri::State;

use crate::db::connection::get_connection;
use crate::db::connection::DbConnection;
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
