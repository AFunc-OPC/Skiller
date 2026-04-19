use dirs::home_dir;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{Emitter, Manager, State};

use crate::db::connection::{get_connection, DbConnection};
use crate::error::SkillerError;
use crate::models::distribution::{DistributeSkillRequest, DistributeSkillResult};
use crate::models::npx_import::{
    AgentsSkillInfo, ConfirmNpxSkillImportResponse, ManagedNpxImportSession, NativeNpxImportResponse,
    NativeNpxProgressEvent, NpxImportLogEntry, NpxImportProgressEvent, NpxImportToolStatus,
    NpxSkillImportSummary, ParsedNpxSkillCommand, PrepareNpxSkillImportResponse, SyncToSkillerResponse,
};
use crate::models::skill::Skill;
use crate::services::{distribution_service, skill_file_service, skill_service, LogService};
use crate::utils::git;
use crate::utils::markdown::parse_skill_markdown;
use crate::utils::shell::{check_command_available, create_shell_command_for_npx, create_shell_command_for_npx_str};

const NPX_IMPORT_PROGRESS_EVENT: &str = "npx-import-progress";
const NATIVE_NPX_PROGRESS_EVENT: &str = "native-npx-progress";

fn log_action(app: &tauri::AppHandle, level: &str, source: &str, message: &str) {
    if let Some(log_service) = app.try_state::<LogService>() {
        log_service.log(Some(app), level, source, message, None);
    }
}

fn push_npx_import_log(
    app: Option<&tauri::AppHandle>,
    request_id: Option<&str>,
    logs: &mut Vec<NpxImportLogEntry>,
    stage: &str,
    message: impl Into<String>,
) {
    let entry = NpxImportLogEntry {
        stage: stage.to_string(),
        message: message.into(),
    };

    logs.push(entry.clone());

    if let (Some(app), Some(request_id)) = (app, request_id) {
        let _ = app.emit(
            NPX_IMPORT_PROGRESS_EVENT,
            NpxImportProgressEvent {
                request_id: request_id.to_string(),
                entry,
            },
        );
    }
}

fn prepare_npx_skill_import_impl(
    app: Option<tauri::AppHandle>,
    command: String,
    request_id: Option<String>,
) -> Result<PrepareNpxSkillImportResponse, String> {
    let app_ref = app.as_ref();
    let request_id_ref = request_id.as_deref();

    if command.trim().is_empty() {
        return Err("请粘贴有效的 npx skills 安装命令".to_string());
    }

    let mut logs = Vec::new();
    push_npx_import_log(app_ref, request_id_ref, &mut logs, "command", "正在校验导入命令...");

    let parsed = parse_npx_skill_command(&command).map_err(|e| e.to_string())?;
    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "command",
        format!("命令校验通过，目标技能：{}", parsed.skill_name),
    );

    let tool_status = NpxImportToolStatus {
        git: check_git_available()?,
        npx: check_npx_available()?,
    };

    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "tools",
        format!(
            "工具检测结果：git={}, npx={}",
            if tool_status.git { "可用" } else { "不可用" },
            if tool_status.npx { "可用" } else { "不可用" }
        ),
    );

    if !tool_status.git {
        return Err("npx 导入接管需要先安装 git".to_string());
    }

    let session_id = uuid::Uuid::new_v4().to_string();
    let session_dir = get_skiller_temp_skills_dir()
        .map_err(|e| e.to_string())?
        .join(&session_id);
    let repo_dir = session_dir.join("repo");

    fs::create_dir_all(&session_dir).map_err(|e| e.to_string())?;

    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "staging",
        format!("已创建暂存会话目录：{}", session_dir.to_string_lossy()),
    );

    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "clone",
        format!("准备克隆仓库：{}", parsed.repo_url),
    );

    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "clone",
        format!("克隆目标目录：{}", repo_dir.to_string_lossy()),
    );

    if let Some(branch) = &parsed.branch {
        push_npx_import_log(
            app_ref,
            request_id_ref,
            &mut logs,
            "clone",
            format!("使用指定分支：{}", branch),
        );
    } else {
        push_npx_import_log(
            app_ref,
            request_id_ref,
            &mut logs,
            "clone",
            "未指定分支，使用仓库默认分支",
        );
    }

    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "clone",
        "开始执行 git clone，这一步可能持续数秒到 1 分钟...",
    );

    let mut clone_output_callback = |line: String| {
        push_npx_import_log(app_ref, request_id_ref, &mut logs, "clone", line);
    };

    if let Err(error) = git::clone_repo(
        &parsed.repo_url,
        parsed.branch.as_deref(),
        &repo_dir,
        Some(&mut clone_output_callback),
    ) {
        let _ = fs::remove_dir_all(&session_dir);
        return Err(error.to_string());
    }

    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "clone",
        "仓库 clone 完成，开始定位技能目录",
    );

    let (relative_skill_path, staged_path) = if let Some(skill_path) = parsed.skill_path.clone().filter(|v| !v.is_empty()) {
        let staged = repo_dir.join(&skill_path);
        if staged.is_dir() {
            (skill_path, staged)
        } else {
            let _ = fs::remove_dir_all(&session_dir);
            return Err(format!("指定路径不存在：{}", skill_path));
        }
    } else {
        match find_skill_directory_by_regex(&repo_dir, &parsed.skill_name) {
            Some(found) => found,
            None => {
                let _ = fs::remove_dir_all(&session_dir);
                return Err(format!(
                    "未找到技能目录：{}。已搜索匹配模式：skills/*/{}, .*/skills/{}, {}",
                    parsed.skill_name, parsed.skill_name, parsed.skill_name, parsed.skill_name
                ));
            }
        }
    };

    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "skill",
        format!("目标技能相对路径：{}", relative_skill_path),
    );

    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "skill",
        format!("技能暂存目录：{}", staged_path.to_string_lossy()),
    );

    if !staged_path.join("SKILL.md").exists() {
        let _ = fs::remove_dir_all(&session_dir);
        return Err(format!(
            "暂存内容缺少 SKILL.md，无法作为技能导入：{}",
            relative_skill_path
        ));
    }

    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "summary",
        format!("已读取技能结构：{}", staged_path.to_string_lossy()),
    );

    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "summary",
        format!("准备写入导入会话元数据：{}", session_id),
    );

    let skiller_skills_dir = get_skiller_skills_dir().map_err(|e| e.to_string())?;
    let exists_in_skiller = skiller_skills_dir.join(&parsed.skill_name).exists();

    let summary = NpxSkillImportSummary {
        skill_name: parsed.skill_name.clone(),
        display_name: parsed.skill_name.clone(),
        repo_url: parsed.repo_url.clone(),
        branch: parsed.branch.clone(),
        skill_path: relative_skill_path,
        staged_path: staged_path.to_string_lossy().to_string(),
        required_tools: vec!["git".to_string(), "npx（仅用于命令来源兼容）".to_string()],
        exists_in_skiller,
    };

    let session = ManagedNpxImportSession {
        session_id: session_id.clone(),
        command: command.clone(),
        parsed: parsed.clone(),
        summary: summary.clone(),
    };
    let session_contents = serde_json::to_string_pretty(&session).map_err(|e| e.to_string())?;
    fs::write(session_metadata_path(&session_dir), session_contents).map_err(|e| e.to_string())?;

    push_npx_import_log(
        app_ref,
        request_id_ref,
        &mut logs,
        "ready",
        "暂存导入准备完成，等待用户确认正式导入",
    );

    Ok(PrepareNpxSkillImportResponse {
        session_id,
        command,
        parsed,
        tools: tool_status,
        logs,
        summary,
    })
}

