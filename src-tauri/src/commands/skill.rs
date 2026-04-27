use tauri::State;

use crate::db::connection::get_connection;
use crate::db::connection::DbConnection;
use crate::models::skill::{CreateSkillRequest, Skill, UpdateSkillRequest};
use crate::services::skill_service;

#[tauri::command]
pub fn get_skills(
    db: State<'_, DbConnection>,
    tag_ids: Option<Vec<String>>,
) -> Result<Vec<Skill>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    skill_service::get_skills(&conn, tag_ids).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_skills_by_repo_id(
    db: State<'_, DbConnection>,
    repo_id: String,
) -> Result<Vec<Skill>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    skill_service::get_skills_by_repo_id(&conn, &repo_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_skill(
    db: State<'_, DbConnection>,
    request: CreateSkillRequest,
) -> Result<Skill, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    skill_service::create_skill(&conn, request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_skill(
    db: State<'_, DbConnection>,
    request: UpdateSkillRequest,
) -> Result<Skill, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    skill_service::update_skill(&conn, request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_skill(db: State<'_, DbConnection>, id: String) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    skill_service::delete_skill(&conn, &id).map_err(|e| e.to_string())
}
