use tauri::State;

use crate::db::connection::get_connection;
use crate::db::connection::DbConnection;
use crate::models::project::{CreateProjectRequest, Project, UpdateProjectRequest};
use crate::services::project_service;

#[tauri::command]
pub fn get_projects(db: State<'_, DbConnection>) -> Result<Vec<Project>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    project_service::get_projects(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_project(
    db: State<'_, DbConnection>,
    request: CreateProjectRequest,
) -> Result<Project, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    project_service::create_project(&conn, request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_project(db: State<'_, DbConnection>, id: String) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    project_service::delete_project(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_project(
    db: State<'_, DbConnection>,
    id: String,
    request: UpdateProjectRequest,
) -> Result<Project, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    project_service::update_project(&conn, &id, request).map_err(|e| e.to_string())
}