fn find_skill_directory_by_regex(repo_dir: &Path, skill_name: &str) -> Option<(String, PathBuf)> {
    let escaped = regex::escape(skill_name);
    let dir_pattern = regex::Regex::new(&format!(
        r"^(?:skills/{}|\.[^/]+/skills/{}|{})$",
        escaped, escaped, escaped
    )).ok()?;

    fn scan_by_dir_name(
        base: &Path,
        repo_root: &Path,
        pattern: &regex::Regex,
        depth: usize,
    ) -> Option<(String, PathBuf)> {
        if depth > 3 {
            return None;
        }

        if let Ok(entries) = fs::read_dir(base) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_dir() {
                    continue;
                }

                if let Ok(relative) = path.strip_prefix(repo_root) {
                    let relative_str = relative.to_string_lossy();

                    if pattern.is_match(&relative_str) && path.join("SKILL.md").exists() {
                        return Some((relative_str.to_string(), path));
                    }
                }

                if let Some(found) = scan_by_dir_name(&path, repo_root, pattern, depth + 1) {
                    return Some(found);
                }
            }
        }
        None
    }

    if let Some(found) = scan_by_dir_name(repo_dir, repo_dir, &dir_pattern, 0) {
        return Some(found);
    }

    let skill_md_pattern = regex::Regex::new(&format!(
        r"^(?:skills/[^/]+|\.[^/]+/skills/[^/]+|[^/]+)$"
    )).ok()?;

    fn scan_by_skill_name(
        base: &Path,
        repo_root: &Path,
        pattern: &regex::Regex,
        skill_name: &str,
        depth: usize,
    ) -> Option<(String, PathBuf)> {
        if depth > 3 {
            return None;
        }

        if let Ok(entries) = fs::read_dir(base) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_dir() {
                    continue;
                }

                let skill_md = path.join("SKILL.md");
                if skill_md.exists() {
                    if let Ok(relative) = path.strip_prefix(repo_root) {
                        let relative_str = relative.to_string_lossy();
                        if pattern.is_match(&relative_str) {
                            if let Ok((Some(name), _)) = crate::utils::markdown::parse_skill_markdown(&skill_md) {
                                if name == skill_name {
                                    return Some((relative_str.to_string(), path));
                                }
                            }
                        }
                    }
                }

                if let Some(found) = scan_by_skill_name(&path, repo_root, pattern, skill_name, depth + 1) {
                    return Some(found);
                }
            }
        }
        None
    }

    scan_by_skill_name(repo_dir, repo_dir, &skill_md_pattern, skill_name, 0)
}

fn get_skiller_root_dir() -> Result<PathBuf, SkillerError> {
    let home = home_dir().ok_or_else(|| {
        SkillerError::IoError(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Cannot get home directory",
        ))
    })?;
    let skiller_dir = home.join(".skiller");

    if !skiller_dir.exists() {
        fs::create_dir_all(&skiller_dir)?;
    }

    Ok(skiller_dir)
}

fn get_skiller_skills_dir() -> Result<PathBuf, SkillerError> {
    let skiller_dir = get_skiller_root_dir()?.join("skills");

    if !skiller_dir.exists() {
        fs::create_dir_all(&skiller_dir)?;
    }

    Ok(skiller_dir)
}

fn get_skiller_temp_skills_dir() -> Result<PathBuf, SkillerError> {
    let temp_dir = get_skiller_root_dir()?.join(".temp_skills");

    if !temp_dir.exists() {
        fs::create_dir_all(&temp_dir)?;
    }

    Ok(temp_dir)
}

fn resolve_skill_md_path(skill_path: &str) -> PathBuf {
    let path = PathBuf::from(skill_path);

    if path
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case("SKILL.md"))
    {
        path
    } else {
        path.join("SKILL.md")
    }
}

fn display_absolute_path(path: &Path) -> PathBuf {
    if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()
            .map(|current_dir| current_dir.join(path))
            .unwrap_or_else(|_| path.to_path_buf())
    }
}

fn normalize_relative_path(path: &str) -> String {
    path.trim().trim_matches('/').to_string()
}

fn session_metadata_path(session_dir: &Path) -> PathBuf {
    session_dir.join("session.json")
}

