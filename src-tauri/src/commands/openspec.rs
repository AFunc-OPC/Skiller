use crate::utils::shell::check_command_available;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenSpecCliStatus {
    pub installed: bool,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenSpecArtifactInfo {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub artifact_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenSpecChangeInfo {
    pub id: String,
    pub name: String,
    pub status: String,
    pub current_stage: String,
    pub created_at: String,
    pub updated_at: String,
    pub artifacts: Vec<OpenSpecArtifactInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenSpecCommandResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

fn get_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| {
        if cfg!(target_os = "windows") {
            "cmd".to_string()
        } else if cfg!(target_os = "macos") {
            "/bin/zsh".to_string()
        } else {
            "/bin/bash".to_string()
        }
    })
}

#[allow(dead_code)]
fn run_openspec_command(project_path: &str, args: &[&str]) -> Result<String, String> {
    let shell = get_shell();
    let args_str = args.join(" ");
    let cmd = if cfg!(target_os = "windows") {
        format!("openspec {}", args_str)
    } else {
        format!("openspec {}", args_str)
    };

    let output = if cfg!(target_os = "windows") {
        Command::new(&shell)
            .args(&["/C", &cmd])
            .current_dir(project_path)
            .output()
            .map_err(|e| format!("Failed to execute openspec: {}", e))?
    } else {
        Command::new(&shell)
            .args(&["-i", "-l", "-c", &cmd])
            .current_dir(project_path)
            .output()
            .map_err(|e| format!("Failed to execute openspec: {}", e))?
    };

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(format!("OpenSpec command failed: {}", stderr))
    }
}

#[tauri::command]
pub fn check_openspec_cli() -> Result<OpenSpecCliStatus, String> {
    let installed = check_command_available("openspec", "--version");

    if !installed {
        return Ok(OpenSpecCliStatus {
            installed: false,
            version: None,
        });
    }

    let shell = get_shell();
    let output = if cfg!(target_os = "windows") {
        Command::new(&shell)
            .args(&["/C", "openspec --version"])
            .output()
            .map_err(|e| format!("Failed to get openspec version: {}", e))?
    } else {
        Command::new(&shell)
            .args(&["-i", "-l", "-c", "openspec --version"])
            .output()
            .map_err(|e| format!("Failed to get openspec version: {}", e))?
    };

    let version = if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    };

    Ok(OpenSpecCliStatus {
        installed: true,
        version,
    })
}

#[tauri::command]
pub fn list_openspec_changes(project_path: String) -> Result<Vec<OpenSpecChangeInfo>, String> {
    let changes_dir = Path::new(&project_path).join("openspec").join("changes");

    if !changes_dir.exists() {
        return Ok(Vec::new());
    }

    let mut changes = Vec::new();

    let entries = std::fs::read_dir(&changes_dir)
        .map_err(|e| format!("Failed to read changes directory: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let change_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let is_archived = change_name.starts_with("archive");

        let mut artifacts = Vec::new();
        
        if let Ok(artifact_entries) = std::fs::read_dir(&path) {
            for artifact_entry in artifact_entries.flatten() {
                let artifact_path = artifact_entry.path();
                let artifact_name = artifact_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                
                let artifact_type = if artifact_name == "proposal.md" {
                    "proposal".to_string()
                } else if artifact_name == "design.md" {
                    "design".to_string()
                } else if artifact_name == "tasks.md" {
                    "tasks".to_string()
                } else if artifact_name.ends_with(".md") {
                    "spec".to_string()
                } else {
                    continue;
                };

                artifacts.push(OpenSpecArtifactInfo {
                    name: artifact_name.clone(),
                    path: artifact_path.to_string_lossy().to_string(),
                    artifact_type,
                });
            }
        }

        let created_at = std::fs::metadata(&path)
            .ok()
            .and_then(|m| m.created().ok())
            .and_then(|t| {
                let dt: DateTime<Utc> = t.into();
                Some(dt.to_rfc3339())
            })
            .unwrap_or_default();
        let updated_at = std::fs::metadata(&path)
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| {
                let dt: DateTime<Utc> = t.into();
                Some(dt.to_rfc3339())
            })
            .unwrap_or_default();

        let current_stage = determine_current_stage(&artifacts);

        changes.push(OpenSpecChangeInfo {
            id: change_name.clone(),
            name: change_name,
            status: if is_archived { "archived".to_string() } else { "in_progress".to_string() },
            current_stage,
            created_at,
            updated_at,
            artifacts,
        });
    }

    Ok(changes)
}

fn determine_current_stage(artifacts: &[OpenSpecArtifactInfo]) -> String {
    let has_proposal = artifacts.iter().any(|a| a.artifact_type == "proposal");
    let has_design = artifacts.iter().any(|a| a.artifact_type == "design");
    let has_tasks = artifacts.iter().any(|a| a.artifact_type == "tasks");

    if has_tasks {
        "apply".to_string()
    } else if has_design {
        "continue".to_string()
    } else if has_proposal {
        "new".to_string()
    } else {
        "propose".to_string()
    }
}

#[tauri::command]
pub fn read_openspec_artifact(
    project_path: String,
    change_id: String,
    file_name: String,
) -> Result<String, String> {
    let artifact_path = Path::new(&project_path)
        .join("openspec")
        .join("changes")
        .join(&change_id)
        .join(&file_name);

    if !artifact_path.exists() {
        return Err(format!("Artifact file not found: {}", artifact_path.display()));
    }

    std::fs::read_to_string(&artifact_path)
        .map_err(|e| format!("Failed to read artifact: {}", e))
}

#[tauri::command]
pub fn execute_openspec_command(
    project_path: String,
    command: String,
    args: Vec<String>,
) -> Result<OpenSpecCommandResult, String> {
    let shell = get_shell();
    let full_args: Vec<&str> = std::iter::once(command.as_str())
        .chain(args.iter().map(|s| s.as_str()))
        .collect();
    let cmd = format!("openspec {}", full_args.join(" "));

    let output = if cfg!(target_os = "windows") {
        Command::new(&shell)
            .args(&["/C", &cmd])
            .current_dir(&project_path)
            .output()
            .map_err(|e| format!("Failed to execute openspec: {}", e))?
    } else {
        Command::new(&shell)
            .args(&["-i", "-l", "-c", &cmd])
            .current_dir(&project_path)
            .output()
            .map_err(|e| format!("Failed to execute openspec: {}", e))?
    };

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    Ok(OpenSpecCommandResult {
        success: output.status.success(),
        stdout,
        stderr,
        exit_code,
    })
}

#[tauri::command]
pub fn check_openspec_directory(project_path: String) -> Result<bool, String> {
    let openspec_dir = Path::new(&project_path).join("openspec");
    Ok(openspec_dir.exists())
}
