use tauri::{AppHandle, Manager, State};

use crate::db::connection::{get_connection, init_database, DbConnection};
use crate::models::clawhub::*;
use crate::services::clawhub_service;
use crate::services::LogService;

fn log_action(app: &AppHandle, level: &str, source: &str, message: &str) {
    if let Some(log_service) = app.try_state::<LogService>() {
        log_service.log(Some(app), level, source, message, None);
    }
}

#[tauri::command]
pub fn clawhub_list_sources(db: State<'_, DbConnection>) -> Result<Vec<ClawhubSource>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    clawhub_service::list_sources(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clawhub_add_source(db: State<'_, DbConnection>, request: CreateClawhubSourceRequest) -> Result<ClawhubSource, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    clawhub_service::add_source(&conn, request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clawhub_update_source(db: State<'_, DbConnection>, request: UpdateClawhubSourceRequest) -> Result<ClawhubSource, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    clawhub_service::update_source(&conn, request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clawhub_delete_source(db: State<'_, DbConnection>, id: String) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    clawhub_service::delete_source(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clawhub_test_connection(app: AppHandle, source_id: String) -> Result<ConnectionTestResult, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    tauri::async_runtime::spawn_blocking(move || {
        let conn = init_database(&app_data_dir).map_err(|e| e.to_string())?;
        clawhub_service::test_connection(&conn, &source_id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn clawhub_explore(app: AppHandle, source_id: String, sort: String, limit: Option<i32>) -> Result<Vec<ClawhubSkill>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    tauri::async_runtime::spawn_blocking(move || {
        let conn = init_database(&app_data_dir).map_err(|e| e.to_string())?;
        clawhub_service::explore(&conn, &source_id, &sort, limit).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn clawhub_search(app: AppHandle, source_id: String, query: String) -> Result<Vec<ClawhubSkill>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    tauri::async_runtime::spawn_blocking(move || {
        let conn = init_database(&app_data_dir).map_err(|e| e.to_string())?;
        clawhub_service::search(&conn, &source_id, &query).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn clawhub_inspect(app: AppHandle, source_id: String, slug: String) -> Result<ClawhubSkillDetail, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    tauri::async_runtime::spawn_blocking(move || {
        let conn = init_database(&app_data_dir).map_err(|e| e.to_string())?;
        clawhub_service::inspect(&conn, &source_id, &slug).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn clawhub_import_skills(app: AppHandle, source_id: String, slugs: Vec<String>, overwrite: bool) -> Result<Vec<ImportSkillResult>, String> {
    let slugs_count = slugs.len();
    let source_id_for_log = source_id.clone();
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    let result = tauri::async_runtime::spawn_blocking(move || {
        let conn = init_database(&app_data_dir).map_err(|e| e.to_string())?;
        clawhub_service::import_skills(&conn, &source_id, &slugs, overwrite, &app_data_dir).map_err(|e| e.to_string())
    })
    .await
    .map_err(|error| format!("Import task failed: {}", error))??;

    log_action(&app, "INFO", "clawhub", &format!("Imported {}/{} skills from source {}", result.iter().filter(|r| r.success).count(), slugs_count, source_id_for_log));

    Ok(result)
}

#[tauri::command]
pub fn clawhub_check_duplicates(db: State<'_, DbConnection>, slugs: Vec<String>) -> Result<Vec<DuplicateCheckResult>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    clawhub_service::check_duplicates(&conn, &slugs).map_err(|e| e.to_string())
}