use tauri::State;

use crate::db::connection::get_connection;
use crate::db::connection::DbConnection;
use crate::models::tag::{
    CreateTagRequest, DeleteTagOptions, MoveTagRequest, Tag, TagGroup, TreeNode, UpdateTagRequest,
};
use crate::services::tag_service;

#[tauri::command]
pub fn get_tags(db: State<'_, DbConnection>) -> Result<Vec<Tag>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    tag_service::get_tags(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tag_groups(db: State<'_, DbConnection>) -> Result<Vec<TagGroup>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    tag_service::get_tag_groups(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_tag(db: State<'_, DbConnection>, request: CreateTagRequest) -> Result<Tag, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    tag_service::create_tag(&conn, request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_tag(db: State<'_, DbConnection>, id: String) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    tag_service::delete_tag(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_tag_with_options(
    db: State<'_, DbConnection>,
    id: String,
    options: DeleteTagOptions,
) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    tag_service::delete_tag_with_options(&conn, &id, options).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tag_tree(db: State<'_, DbConnection>) -> Result<Vec<TreeNode>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    tag_service::get_tag_tree(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tag_subtree(db: State<'_, DbConnection>, tag_id: String) -> Result<TreeNode, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    tag_service::get_tag_subtree(&conn, &tag_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_tag(db: State<'_, DbConnection>, request: UpdateTagRequest) -> Result<Tag, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    tag_service::update_tag(&conn, request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn move_tag(db: State<'_, DbConnection>, request: MoveTagRequest) -> Result<Tag, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    tag_service::move_tag(&conn, request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tag_children(
    db: State<'_, DbConnection>,
    parent_id: Option<String>,
) -> Result<Vec<Tag>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    tag_service::get_tag_children(&conn, parent_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tag_skill_count(db: State<'_, DbConnection>, tag_id: String) -> Result<usize, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    tag_service::get_tag_skill_count(&conn, &tag_id).map_err(|e| e.to_string())
}