fn copy_directory_to_target(source: &Path, target: &Path) -> Result<(), String> {
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs_extra::dir::copy(
        source,
        target,
        &fs_extra::dir::CopyOptions {
            copy_inside: true,
            content_only: false,
            ..fs_extra::dir::CopyOptions::new()
        },
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

fn parse_npx_skill_command(command: &str) -> Result<ParsedNpxSkillCommand, SkillerError> {
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.len() < 4 {
        return Err(SkillerError::InvalidInput(
            "Expected format: npx skills add <repo-url> --skill <skill-name> OR npx skills add owner/repo@skill-name".to_string(),
        ));
    }

    if parts[0] != "npx" || parts[1] != "skills" || parts[2] != "add" {
        return Err(SkillerError::InvalidInput(
            "Only managed `npx skills add` commands are supported".to_string(),
        ));
    }

    let third_arg = parts[3].trim();

    if third_arg.contains('@') && !third_arg.starts_with("http") {
        return parse_shorthand_format(third_arg, &parts[4..]);
    }

    let repo_url = third_arg.to_string();
    if repo_url.is_empty() {
        return Err(SkillerError::InvalidInput(
            "Repository URL is required".to_string(),
        ));
    }

    let mut skill_name: Option<String> = None;
    let mut branch: Option<String> = None;
    let mut skill_path: Option<String> = None;
    let mut index = 4;

    while index < parts.len() {
        match parts[index] {
            "--skill" => {
                index += 1;
                let value = parts.get(index).ok_or_else(|| {
                    SkillerError::InvalidInput("`--skill` requires a value".to_string())
                })?;
                skill_name = Some(value.trim().to_string());
            }
            "--branch" => {
                index += 1;
                let value = parts.get(index).ok_or_else(|| {
                    SkillerError::InvalidInput("`--branch` requires a value".to_string())
                })?;
                branch = Some(value.trim().to_string());
            }
            "--path" => {
                index += 1;
                let value = parts.get(index).ok_or_else(|| {
                    SkillerError::InvalidInput("`--path` requires a value".to_string())
                })?;
                skill_path = Some(normalize_relative_path(value));
            }
            "-g" | "-y" | "--global" | "--yes" => {
                // Skip these flags (global and yes are not applicable in Skiller context)
            }
            flag => {
                return Err(SkillerError::InvalidInput(format!(
                    "Unsupported flag in npx skills command: {}",
                    flag
                )));
            }
        }

        index += 1;
    }

    let skill_name = skill_name
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| SkillerError::InvalidInput("`--skill` is required".to_string()))?;

    Ok(ParsedNpxSkillCommand {
        repo_url,
        skill_name,
        branch: branch.filter(|value| !value.trim().is_empty()),
        skill_path: skill_path.filter(|value| !value.is_empty()),
    })
}

fn parse_shorthand_format(
    shorthand: &str,
    remaining_parts: &[&str],
) -> Result<ParsedNpxSkillCommand, SkillerError> {
    let at_pos = shorthand.find('@').ok_or_else(|| {
        SkillerError::InvalidInput(
            "Shorthand format requires '@' separator: owner/repo@skill-name".to_string(),
        )
    })?;

    let repo_shorthand = &shorthand[..at_pos];
    let skill_name = shorthand[at_pos + 1..].to_string();

    if skill_name.is_empty() {
        return Err(SkillerError::InvalidInput(
            "Skill name is required after '@'".to_string(),
        ));
    }

    if !repo_shorthand.contains('/') {
        return Err(SkillerError::InvalidInput(
            "Shorthand format requires 'owner/repo': use format like xixu-me/skills@skill-name"
                .to_string(),
        ));
    }

    let repo_url = if repo_shorthand.starts_with("http://") || repo_shorthand.starts_with("https://") {
        repo_shorthand.to_string()
    } else {
        format!("https://github.com/{}", repo_shorthand)
    };

    let mut branch: Option<String> = None;
    let mut skill_path: Option<String> = None;
    let mut index = 0;

    while index < remaining_parts.len() {
        match remaining_parts[index] {
            "--branch" | "-b" => {
                index += 1;
                if let Some(&value) = remaining_parts.get(index) {
                    branch = Some(value.to_string());
                }
            }
            value if value.starts_with("--branch=") => {
                branch = Some(value.split('=').nth(1).unwrap_or("").to_string());
            }
            value if value.starts_with("-b=") => {
                branch = Some(value.split('=').nth(1).unwrap_or("").to_string());
            }
            "--path" | "-p" => {
                index += 1;
                if let Some(&value) = remaining_parts.get(index) {
                    skill_path = Some(normalize_relative_path(value));
                }
            }
            value if value.starts_with("--path=") => {
                skill_path = Some(normalize_relative_path(value.split('=').nth(1).unwrap_or("")));
            }
            value if value.starts_with("-p=") => {
                skill_path = Some(normalize_relative_path(value.split('=').nth(1).unwrap_or("")));
            }
            "-g" | "-y" | "--global" | "--yes" => {
                // Skip these flags
            }
            _ => {}
        }
        index += 1;
    }

    Ok(ParsedNpxSkillCommand {
        repo_url,
        skill_name,
        branch: branch.filter(|value| !value.trim().is_empty()),
        skill_path: skill_path.filter(|value| !value.is_empty()),
    })
}

fn load_session(session_id: &str) -> Result<(PathBuf, ManagedNpxImportSession), SkillerError> {
    let session_dir = get_skiller_temp_skills_dir()?.join(session_id);
    let metadata_path = session_metadata_path(&session_dir);
    let contents = fs::read_to_string(&metadata_path).map_err(|_| {
        SkillerError::ValidationError(format!("Import session not found: {}", session_id))
    })?;
    let session: ManagedNpxImportSession = serde_json::from_str(&contents).map_err(|error| {
        SkillerError::InvalidInput(format!("Failed to read import session: {}", error))
    })?;

    Ok((session_dir, session))
}

#[tauri::command]
pub fn get_file_skills(db: State<'_, DbConnection>) -> Result<Vec<Skill>, String> {
    let skills_dir = get_skiller_skills_dir().map_err(|e| e.to_string())?;
    let mut skills = Vec::new();
    let conn = get_connection(&db).map_err(|e| e.to_string())?;

    if let Ok(entries) = fs::read_dir(&skills_dir) {
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

                let skill_id = path.to_string_lossy().to_string();

                let tags =
                    skill_file_service::get_file_skill_tags(&conn, &skill_id).unwrap_or_default();

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
                    file_path: skill_id,
                    source: "file".to_string(),
                    source_metadata: None,
                    repo_id: None,
                    tags,
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

    Ok(skills)
}

#[tauri::command]
pub fn toggle_skill(app: tauri::AppHandle, skill_id: String) -> Result<(), String> {
    let path = PathBuf::from(&skill_id);
    let parent = path.parent().ok_or("Invalid skill path")?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid skill name")?;

    let is_disabling = !name.starts_with(".disable.");
    let new_name = if is_disabling {
        &format!(".disable.{}", name)
    } else {
        name.strip_prefix(".disable.").unwrap_or(name)
    };

    let new_path = parent.join(new_name);
    fs::rename(&path, &new_path).map_err(|e| e.to_string())?;

    let skill_md_old = new_path.join("SKILL.md");
    let skill_md_new = new_path.join(".disable.SKILL.md");

    if is_disabling {
        if skill_md_old.exists() {
            fs::rename(&skill_md_old, &skill_md_new).map_err(|e| e.to_string())?;
        }
    } else {
        if skill_md_new.exists() {
            fs::rename(&skill_md_new, &skill_md_old).map_err(|e| e.to_string())?;
        }
    }

    let action = if is_disabling { "禁用" } else { "启用" };
    log_action(&app, "INFO", "skill", &format!("{}技能: {}", action, name));

    Ok(())
}

#[tauri::command]
pub fn delete_file_skill(app: tauri::AppHandle, skill_id: String) -> Result<(), String> {
    let path = PathBuf::from(&skill_id);
    let skill_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&skill_id);
    
    log_action(&app, "INFO", "skill", &format!("删除技能: {}", skill_name));
    
    if path.exists() && path.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn unzip_skill(file_path: String) -> Result<(), String> {
    let skills_dir = get_skiller_skills_dir().map_err(|e| e.to_string())?;
    let backup_dir = get_skiller_root_dir()
        .map_err(|e| e.to_string())?
        .join(".backup");
    let temp_dir = get_skiller_root_dir()
        .map_err(|e| e.to_string())?
        .join(".temp");

    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let source_path = PathBuf::from(&file_path);

    let is_directory = source_path.is_dir();
    let is_archive = file_path.ends_with(".zip") || file_path.ends_with(".skill");

    if !is_directory && !is_archive {
        return Err("Unsupported format. Only .zip, .skill files and skill folders are supported.".to_string());
    }

    let (source_content_dir, target_name) = if is_directory {
        let skill_md_path = source_path.join("SKILL.md");
        if !skill_md_path.exists() {
            return Err("导入失败：未找到 SKILL.md 文件。技能文件夹必须包含 SKILL.md 文件。".to_string());
        }
        
        let dir_name = source_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("skill")
            .to_string();
        
        (source_path.clone(), dir_name)
    } else {
        let session_id = uuid::Uuid::new_v4().to_string();
        let temp_extract_dir = temp_dir.join(&session_id);
        fs::create_dir_all(&temp_extract_dir).map_err(|e| e.to_string())?;

        let cleanup_temp = || {
            let _ = fs::remove_dir_all(&temp_extract_dir);
        };

        let file = std::fs::File::open(&source_path).map_err(|e| {
            cleanup_temp();
            format!("Failed to open file: {}", e)
        })?;

        let mut archive = zip::ZipArchive::new(file).map_err(|e| {
            cleanup_temp();
            format!("Failed to read zip archive: {}", e)
        })?;

        archive.extract(&temp_extract_dir).map_err(|e| {
            cleanup_temp();
            format!("Failed to extract zip: {}", e)
        })?;

        let entries: Vec<std::fs::DirEntry> = fs::read_dir(&temp_extract_dir)
            .map_err(|e| {
                cleanup_temp();
                format!("Failed to read extracted directory: {}", e)
            })?
            .filter_map(|e| e.ok())
            .collect();

        let (extracted_dir, name) = if entries.len() == 1 {
            let single_entry = &entries[0];
            if single_entry.path().is_dir() {
                let dir_name = single_entry
                    .file_name()
                    .to_string_lossy()
                    .to_string();
                (single_entry.path().clone(), dir_name)
            } else {
                let zip_file_stem = source_path
                    .file_stem()
                    .and_then(|n| n.to_str())
                    .unwrap_or("skill")
                    .to_string();
                (temp_extract_dir.clone(), zip_file_stem)
            }
        } else {
            let zip_file_stem = source_path
                .file_stem()
                .and_then(|n| n.to_str())
                .unwrap_or("skill")
                .to_string();
            (temp_extract_dir.clone(), zip_file_stem)
        };

        let skill_md_path = extracted_dir.join("SKILL.md");
        if !skill_md_path.exists() {
            cleanup_temp();
            return Err("导入失败：未找到 SKILL.md 文件。技能包必须包含 SKILL.md 文件，请检查压缩包结构。".to_string());
        }

        (extracted_dir, name)
    };

    let target_dir = skills_dir.join(&target_name);

    if target_dir.exists() {
        let timestamp = chrono::Local::now().format("%Y%m%d-%H%M%S");
        let backup_name = format!("{}-{}", target_name, timestamp);
        let backup_path = backup_dir.join(&backup_name);

        fs::create_dir_all(&backup_path).map_err(|e| {
            format!("Failed to create backup directory: {}", e)
        })?;

        fs_extra::dir::copy(
            &target_dir,
            &backup_path,
            &fs_extra::dir::CopyOptions {
                copy_inside: false,
                content_only: false,
                ..fs_extra::dir::CopyOptions::new()
            },
        )
        .map_err(|e| {
            format!("Failed to backup existing skill: {}", e)
        })?;

        fs::remove_dir_all(&target_dir).map_err(|e| {
            format!("Failed to remove existing skill directory: {}", e)
        })?;
    }

    fs::create_dir_all(&target_dir).map_err(|e| {
        format!("Failed to create target directory: {}", e)
    })?;

    let copy_options = fs_extra::dir::CopyOptions {
        content_only: true,
        ..fs_extra::dir::CopyOptions::new()
    };

    fs_extra::dir::copy(&source_content_dir, &target_dir, &copy_options).map_err(|e| {
        format!("Failed to copy skill files: {}", e)
    })?;

    if !is_directory {
        if let Some(parent) = source_content_dir.parent() {
            let _ = fs::remove_dir_all(parent);
        }
    }

    Ok(())
}

#[tauri::command]
pub fn copy_skill(_repo_id: String, skill_path: String) -> Result<(), String> {
    let skills_dir = get_skiller_skills_dir().map_err(|e| e.to_string())?;
    let source_path = PathBuf::from(&skill_path);
    
    let (skill_dir, skill_name) = if source_path.is_file() {
        let parent = source_path.parent().ok_or("Invalid skill path: no parent directory")?;
        let name = parent
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid skill directory name")?;
        (parent.to_path_buf(), name.to_string())
    } else if source_path.is_dir() {
        let name = source_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid skill directory name")?;
        (source_path.clone(), name.to_string())
    } else {
        return Err(format!("Skill path does not exist: {}", skill_path));
    };

    let target_dir = skills_dir.join(&skill_name);
    
    if target_dir.exists() {
        return Err(format!("Skill '{}' already exists in skill center", skill_name));
    }
    
    copy_directory_to_target(&skill_dir, &target_dir)?;

    Ok(())
}

#[tauri::command]
pub fn distribute_skill(
    app: tauri::AppHandle,
    db: State<'_, DbConnection>,
    request: DistributeSkillRequest,
) -> Result<DistributeSkillResult, String> {
    log_action(&app, "INFO", "distribution", &format!("开始分发技能: {}", request.skill_id));
    
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    let result = distribution_service::distribute_skill(&conn, &request).map_err(|e| e.to_string());
    
    match &result {
        Ok(_) => {
            let target_desc = match &request.project_id {
                Some(pid) => format!("项目 {}", pid),
                None => "全局".to_string(),
            };
            log_action(&app, "INFO", "distribution", &format!("成功分发技能到 {}", target_desc))
        },
        Err(e) => log_action(&app, "ERROR", "distribution", &format!("分发技能失败: {}", e)),
    }
    
    result
}

#[tauri::command]
pub fn check_git_available() -> Result<bool, String> {
    Ok(check_command_available("git", "--version"))
}

#[tauri::command]
pub fn check_npx_available() -> Result<bool, String> {
    Ok(check_command_available("npx", "--version"))
}

#[tauri::command]
pub fn diagnose_shell_env() -> Result<serde_json::Value, String> {
    use crate::utils::shell::get_shell_path;
    use std::process::Command;
    
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "unknown".to_string());
    let path_env = std::env::var("PATH").unwrap_or_else(|_| "unknown".to_string());
    let shell_path = get_shell_path();
    
    let git_check = check_command_available("git", "--version");
    let npx_check = check_command_available("npx", "--version");
    let node_check = check_command_available("node", "--version");
    
    let which_npx = if git_check {
        let path = shell_path.clone().unwrap_or_else(|_| path_env.clone());
        Command::new("which")
            .env("PATH", &path)
            .arg("npx")
            .output()
            .ok()
            .and_then(|o| if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            })
    } else {
        None
    };
    
    let which_node = if git_check {
        let path = shell_path.clone().unwrap_or_else(|_| path_env.clone());
        Command::new("which")
            .env("PATH", &path)
            .arg("node")
            .output()
            .ok()
            .and_then(|o| if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            })
    } else {
        None
    };
    
    Ok(serde_json::json!({
        "shell": shell,
        "env_PATH": path_env,
        "shell_PATH": shell_path.unwrap_or_else(|e| format!("error: {}", e)),
        "git_available": git_check,
        "npx_available": npx_check,
        "node_available": node_check,
        "which_npx": which_npx,
        "which_node": which_node,
    }))
}

