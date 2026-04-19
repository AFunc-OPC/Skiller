use std::fs;
use std::path::PathBuf;
use tauri::{Manager, State};

use crate::db::connection::{get_connection, DbConnection};
use crate::models::skill::Skill;
use crate::services::{config_service, project_service};
use crate::utils::markdown::parse_skill_markdown;

fn log_action(app: &tauri::AppHandle, level: &str, source: &str, message: &str) {
    if let Some(log_service) = app.try_state::<crate::services::LogService>() {
        log_service.log(Some(app), level, source, message, None);
    }
}

fn get_preset_skill_path(conn: &rusqlite::Connection, preset_id: &str) -> Result<String, String> {
    let presets = config_service::get_tool_presets(conn).map_err(|e| e.to_string())?;
    let preset = presets
        .into_iter()
        .find(|p| p.id == preset_id)
        .ok_or_else(|| format!("Tool preset '{}' not found", preset_id))?;
    Ok(preset.skill_path.trim_matches('/').to_string())
}

fn scan_skills_from_directory(dir: &PathBuf, project_id: &str, preset_id: &str) -> Vec<Skill> {
    let mut skills = Vec::new();

    if !dir.exists() {
        return skills;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                let is_disabled = name.starts_with(".disable.");
                let actual_name = if is_disabled {
                    name.strip_prefix(".disable.").unwrap_or(&name).to_string()
                } else {
                    name.clone()
                };

                let metadata = fs::metadata(&path).ok();
                let updated_at = metadata
                    .and_then(|m| m.modified().ok())
                    .map(|t| {
                        let datetime: chrono::DateTime<chrono::Utc> = t.into();
                        datetime.to_rfc3339()
                    })
                    .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

                let skill_id = format!("project:{}:{}:{}", project_id, preset_id, actual_name);

                let skill_md = path.join("SKILL.md");
                let (parsed_name, description) = if skill_md.exists() {
                    match parse_skill_markdown(&skill_md) {
                        Ok((name, desc)) => (name, desc),
                        Err(_) => (None, None),
                    }
                } else {
                    (None, None)
                };

                let display_name = parsed_name.unwrap_or_else(|| actual_name.clone());

                let skill = Skill {
                    id: skill_id.clone(),
                    name: display_name,
                    description,
                    file_path: path.to_string_lossy().to_string(),
                    source: "project".to_string(),
                    source_metadata: Some(format!("preset:{}", preset_id)),
                    repo_id: Some(project_id.to_string()),
                    tags: vec![],
                    status: if is_disabled {
                        "disabled".to_string()
                    } else {
                        "available".to_string()
                    },
                    created_at: updated_at.clone(),
                    updated_at,
                };

                skills.push(skill);
            }
        }
    }

    skills
}

#[tauri::command]
pub fn get_project_skills(
    db: State<'_, DbConnection>,
    project_id: String,
    preset_id: Option<String>,
) -> Result<Vec<Skill>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    let project =
        project_service::get_project_by_id(&conn, &project_id).map_err(|e| e.to_string())?;

    let preset_id = preset_id.unwrap_or_else(|| {
        project
            .tool_preset_id
            .clone()
            .unwrap_or_else(|| "preset-opencode".to_string())
    });

    let preset_skill_path = get_preset_skill_path(&conn, &preset_id)?;
    let skill_dir = PathBuf::from(&project.path).join(&preset_skill_path);

    Ok(scan_skills_from_directory(
        &skill_dir,
        &project_id,
        &preset_id,
    ))
}

#[tauri::command]
pub fn get_project_skills_by_presets(
    db: State<'_, DbConnection>,
    project_id: String,
) -> Result<Vec<(String, Vec<Skill>)>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    let project =
        project_service::get_project_by_id(&conn, &project_id).map_err(|e| e.to_string())?;
    let presets = config_service::get_tool_presets(&conn).map_err(|e| e.to_string())?;

    let mut result = Vec::new();

    for preset in presets {
        let skill_path = preset.skill_path.trim_matches('/').to_string();
        let skill_dir = PathBuf::from(&project.path).join(&skill_path);
        let skills = scan_skills_from_directory(&skill_dir, &project_id, &preset.id);
        result.push((preset.id.clone(), skills));
    }

    Ok(result)
}

