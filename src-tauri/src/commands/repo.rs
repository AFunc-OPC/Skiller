use tauri::{AppHandle, Emitter, Manager, State};
use serde::{Deserialize, Serialize};

use crate::db::connection::{get_connection, init_database, DbConnection};
use crate::models::repo::{CreateRepoRequest, Repo, RepoSyncEvent, UpdateRepoRequest};
use crate::services::{repo_service, LogService};

const REPO_SYNC_PROGRESS_EVENT: &str = "repo-sync-progress";

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportableSkill {
    pub name: String,
    pub path: String,
    pub description: Option<String>,
}

fn log_action(app: &AppHandle, level: &str, source: &str, message: &str) {
    if let Some(log_service) = app.try_state::<LogService>() {
        log_service.log(Some(app), level, source, message, None);
    }
}

#[tauri::command]
pub fn get_repos(db: State<'_, DbConnection>) -> Result<Vec<Repo>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    repo_service::get_repos(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_repo(app: AppHandle, request: CreateRepoRequest) -> Result<Repo, String> {
    let repo_url = request.url.clone();
    log_action(&app, "INFO", "repo", &format!("开始添加仓库: {}", repo_url));
    
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    let result = tauri::async_runtime::spawn_blocking(move || {
        let conn = init_database(&app_data_dir).map_err(|e| e.to_string())?;
        repo_service::add_repo(&conn, request).map_err(|e| e.to_string())
    })
    .await
    .map_err(|error| format!("添加仓库任务执行失败: {}", error))?;
    
    match &result {
        Ok(repo) => log_action(&app, "INFO", "repo", &format!("成功添加仓库: {} ({})", repo.name, repo.url)),
        Err(e) => log_action(&app, "ERROR", "repo", &format!("添加仓库失败: {}", e)),
    }
    
    result
}

#[tauri::command]
pub fn update_repo(
    db: State<'_, DbConnection>,
    request: UpdateRepoRequest,
) -> Result<Repo, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    repo_service::update_repo(&conn, request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_repo(db: State<'_, DbConnection>, id: String) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    repo_service::delete_repo(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn refresh_repo(app: AppHandle, id: String, request_id: String) -> Result<(), String> {
    log_action(&app, "INFO", "repo", &format!("开始刷新仓库: {}", id));
    
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();
    
    let app_for_log = app.clone();

    tauri::async_runtime::spawn(async move {
        let request_id_for_task = request_id.clone();
        let repo_id_for_task = id.clone();

        let result = tauri::async_runtime::spawn_blocking(move || {
            let conn = init_database(&app_data_dir).map_err(|e| e.to_string())?;
            repo_service::refresh_repo(&conn, &id).map_err(|e| e.to_string())
        })
        .await;

        let payload = match result {
            Ok(Ok((repo, recovered_by_reclone))) => {
                log_action(&app_for_log, "INFO", "repo", &format!("成功刷新仓库: {}", repo.name));
                RepoSyncEvent {
                    request_id: request_id_for_task,
                    repo_id: repo_id_for_task,
                    status: "success".to_string(),
                    repo: Some(repo),
                    error: None,
                    recovery_action: if recovered_by_reclone {
                        Some("reclone".to_string())
                    } else {
                        None
                    },
                }
            },
            Ok(Err(error)) => {
                log_action(&app_for_log, "ERROR", "repo", &format!("刷新仓库失败: {}", error));
                RepoSyncEvent {
                    request_id: request_id_for_task,
                    repo_id: repo_id_for_task,
                    status: "error".to_string(),
                    repo: None,
                    error: Some(error),
                    recovery_action: None,
                }
            },
            Err(error) => {
                log_action(&app_for_log, "ERROR", "repo", &format!("刷新仓库任务执行失败: {}", error));
                RepoSyncEvent {
                    request_id: request_id_for_task,
                    repo_id: repo_id_for_task,
                    status: "error".to_string(),
                    repo: None,
                    error: Some(format!("同步仓库任务执行失败: {}", error)),
                    recovery_action: None,
                }
            },
        };

        let _ = app.emit(REPO_SYNC_PROGRESS_EVENT, payload);
    });

    Ok(())
}

#[tauri::command]
pub fn list_repo_skills(db: State<'_, DbConnection>, repo_id: String) -> Result<Vec<ImportableSkill>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    repo_service::list_importable_skills(&conn, &repo_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_repo_skill_count(db: State<'_, DbConnection>, repo_id: String) -> Result<usize, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    repo_service::get_repo_skill_count(&conn, &repo_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn repair_repo(app: AppHandle, id: String, request_id: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    tauri::async_runtime::spawn(async move {
        let request_id_for_task = request_id.clone();
        let repo_id_for_task = id.clone();

        let result = tauri::async_runtime::spawn_blocking(move || {
            let conn = init_database(&app_data_dir).map_err(|e| e.to_string())?;
            repo_service::repair_repo(&conn, &id).map_err(|e| e.to_string())
        })
        .await;

        let payload = match result {
            Ok(Ok(repo)) => RepoSyncEvent {
                request_id: request_id_for_task,
                repo_id: repo_id_for_task,
                status: "success".to_string(),
                repo: Some(repo),
                error: None,
                recovery_action: Some("reclone".to_string()),
            },
            Ok(Err(error)) => RepoSyncEvent {
                request_id: request_id_for_task,
                repo_id: repo_id_for_task,
                status: "error".to_string(),
                repo: None,
                error: Some(error),
                recovery_action: None,
            },
            Err(error) => RepoSyncEvent {
                request_id: request_id_for_task,
                repo_id: repo_id_for_task,
                status: "error".to_string(),
                repo: None,
                error: Some(format!("修复仓库任务执行失败: {}", error)),
                recovery_action: None,
            },
        };

        let _ = app.emit(REPO_SYNC_PROGRESS_EVENT, payload);
    });

    Ok(())
}
