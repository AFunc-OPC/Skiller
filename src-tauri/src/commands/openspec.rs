use tauri::State;

use crate::db::connection::get_connection;
use crate::db::connection::DbConnection;
use crate::models::openspec::{
    OpenSpecBoardSnapshot, OpenSpecChangeDetail, OpenSpecDocumentPreview,
};
use crate::services::openspec_service;

#[tauri::command]
pub fn get_openspec_board_snapshot(
    db: State<'_, DbConnection>,
    project_id: String,
) -> Result<OpenSpecBoardSnapshot, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    openspec_service::get_board_snapshot(&conn, &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_openspec_change_detail(
    db: State<'_, DbConnection>,
    project_id: String,
    change_id: String,
) -> Result<OpenSpecChangeDetail, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    openspec_service::get_change_detail(&conn, &project_id, &change_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_openspec_spec_document(
    db: State<'_, DbConnection>,
    project_id: String,
    change_id: String,
    spec_path: String,
) -> Result<OpenSpecDocumentPreview, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    openspec_service::get_spec_document(&conn, &project_id, &change_id, &spec_path)
        .map_err(|e| e.to_string())
}