#[tauri::command]
pub fn remove_project_skill(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    project_id: String,
    skill_id: String,
) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    let project =
        project_service::get_project_by_id(&conn, &project_id).map_err(|e| e.to_string())?;

    let parts: Vec<&str> = skill_id.split(':').collect();
    let (preset_id, skill_name) = if parts.len() >= 4 {
        (parts[2].to_string(), parts[3].to_string())
    } else {
        let preset_id = project
            .tool_preset_id
            .clone()
            .unwrap_or_else(|| "preset-opencode".to_string());
        (preset_id, parts.last().unwrap_or(&"").to_string())
    };

    let preset_skill_path = get_preset_skill_path(&conn, &preset_id)?;
    let skill_dir = PathBuf::from(&project.path).join(&preset_skill_path);

    let normal_path = skill_dir.join(&skill_name);
    let disabled_path = skill_dir.join(format!(".disable.{}", skill_name));

    let target_path = if normal_path.exists() {
        normal_path
    } else if disabled_path.exists() {
        disabled_path
    } else {
        return Err(format!("Skill '{}' not found in project", skill_name));
    };

    let skill_name_for_log = target_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&skill_name);

    log_action(
        &app,
        "INFO",
        "project-skill",
        &format!("移除项目技能: {}", skill_name_for_log),
    );

    if target_path.is_dir() {
        fs::remove_dir_all(&target_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn toggle_project_skill_status(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    project_id: String,
    skill_id: String,
) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    let project =
        project_service::get_project_by_id(&conn, &project_id).map_err(|e| e.to_string())?;

    let parts: Vec<&str> = skill_id.split(':').collect();
    let (preset_id, skill_name) = if parts.len() >= 4 {
        (parts[2].to_string(), parts[3].to_string())
    } else {
        let preset_id = project
            .tool_preset_id
            .clone()
            .unwrap_or_else(|| "preset-opencode".to_string());
        (preset_id, parts.last().unwrap_or(&"").to_string())
    };

    let preset_skill_path = get_preset_skill_path(&conn, &preset_id)?;
    let skill_dir = PathBuf::from(&project.path).join(&preset_skill_path);

    let normal_path = skill_dir.join(&skill_name);
    let disabled_path = skill_dir.join(format!(".disable.{}", skill_name));

    let (source_path, target_path, is_disabling) = if normal_path.exists() {
        (normal_path, disabled_path, true)
    } else if disabled_path.exists() {
        (disabled_path, normal_path, false)
    } else {
        return Err(format!("Skill '{}' not found in project", skill_name));
    };

    let action = if is_disabling { "禁用" } else { "启用" };

    log_action(
        &app,
        "INFO",
        "project-skill",
        &format!("{}项目技能: {}", action, skill_name),
    );

    fs::rename(&source_path, &target_path).map_err(|e| e.to_string())?;

    let skill_md_old = target_path.join("SKILL.md");
    let skill_md_new = target_path.join(".disable.SKILL.md");

    if is_disabling {
        if skill_md_old.exists() {
            fs::rename(&skill_md_old, &skill_md_new).map_err(|e| e.to_string())?;
        }
    } else {
        if skill_md_new.exists() {
            fs::rename(&skill_md_new, &skill_md_old).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn batch_remove_project_skills(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    project_id: String,
    skill_ids: Vec<String>,
) -> Result<(), String> {
    for skill_id in skill_ids {
        remove_project_skill(app.clone(), db.clone(), project_id.clone(), skill_id)?;
    }
    Ok(())
}

#[tauri::command]
pub fn batch_toggle_project_skills_status(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    project_id: String,
    skill_ids: Vec<String>,
) -> Result<(), String> {
    for skill_id in skill_ids {
        toggle_project_skill_status(app.clone(), db.clone(), project_id.clone(), skill_id)?;
    }
    Ok(())
}

#[tauri::command]
pub fn check_project_skill_exists(
    db: State<'_, DbConnection>,
    project_id: String,
    preset_id: String,
    skill_name: String,
) -> Result<bool, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    let project =
        project_service::get_project_by_id(&conn, &project_id).map_err(|e| e.to_string())?;

    let preset_skill_path = get_preset_skill_path(&conn, &preset_id)?;
    let skill_dir = PathBuf::from(&project.path).join(&preset_skill_path);
    let normal_path = skill_dir.join(&skill_name);
    let disabled_path = skill_dir.join(format!(".disable.{}", skill_name));

    Ok(normal_path.exists() || disabled_path.exists())
}