#[tauri::command]
pub async fn prepare_npx_skill_import(
    app: tauri::AppHandle,
    command: String,
    request_id: String,
) -> Result<PrepareNpxSkillImportResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        prepare_npx_skill_import_impl(Some(app), command, Some(request_id))
    })
    .await
    .map_err(|error| format!("导入准备任务执行失败: {}", error))?
}

#[tauri::command]
pub async fn confirm_npx_skill_import(
    session_id: String,
) -> Result<ConfirmNpxSkillImportResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
    let (session_dir, session) = load_session(&session_id).map_err(|e| e.to_string())?;
    let source_path = PathBuf::from(&session.summary.staged_path);
    if !source_path.is_dir() {
        return Err("暂存技能目录不存在，请重新准备导入".to_string());
    }

    let skill_md_path = source_path.join("SKILL.md");
    if !skill_md_path.exists() {
        let _ = fs::remove_dir_all(&session_dir);
        return Err("导入失败：暂存技能目录中未找到 SKILL.md 文件，无法确认导入。".to_string());
    }

    let target_dir = get_skiller_skills_dir()
        .map_err(|e| e.to_string())?
        .join(&session.summary.skill_name);

    let is_update = target_dir.exists();

    if is_update {
        fs::remove_dir_all(&target_dir).map_err(|e| {
            format!(
                "删除已有技能目录失败：{} - {}",
                session.summary.skill_name, e
            )
        })?;
    }

    copy_directory_to_target(&source_path, &target_dir)?;

    let cleaned_up = fs::remove_dir_all(&session_dir).is_ok();

    Ok(ConfirmNpxSkillImportResponse {
        skill_path: target_dir.to_string_lossy().to_string(),
        imported_skill_name: session.summary.skill_name,
        cleaned_up,
        is_update,
    })
    })
    .await
    .map_err(|error| format!("确认导入任务执行失败: {}", error))?
}

#[tauri::command]
pub async fn cancel_npx_skill_import(session_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let session_dir = get_skiller_temp_skills_dir()
            .map_err(|e| e.to_string())?
            .join(session_id);

        if session_dir.exists() {
            fs::remove_dir_all(&session_dir).map_err(|e| e.to_string())?;
        }

        Ok(())
    })
    .await
    .map_err(|error| format!("取消导入任务执行失败: {}", error))?
}

#[tauri::command]
pub fn execute_npx_command(command: String) -> Result<String, String> {
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Empty command".to_string());
    }

    let output = create_shell_command_for_npx(&parts[1..])
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn get_file_skill_tags(
    db: State<'_, DbConnection>,
    skill_path: String,
) -> Result<Vec<String>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    skill_file_service::get_file_skill_tags(&conn, &skill_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_file_skill_tags(
    db: State<'_, DbConnection>,
    skill_path: String,
    tags: Vec<String>,
) -> Result<(), String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    skill_file_service::update_file_skill_tags(&conn, &skill_path, tags).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_skill_md_content(
    app: tauri::AppHandle,
    skill_id: String,
) -> Result<String, String> {
    let db = app.state::<DbConnection>();
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    
    let skill = skill_service::get_skill_by_id(&conn, &skill_id);
    
    let skill_md_path = if let Ok(skill) = skill {
        resolve_skill_md_path(&skill.file_path)
    } else {
        resolve_skill_md_path(&skill_id)
    };

    let display_path = display_absolute_path(&skill_md_path);
    
    if !skill_md_path.exists() {
        return Err(format!(
            "SKILL.md文件未找到，请检查该技能的可用性。查找路径: {}",
            display_path.display()
        ));
    }
    
    crate::utils::fs::read_file(&skill_md_path)
        .map_err(|e| format!("读取 SKILL.md 失败: {}。文件路径: {}", e, display_path.display()))
}

fn get_agents_skills_dir() -> Result<PathBuf, SkillerError> {
    let home = home_dir().ok_or_else(|| {
        SkillerError::IoError(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Cannot get home directory",
        ))
    })?;
    Ok(home.join(".agents").join("skills"))
}

#[tauri::command]
pub async fn execute_npx_skills_add_native(
    app: tauri::AppHandle,
    command: String,
    request_id: String,
) -> Result<NativeNpxImportResponse, String> {
    use std::io::{BufRead, BufReader};
    use std::sync::Arc;
    use std::thread;

    let command_trimmed = command.trim();
    if !command_trimmed.starts_with("npx skills add") {
        return Err("命令必须以 'npx skills add' 开头".to_string());
    }

    let parsed = parse_npx_skill_command(command_trimmed).map_err(|e| e.to_string())?;
    let skill_name = parsed.skill_name.clone();

    fn ensure_flags(cmd: &str) -> String {
        let has_global = cmd.contains(" -g") || cmd.contains(" --global");
        let has_yes = cmd.contains(" -y") || cmd.contains(" --yes");
        let mut result = cmd.to_string();
        if !has_global {
            result.push_str(" -g");
        }
        if !has_yes {
            result.push_str(" -y");
        }
        result
    }

    let command_with_flags = ensure_flags(command_trimmed);

    let app = Arc::new(app);
    let request_id_clone = request_id.clone();

    let logs = Arc::new(std::sync::Mutex::new(Vec::<String>::new()));

    let mut child = create_shell_command_for_npx_str(
        command_with_flags.strip_prefix("npx ").unwrap_or(&command_with_flags)
    )
        .env("NO_COLOR", "1")
        .env("FORCE_COLOR", "0")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动 npx 命令失败: {}", e))?;

    fn strip_ansi_codes(s: &str) -> String {
        let ansi_regex = regex::Regex::new(
            r"\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]|\x1b\][^\x07]*\x07|\x1b[()][AB012]|\x1b[MX]|\x1b\[?[0-9;]*[a-zA-Z]|\[[\?0-9;]*[hl]"
        ).unwrap();
        let mut result = ansi_regex.replace_all(s, "").to_string();
        result = result.replace("│", "|").replace("─", "-").replace("╭", "+").replace("╮", "+").replace("╰", "+").replace("╯", "+");
        result
    }

    let stdout = child.stdout.take().ok_or("无法获取 stdout")?;
    let stderr = child.stderr.take().ok_or("无法获取 stderr")?;

    let app_clone = Arc::clone(&app);
    let request_id_clone_stdout = request_id_clone.clone();
    let logs_clone_stdout = Arc::clone(&logs);

    let stdout_thread = thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let clean_line = strip_ansi_codes(&line);
            let _ = app_clone.emit(
                NATIVE_NPX_PROGRESS_EVENT,
                NativeNpxProgressEvent {
                    request_id: request_id_clone_stdout.clone(),
                    line: clean_line.clone(),
                    is_error: false,
                },
            );
            if let Ok(mut logs) = logs_clone_stdout.lock() {
                logs.push(clean_line);
            }
        }
    });

    let app_clone = Arc::clone(&app);
    let request_id_clone_stderr = request_id_clone.clone();
    let logs_clone_stderr = Arc::clone(&logs);

    let stderr_thread = thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            let clean_line = strip_ansi_codes(&line);
            let _ = app_clone.emit(
                NATIVE_NPX_PROGRESS_EVENT,
                NativeNpxProgressEvent {
                    request_id: request_id_clone_stderr.clone(),
                    line: clean_line.clone(),
                    is_error: true,
                },
            );
            if let Ok(mut logs) = logs_clone_stderr.lock() {
                logs.push(format!("[stderr] {}", clean_line));
            }
        }
    });

    stdout_thread.join().expect("stdout thread panicked");
    stderr_thread.join().expect("stderr thread panicked");

    let status = child.wait().map_err(|e| format!("等待命令完成失败: {}", e))?;

    let logs_final = logs.lock().map(|l| l.clone()).unwrap_or_default();

    if !status.success() {
        let error_msg = logs_final
            .iter()
            .find(|line| {
                let lower = line.to_lowercase();
                lower.contains("error")
                    || lower.contains("failed")
                    || lower.contains("not found")
                    || lower.contains("invalid")
                    || lower.contains("permission denied")
            })
            .cloned()
            .unwrap_or_else(|| "npx skills add 命令执行失败，请检查技能名称是否正确".to_string());

        return Err(format!("npx skills add 失败: {}", error_msg));
    }

    let agents_skills_dir = get_agents_skills_dir().map_err(|e| e.to_string())?;
    let installed_path = agents_skills_dir.join(&skill_name);
    
    if !installed_path.exists() {
        let installed_skills: Vec<String> = std::fs::read_dir(&agents_skills_dir)
            .map(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .filter(|e| e.path().is_dir())
                    .map(|e| e.file_name().to_string_lossy().to_string())
                    .collect()
            })
            .unwrap_or_default();

        return Err(format!(
            "技能 '{}' 安装失败。可能原因：\n1. 技能名称不存在于指定的仓库中\n2. 网络连接失败\n3. 权限不足\n\n已安装的技能: {:?}",
            skill_name, installed_skills
        ));
    }

    let skiller_skills_dir = get_skiller_skills_dir().map_err(|e| e.to_string())?;
    let target_path = skiller_skills_dir.join(&skill_name);
    let exists_in_skiller = target_path.exists();

    Ok(NativeNpxImportResponse {
        success: true,
        skill_name,
        exists_in_skiller,
        logs: logs_final,
    })
}

#[tauri::command]
pub fn confirm_overwrite_and_sync(skill_name: String) -> Result<String, String> {
    let agents_skills_dir = get_agents_skills_dir().map_err(|e| e.to_string())?;
    let source_path = agents_skills_dir.join(&skill_name);

    if !source_path.exists() {
        let installed_skills: Vec<String> = std::fs::read_dir(&agents_skills_dir)
            .map(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .filter(|e| e.path().is_dir())
                    .map(|e| e.file_name().to_string_lossy().to_string())
                    .collect()
            })
            .unwrap_or_default();

        return Err(format!(
            "技能 '{}' 不存在于 ~/.agents/skills/ 目录。可能已被删除或移动。\n\n当前已安装的技能: {:?}",
            skill_name, installed_skills
        ));
    }

    let skiller_skills_dir = get_skiller_skills_dir().map_err(|e| e.to_string())?;
    let target_path = skiller_skills_dir.join(&skill_name);

    if target_path.exists() {
        fs::remove_dir_all(&target_path).map_err(|e| format!("删除现有技能失败: {}", e))?;
    }

    copy_directory_to_target(&source_path, &target_path)?;

    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn sync_skill_to_skiller(skill_name: String) -> Result<SyncToSkillerResponse, String> {
    let agents_skills_dir = get_agents_skills_dir().map_err(|e| e.to_string())?;
    let source_path = agents_skills_dir.join(&skill_name);

    if !source_path.exists() {
        let installed_skills: Vec<String> = std::fs::read_dir(&agents_skills_dir)
            .map(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .filter(|e| e.path().is_dir())
                    .map(|e| e.file_name().to_string_lossy().to_string())
                    .collect()
            })
            .unwrap_or_default();

        return Err(format!(
            "技能 '{}' 不存在于 ~/.agents/skills/ 目录。可能已被删除或移动。\n\n当前已安装的技能: {:?}",
            skill_name, installed_skills
        ));
    }

    let skiller_skills_dir = get_skiller_skills_dir().map_err(|e| e.to_string())?;
    let target_path = skiller_skills_dir.join(&skill_name);
    let is_update = target_path.exists();

    if is_update {
        fs::remove_dir_all(&target_path).map_err(|e| format!("删除现有技能失败: {}", e))?;
    }

    copy_directory_to_target(&source_path, &target_path)?;

    Ok(SyncToSkillerResponse {
        skill_name,
        skill_path: target_path.to_string_lossy().to_string(),
        is_update,
    })
}

#[tauri::command]
pub fn list_agents_skills() -> Result<Vec<AgentsSkillInfo>, String> {
    let agents_skills_dir = get_agents_skills_dir().map_err(|e| e.to_string())?;

    if !agents_skills_dir.exists() {
        return Ok(Vec::new());
    }

    let mut skills = Vec::new();

    if let Ok(entries) = fs::read_dir(&agents_skills_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                let has_skill_md = path.join("SKILL.md").exists();

                skills.push(AgentsSkillInfo {
                    name,
                    path: path.to_string_lossy().to_string(),
                    has_skill_md,
                });
            }
        }
    }

    Ok(skills)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FoundSkill {
    pub name: String,
    pub description: String,
    pub repo: String,
    pub author: String,
    pub install_command: String,
    pub link: String,
    pub installs: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NpxFindResponse {
    pub success: bool,
    pub skills: Vec<FoundSkill>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct SkillsShApiSkill {
    #[allow(dead_code)]
    id: String,
    #[serde(rename = "skillId")]
    skill_id: String,
    name: String,
    installs: u64,
    source: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct SkillsShApiResponse {
    skills: Vec<SkillsShApiSkill>,
}

#[tauri::command]
pub async fn search_skills_sh_api(keyword: String) -> Result<NpxFindResponse, String> {
    if keyword.trim().is_empty() {
        return Err("搜索关键词不能为空".to_string());
    }

    let url = format!(
        "https://skills.sh/api/search?q={}",
        urlencoding::encode(&keyword)
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("Skiller/1.0")
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("请求 API 失败: {}", e))?;

    if !response.status().is_success() {
        return Ok(NpxFindResponse {
            success: false,
            skills: Vec::new(),
            error: Some(format!("API 返回错误: {}", response.status())),
        });
    }

    let api_response: SkillsShApiResponse = response
        .json()
        .await
        .map_err(|e| format!("解析 API 响应失败: {}", e))?;

    let skills: Vec<FoundSkill> = api_response
        .skills
        .into_iter()
        .map(|s| {
            let (author, repo) = split_repo_source(&s.source);

            FoundSkill {
                name: if s.name.trim().is_empty() {
                    s.skill_id.clone()
                } else {
                    s.name.clone()
                },
                description: String::new(),
                repo,
                author,
                install_command: format!("npx skills add {}@{} -g -y", s.source, s.skill_id),
                link: format!("https://skills.sh/{}/{}", s.source, s.skill_id),
                installs: s.installs,
            }
        })
        .collect();

    Ok(NpxFindResponse {
        success: true,
        skills,
        error: None,
    })
}

#[tauri::command]
pub async fn execute_npx_skills_find(
    app: tauri::AppHandle,
    keyword: String,
    request_id: String,
) -> Result<NpxFindResponse, String> {
    use std::io::{BufRead, BufReader};
    use std::sync::Arc;
    use std::thread;

    if keyword.trim().is_empty() {
        return Err("搜索关键词不能为空".to_string());
    }

    let app = Arc::new(app);
    let request_id_clone = request_id.clone();
    let keyword_clone = keyword.clone();

    let mut child = create_shell_command_for_npx(&["skills", "find", &keyword_clone])
        .env("NO_COLOR", "1")
        .env("FORCE_COLOR", "0")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动 npx skills find 命令失败: {}", e))?;

    fn strip_ansi_codes(s: &str) -> String {
        let ansi_regex = regex::Regex::new(
            r"\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]|\x1b\][^\x07]*\x07|\x1b[()][AB012]|\x1b[MX]|\x1b\[?[0-9;]*[a-zA-Z]|\[[\?0-9;]*[hl]"
        ).unwrap();
        let mut result = ansi_regex.replace_all(s, "").to_string();
        result = result.replace("│", "|").replace("─", "-").replace("╭", "+").replace("╮", "+").replace("╰", "+").replace("╯", "+");
        result
    }

    let stdout = child.stdout.take().ok_or("无法获取 stdout")?;
    let stderr = child.stderr.take().ok_or("无法获取 stderr")?;

    let app_clone = Arc::clone(&app);
    let request_id_clone_stdout = request_id_clone.clone();

    let stdout_thread = thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut lines = Vec::new();
        for line in reader.lines().map_while(Result::ok) {
            let clean_line = strip_ansi_codes(&line);
            let _ = app_clone.emit(
                "npx-find-progress",
                NpxFindProgressEvent {
                    request_id: request_id_clone_stdout.clone(),
                    line: clean_line.clone(),
                    is_error: false,
                },
            );
            lines.push(clean_line);
        }
        lines
    });

    let app_clone = Arc::clone(&app);
    let request_id_clone_stderr = request_id_clone.clone();

    let stderr_thread = thread::spawn(move || {
        let reader = BufReader::new(stderr);
        let mut lines = Vec::new();
        for line in reader.lines().map_while(Result::ok) {
            let clean_line = strip_ansi_codes(&line);
            let _ = app_clone.emit(
                "npx-find-progress",
                NpxFindProgressEvent {
                    request_id: request_id_clone_stderr.clone(),
                    line: clean_line.clone(),
                    is_error: true,
                },
            );
            lines.push(clean_line);
        }
        lines
    });

    let stdout_lines = stdout_thread.join().expect("stdout thread panicked");
    let stderr_lines = stderr_thread.join().expect("stderr thread panicked");

    let status = child.wait().map_err(|e| format!("等待命令完成失败: {}", e))?;

    if !status.success() {
        let error_msg = stderr_lines.join("\n");
        return Ok(NpxFindResponse {
            success: false,
            skills: Vec::new(),
            error: Some(if error_msg.is_empty() {
                "npx skills find 命令执行失败".to_string()
            } else {
                error_msg
            }),
        });
    }

    Ok(NpxFindResponse {
        success: true,
        skills: parse_npx_find_output(&stdout_lines),
        error: None,
    })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct NpxFindProgressEvent {
    request_id: String,
    line: String,
    is_error: bool,
}

fn split_repo_source(source: &str) -> (String, String) {
    let mut parts = source.splitn(2, '/');
    let author = parts.next().unwrap_or("unknown").to_string();
    let repo = parts.next().unwrap_or(source).to_string();
    (author, repo)
}

fn parse_npx_find_output(lines: &[String]) -> Vec<FoundSkill> {
    struct PendingSkill {
        skill: FoundSkill,
        link: Option<String>,
    }

    fn parse_installs(tokens: &[&str]) -> u64 {
        tokens
            .windows(2)
            .find_map(|window| {
                if window[1] == "installs" {
                    window[0].parse::<u64>().ok()
                } else {
                    None
                }
            })
            .unwrap_or(0)
    }

    fn parse_skill_summary_line(trimmed: &str) -> Option<PendingSkill> {
        let tokens: Vec<&str> = trimmed.split_whitespace().collect();
        let skill_token = *tokens.first()?;

        if !skill_token.contains('@') || !skill_token.contains('/') {
            return None;
        }

        let (repo_source, skill_name) = skill_token.split_once('@')?;
        let (author, repo) = split_repo_source(repo_source);

        Some(PendingSkill {
            skill: FoundSkill {
                name: skill_name.to_string(),
                description: String::new(),
                repo,
                author,
                install_command: format!("npx skills add {}@{} -g -y", repo_source, skill_name),
                link: String::new(),
                installs: parse_installs(&tokens),
            },
            link: None,
        })
    }

    let mut skills = Vec::new();
    let mut current: Option<PendingSkill> = None;

    for line in lines {
        let trimmed = line.trim();

        if trimmed.is_empty() {
            if let Some(pending) = current.take() {
                skills.push(FoundSkill {
                    link: pending.link.unwrap_or_default(),
                    ..pending.skill
                });
            }
            continue;
        }

        if trimmed.contains("██")
            || trimmed.contains('▀')
            || trimmed.contains('▄')
            || trimmed.starts_with("Install with")
            || trimmed.starts_with("npm notice")
            || trimmed.starts_with("npm ")
            || trimmed.contains("Changelog")
            || trimmed.contains("To update")
        {
            continue;
        }

        if trimmed.contains("https://skills.sh/") {
            if let Some(pending) = current.as_mut() {
                if let Some(index) = trimmed.find("https://skills.sh/") {
                    pending.link = Some(trimmed[index..].to_string());
                }
            }
            continue;
        }

        if let Some(next_skill) = parse_skill_summary_line(trimmed) {
            if let Some(pending) = current.replace(next_skill) {
                skills.push(FoundSkill {
                    link: pending.link.unwrap_or_default(),
                    ..pending.skill
                });
            }
        }
    }

    if let Some(pending) = current {
        skills.push(FoundSkill {
            link: pending.link.unwrap_or_default(),
            ..pending.skill
        });
    }

    skills
}

#[cfg(test)]
mod tests {
    use super::{
        cancel_npx_skill_import, confirm_npx_skill_import, parse_npx_find_output,
        parse_npx_skill_command, prepare_npx_skill_import_impl, resolve_skill_md_path,
    };
    use git2::{Repository, Signature};
    use std::fs;
    use std::path::{Path, PathBuf};

    struct TestDir {
        path: PathBuf,
    }

    impl TestDir {
        fn new(label: &str) -> Self {
            let path = std::env::temp_dir().join(format!(
                "skiller-npx-import-{label}-{}",
                uuid::Uuid::new_v4()
            ));
            fs::create_dir_all(&path).expect("create temp dir");
            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn create_git_skill_repo(
        root: &Path,
        repo_name: &str,
        skill_name: &str,
        skill_path: Option<&str>,
    ) -> PathBuf {
        create_git_skill_repo_with_content(root, repo_name, skill_name, skill_path, None)
    }

    fn create_git_skill_repo_with_content(
        root: &Path,
        repo_name: &str,
        skill_name: &str,
        skill_path: Option<&str>,
        skill_md_content: Option<&str>,
    ) -> PathBuf {
        let repo_dir = root.join(repo_name);
        fs::create_dir_all(&repo_dir).expect("create repo dir");
        let repo = Repository::init(&repo_dir).expect("init repo");

        let relative_path = skill_path.unwrap_or(skill_name);
        let staged_skill_dir = repo_dir.join(relative_path);
        fs::create_dir_all(&staged_skill_dir).expect("create skill dir");
        
        let md_content = skill_md_content.unwrap_or("# demo skill");
        fs::write(staged_skill_dir.join("SKILL.md"), md_content).expect("write skill file");

        let mut index = repo.index().expect("get index");
        index
            .add_all(["*"], git2::IndexAddOption::DEFAULT, None)
            .expect("add all");
        index.write().expect("write index");
        let tree_id = index.write_tree().expect("write tree");
        let tree = repo.find_tree(tree_id).expect("find tree");
        let signature = Signature::now("Skiller", "skiller@example.com").expect("signature");
        repo.commit(Some("HEAD"), &signature, &signature, "initial", &tree, &[])
            .expect("commit");

        repo_dir
    }

    #[test]
    fn resolves_skill_md_path_from_directory() {
        let resolved = resolve_skill_md_path("/tmp/demo-skill");

        assert_eq!(resolved, PathBuf::from("/tmp/demo-skill/SKILL.md"));
    }

    #[test]
    fn resolves_skill_md_path_without_duplicating_skill_md_suffix() {
        let resolved = resolve_skill_md_path("/tmp/demo-skill/SKILL.md");

        assert_eq!(resolved, PathBuf::from("/tmp/demo-skill/SKILL.md"));
    }

    #[test]
    fn parses_supported_npx_skills_command() {
        let parsed = parse_npx_skill_command(
            "npx skills add https://github.com/demo/skills --skill my-skill --branch main --path packages/my-skill",
        )
        .expect("command should parse");

        assert_eq!(parsed.repo_url, "https://github.com/demo/skills");
        assert_eq!(parsed.skill_name, "my-skill");
        assert_eq!(parsed.branch.as_deref(), Some("main"));
        assert_eq!(parsed.skill_path.as_deref(), Some("packages/my-skill"));
    }

    #[test]
    fn parses_shorthand_npx_skills_command() {
        let parsed = parse_npx_skill_command(
            "npx skills add xixu-me/skills@github-actions-docs -g -y",
        )
        .expect("shorthand command should parse");

        assert_eq!(parsed.repo_url, "https://github.com/xixu-me/skills");
        assert_eq!(parsed.skill_name, "github-actions-docs");
        assert_eq!(parsed.branch, None);
        assert_eq!(parsed.skill_path, None);
    }

    #[test]
    fn parses_shorthand_npx_skills_command_with_branch() {
        let parsed = parse_npx_skill_command(
            "npx skills add owner/repo@my-skill --branch develop -g",
        )
        .expect("shorthand with branch should parse");

        assert_eq!(parsed.repo_url, "https://github.com/owner/repo");
        assert_eq!(parsed.skill_name, "my-skill");
        assert_eq!(parsed.branch.as_deref(), Some("develop"));
    }

    #[test]
    fn parses_shorthand_npx_skills_command_with_path() {
        let parsed = parse_npx_skill_command(
            "npx skills add owner/repo@my-skill --path skills/my-skill -y",
        )
        .expect("shorthand with path should parse");

        assert_eq!(parsed.repo_url, "https://github.com/owner/repo");
        assert_eq!(parsed.skill_name, "my-skill");
        assert_eq!(parsed.skill_path.as_deref(), Some("skills/my-skill"));
    }

    #[test]
    fn parses_npx_find_output_from_cli_lines() {
        let lines = vec![
            "███████╗██╗  ██╗██╗██╗     ██╗     ███████╗".to_string(),
            "Install with npx skills add <owner/repo@skill>".to_string(),
            "".to_string(),
            "samhvw8/dotfiles@frontend-development 141 installs".to_string(),
            "└ https://skills.sh/samhvw8/dotfiles/frontend-development".to_string(),
            "".to_string(),
            "claude-dev-suite/claude-dev-suite@react-hooks 27 installs".to_string(),
            "└ https://skills.sh/claude-dev-suite/claude-dev-suite/react-hooks".to_string(),
        ];

        let skills = parse_npx_find_output(&lines);

        assert_eq!(skills.len(), 2);
        assert_eq!(skills[0].name, "frontend-development");
        assert_eq!(skills[0].author, "samhvw8");
        assert_eq!(skills[0].repo, "dotfiles");
        assert_eq!(skills[0].installs, 141);
        assert_eq!(
            skills[0].install_command,
            "npx skills add samhvw8/dotfiles@frontend-development -g -y"
        );
        assert_eq!(
            skills[0].link,
            "https://skills.sh/samhvw8/dotfiles/frontend-development"
        );

        assert_eq!(skills[1].name, "react-hooks");
        assert_eq!(skills[1].author, "claude-dev-suite");
        assert_eq!(skills[1].repo, "claude-dev-suite");
        assert_eq!(skills[1].installs, 27);
    }

    #[test]
    fn parses_standard_format_with_global_and_yes_flags() {
        let parsed = parse_npx_skill_command(
            "npx skills add https://github.com/demo/skills --skill my-skill -g -y",
        )
        .expect("standard command with -g -y should parse");

        assert_eq!(parsed.repo_url, "https://github.com/demo/skills");
        assert_eq!(parsed.skill_name, "my-skill");
    }

    #[test]
    fn rejects_unsupported_npx_command() {
        let error = parse_npx_skill_command("npx foo add repo --skill demo")
            .expect_err("command should be rejected");

        assert!(error.to_string().contains("Only managed"));
    }

    #[test]
    fn prepares_import_by_staging_git_repo() {
        let repo_root = TestDir::new("prepare-source");
        let repo_dir = create_git_skill_repo(repo_root.path(), "demo-repo", "demo-skill", None);

        let response = prepare_npx_skill_import_impl(
            None,
            format!("npx skills add {} --skill demo-skill", repo_dir.to_string_lossy()),
            None,
        )
        .expect("prepare should succeed");

        assert_eq!(response.summary.skill_name, "demo-skill");
        assert!(PathBuf::from(&response.summary.staged_path)
            .join("SKILL.md")
            .exists());
        assert!(!response.logs.is_empty());

        tauri::async_runtime::block_on(cancel_npx_skill_import(response.session_id))
            .expect("cleanup session");
    }

    #[test]
    fn prepares_import_from_default_skills_directory() {
        let repo_root = TestDir::new("prepare-skills-dir");
        let repo_dir = create_git_skill_repo(
            repo_root.path(),
            "demo-repo",
            "demo-skill",
            Some("skills/demo-skill"),
        );

        let response = prepare_npx_skill_import_impl(
            None,
            format!("npx skills add {} --skill demo-skill", repo_dir.to_string_lossy()),
            None,
        )
        .expect("prepare should succeed from skills directory");

        assert_eq!(response.summary.skill_path, "skills/demo-skill");
        assert!(PathBuf::from(&response.summary.staged_path)
            .join("SKILL.md")
            .exists());

        tauri::async_runtime::block_on(cancel_npx_skill_import(response.session_id))
            .expect("cleanup session");
    }

    #[test]
    fn prepares_import_from_claude_skills_directory() {
        let repo_root = TestDir::new("prepare-claude-skills-dir");
        let repo_dir = create_git_skill_repo(
            repo_root.path(),
            "demo-repo",
            "claude-skill",
            Some(".claude/skills/claude-skill"),
        );

        let response = prepare_npx_skill_import_impl(
            None,
            format!("npx skills add {} --skill claude-skill", repo_dir.to_string_lossy()),
            None,
        )
        .expect("prepare should succeed from .claude/skills directory");

        assert_eq!(response.summary.skill_path, ".claude/skills/claude-skill");
        assert!(PathBuf::from(&response.summary.staged_path)
            .join("SKILL.md")
            .exists());

        tauri::async_runtime::block_on(cancel_npx_skill_import(response.session_id))
            .expect("cleanup session");
    }

    #[test]
    fn prepares_import_from_opencode_skills_directory() {
        let repo_root = TestDir::new("prepare-opencode-skills-dir");
        let repo_dir = create_git_skill_repo(
            repo_root.path(),
            "demo-repo",
            "opencode-skill",
            Some(".opencode/skills/opencode-skill"),
        );

        let response = prepare_npx_skill_import_impl(
            None,
            format!("npx skills add {} --skill opencode-skill", repo_dir.to_string_lossy()),
            None,
        )
        .expect("prepare should succeed from .opencode/skills directory");

        assert_eq!(response.summary.skill_path, ".opencode/skills/opencode-skill");
        assert!(PathBuf::from(&response.summary.staged_path)
            .join("SKILL.md")
            .exists());

        tauri::async_runtime::block_on(cancel_npx_skill_import(response.session_id))
            .expect("cleanup session");
    }

    #[test]
    fn prepares_import_by_skill_md_name_not_dir_name() {
        let repo_root = TestDir::new("prepare-skill-md-name");
        let skill_md = r#"---
name: vercel-react-best-practices
description: React best practices from Vercel
---

# Vercel React Best Practices"#;
        
        let repo_dir = create_git_skill_repo_with_content(
            repo_root.path(),
            "demo-repo",
            "react-rules",
            Some("skills/react-rules"),
            Some(skill_md),
        );

        let response = prepare_npx_skill_import_impl(
            None,
            format!("npx skills add {} --skill vercel-react-best-practices", repo_dir.to_string_lossy()),
            None,
        )
        .expect("prepare should succeed by SKILL.md name");

        assert_eq!(response.summary.skill_path, "skills/react-rules");
        assert!(PathBuf::from(&response.summary.staged_path)
            .join("SKILL.md")
            .exists());

        tauri::async_runtime::block_on(cancel_npx_skill_import(response.session_id))
            .expect("cleanup session");
    }

    #[test]
    fn fails_prepare_when_skill_directory_is_missing() {
        let repo_root = TestDir::new("prepare-missing-skill");
        let repo_dir = create_git_skill_repo(repo_root.path(), "demo-repo", "other-skill", None);

        let error = prepare_npx_skill_import_impl(
            None,
            format!("npx skills add {} --skill demo-skill", repo_dir.to_string_lossy()),
            None,
        )
        .expect_err("prepare should fail");

        assert!(error.contains("未找到技能目录"));
    }

    #[test]
    fn confirms_import_and_cleans_up_session() {
        let skills_root = super::get_skiller_skills_dir().expect("skills dir");
        let imported_target = skills_root.join("confirm-demo-skill");
        if imported_target.exists() {
            fs::remove_dir_all(&imported_target).expect("remove existing imported skill");
        }

        let repo_root = TestDir::new("confirm-source");
        let repo_dir =
            create_git_skill_repo(repo_root.path(), "demo-repo", "confirm-demo-skill", None);

        let prepared = prepare_npx_skill_import_impl(
            None,
            format!(
                "npx skills add {} --skill confirm-demo-skill",
                repo_dir.to_string_lossy()
            ),
            None,
        )
        .expect("prepare should succeed");

        let response = tauri::async_runtime::block_on(confirm_npx_skill_import(
            prepared.session_id.clone(),
        ))
        .expect("confirm should succeed");

        assert_eq!(response.imported_skill_name, "confirm-demo-skill");
        assert!(PathBuf::from(&response.skill_path)
            .join("SKILL.md")
            .exists());
        assert!(!super::get_skiller_temp_skills_dir()
            .expect("temp dir")
            .join(prepared.session_id)
            .exists());

        fs::remove_dir_all(imported_target).expect("cleanup imported skill");
    }

    #[test]
    fn updates_existing_skill_on_confirm() {
        let skills_root = super::get_skiller_skills_dir().expect("skills dir");
        let imported_target = skills_root.join("duplicate-demo-skill");
        if imported_target.exists() {
            fs::remove_dir_all(&imported_target).expect("remove existing target");
        }
        fs::create_dir_all(&imported_target).expect("create duplicate target");
        fs::write(imported_target.join("SKILL.md"), "# old skill content")
            .expect("write target skill");

        let repo_root = TestDir::new("duplicate-source");
        let repo_dir =
            create_git_skill_repo_with_content(
                repo_root.path(),
                "demo-repo",
                "duplicate-demo-skill",
                None,
                Some("# new skill content"),
            );

        let prepared = prepare_npx_skill_import_impl(
            None,
            format!(
                "npx skills add {} --skill duplicate-demo-skill",
                repo_dir.to_string_lossy()
            ),
            None,
        )
        .expect("prepare should succeed");

        let response = tauri::async_runtime::block_on(confirm_npx_skill_import(
            prepared.session_id.clone(),
        ))
        .expect("confirm should succeed with update");
        assert!(response.is_update);
        assert_eq!(response.imported_skill_name, "duplicate-demo-skill");

        let skill_md_content = fs::read_to_string(imported_target.join("SKILL.md"))
            .expect("read updated skill");
        assert!(skill_md_content.contains("new skill content"));
        assert!(!skill_md_content.contains("old skill content"));

        fs::remove_dir_all(imported_target).expect("cleanup target");
    }
}
