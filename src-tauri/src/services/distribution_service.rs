use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::Connection;

use crate::error::SkillerError;
use crate::models::conflict::{CheckConflictsRequest, CheckConflictsResult, ConflictInfo};
use crate::models::distribution::{
    DistributeSkillRequest, DistributeSkillResult, SkillDistributionMode, SkillDistributionTarget,
};
use crate::services::{config_service, project_service};
use crate::utils::symlink::create_symlink;

fn expand_tilde(path: &str) -> PathBuf {
    if path.starts_with("~/") || path == "~" {
        if let Some(home) = dirs::home_dir() {
            if path == "~" {
                return home;
            }
            return home.join(&path[2..]);
        }
    }
    PathBuf::from(path)
}

fn normalize_relative_path(path: &str) -> String {
    path.trim().trim_matches('/').to_string()
}

fn get_preset_distribution_path(
    conn: &Connection,
    preset_id: &str,
    target: &SkillDistributionTarget,
) -> Result<String, SkillerError> {
    let preset = config_service::get_tool_presets(conn)?
        .into_iter()
        .find(|preset| preset.id == preset_id)
        .ok_or_else(|| SkillerError::ValidationError("Tool preset not found".to_string()))?;

    let raw_path = match target {
        SkillDistributionTarget::Global => &preset.global_path,
        SkillDistributionTarget::Project => &preset.skill_path,
    };

    let trimmed = raw_path.trim();
    if trimmed.is_empty() {
        return Err(SkillerError::ValidationError(
            "Tool preset path cannot be empty".to_string(),
        ));
    }

    match target {
        SkillDistributionTarget::Global => Ok(trimmed.to_string()),
        SkillDistributionTarget::Project => {
            let normalized = normalize_relative_path(trimmed);
            if normalized.is_empty() {
                return Err(SkillerError::ValidationError(
                    "Tool preset path cannot be empty".to_string(),
                ));
            }
            Ok(normalized)
        }
    }
}

fn resolve_target_root(
    conn: &Connection,
    request: &DistributeSkillRequest,
) -> Result<PathBuf, SkillerError> {
    match request.target {
        SkillDistributionTarget::Global => Ok(PathBuf::new()),
        SkillDistributionTarget::Project => {
            let project_id = request.project_id.as_deref().ok_or_else(|| {
                SkillerError::ValidationError(
                    "Project must be selected for project distribution".to_string(),
                )
            })?;

            let project = project_service::get_project_by_id(conn, project_id)?;
            Ok(PathBuf::from(project.path))
        }
    }
}

fn resolve_target_path(
    conn: &Connection,
    request: &DistributeSkillRequest,
    source_path: &Path,
) -> Result<PathBuf, SkillerError> {
    let skill_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| SkillerError::InvalidInput("Invalid skill path".to_string()))?;

    match request.target {
        SkillDistributionTarget::Global => {
            let preset_path =
                get_preset_distribution_path(conn, &request.preset_id, &request.target)?;
            let expanded = expand_tilde(&preset_path);
            Ok(expanded.join(skill_name))
        }
        SkillDistributionTarget::Project => {
            let base_root = resolve_target_root(conn, request)?;
            let preset_path =
                get_preset_distribution_path(conn, &request.preset_id, &request.target)?;
            Ok(base_root.join(preset_path).join(skill_name))
        }
    }
}

fn copy_directory(source: &Path, target: &Path) -> Result<(), SkillerError> {
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
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
    .map_err(|error| SkillerError::IoError(std::io::Error::other(error.to_string())))?;

    Ok(())
}

pub fn check_distribution_conflicts(
    conn: &Connection,
    request: &CheckConflictsRequest,
) -> Result<CheckConflictsResult, SkillerError> {
    let mut conflicts = Vec::new();

    let preset_ids = if request.preset_ids.is_empty() {
        return Err(SkillerError::ValidationError(
            "No preset IDs provided".to_string(),
        ));
    } else {
        &request.preset_ids
    };

    for (i, skill_id) in request.skill_ids.iter().enumerate() {
        let source_path = PathBuf::from(skill_id);
        let skill_name = request.skill_names.get(i).cloned().unwrap_or_else(|| {
            source_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or(skill_id)
                .to_string()
        });

        if !source_path.is_dir() {
            continue;
        }

        let combinations: Vec<(String, Option<String>)> =
            if request.target == SkillDistributionTarget::Global {
                preset_ids.iter().map(|pid| (pid.clone(), None)).collect()
            } else {
                let mut combos = Vec::new();
                for pid in preset_ids {
                    for proj_id in &request.project_ids {
                        combos.push((pid.clone(), Some(proj_id.clone())));
                    }
                }
                combos
            };

        for (preset_id, project_id) in combinations {
            let target_path = resolve_target_path(
                conn,
                &DistributeSkillRequest {
                    skill_id: skill_id.clone(),
                    target: request.target.clone(),
                    preset_id: preset_id.clone(),
                    project_id: project_id.clone(),
                    mode: SkillDistributionMode::Copy,
                    overwrite: false,
                },
                &source_path,
            );

            let target_path = match target_path {
                Ok(p) => p,
                Err(_) => continue,
            };

            if target_path.exists() {
                let target_label = format_target_label(&request.target, &project_id, &preset_id, conn);
                conflicts.push(ConflictInfo {
                    skill_id: skill_id.clone(),
                    skill_name: skill_name.clone(),
                    target_path: target_path.to_string_lossy().to_string(),
                    target_label,
                    exists: true,
                });
            }
        }
    }

    Ok(CheckConflictsResult { conflicts })
}

fn format_target_label(
    target: &SkillDistributionTarget,
    project_id: &Option<String>,
    preset_id: &str,
    conn: &Connection,
) -> String {
    match target {
        SkillDistributionTarget::Global => format!("Global / {}", preset_id),
        SkillDistributionTarget::Project => {
            let project_name = project_id.as_ref().and_then(|pid| {
                project_service::get_project_by_id(conn, pid).ok().map(|p| p.name)
            }).unwrap_or_else(|| project_id.clone().unwrap_or_default());
            format!("{} / {}", project_name, preset_id)
        }
    }
}

pub fn distribute_skill(
    conn: &Connection,
    request: &DistributeSkillRequest,
) -> Result<DistributeSkillResult, SkillerError> {
    let source_path = PathBuf::from(&request.skill_id);
    if !source_path.is_dir() {
        return Err(SkillerError::ValidationError(
            "Skill source directory does not exist".to_string(),
        ));
    }

    let target_path = resolve_target_path(conn, request, &source_path)?;
    if target_path.exists() {
        if request.overwrite {
            if target_path.is_symlink() {
                let metadata = fs::symlink_metadata(&target_path)?;
                if metadata.file_type().is_dir() {
                    fs::remove_dir(&target_path)?;
                } else {
                    fs::remove_file(&target_path)?;
                }
            } else if target_path.is_dir() {
                fs::remove_dir_all(&target_path)?;
            } else {
                fs::remove_file(&target_path)?;
            }
        } else {
            return Err(SkillerError::ValidationError(format!(
                "Target skill already exists at: {}",
                target_path.display()
            )));
        }
    }

    match request.mode {
        SkillDistributionMode::Copy => copy_directory(&source_path, &target_path)?,
        SkillDistributionMode::Symlink => create_symlink(&source_path, &target_path)?,
    }

    Ok(DistributeSkillResult {
        target_path: target_path.to_string_lossy().to_string(),
        target: request.target.clone(),
        mode: request.mode.clone(),
    })
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::{Path, PathBuf};

    use rusqlite::Connection;

    use crate::db::{migrations, schema};
    use crate::models::distribution::{
        DistributeSkillRequest, SkillDistributionMode, SkillDistributionTarget,
    };
    use crate::models::project::CreateProjectRequest;
    use crate::services::{config_service, distribution_service, project_service};

    struct TestDir {
        path: PathBuf,
    }

    impl TestDir {
        fn new(label: &str) -> Self {
            let path = std::env::temp_dir().join(format!(
                "skiller-distribution-{label}-{}",
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

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        schema::create_tables(&conn).expect("create schema");
        migrations::run_migrations(&conn).expect("run migrations");
        conn
    }

    fn create_skill_dir(root: &Path, name: &str) -> PathBuf {
        let skill_dir = root.join(name);
        fs::create_dir_all(&skill_dir).expect("create skill dir");
        fs::write(skill_dir.join("SKILL.md"), "# test skill").expect("write skill file");
        skill_dir
    }

    #[test]
    fn copies_skill_into_global_preset_directory() {
        let conn = setup_db();
        let source_root = TestDir::new("source-global");
        let global_root = TestDir::new("global-target");
        let skill_dir = create_skill_dir(source_root.path(), "demo-skill");

        let preset = config_service::get_tool_presets(&conn)
            .expect("get presets")
            .into_iter()
            .find(|p| p.id == "preset-opencode")
            .expect("find preset");

        config_service::update_tool_preset(
            &conn,
            &crate::models::config::UpdateToolPresetRequest {
                id: "preset-opencode".to_string(),
                name: Some(preset.name),
                skill_path: Some(preset.skill_path),
                global_path: Some(
                    global_root
                        .path()
                        .join(".opencode/skills")
                        .to_string_lossy()
                        .to_string(),
                ),
            },
        )
        .expect("update preset");

        let result = distribution_service::distribute_skill(
            &conn,
            &DistributeSkillRequest {
                skill_id: skill_dir.to_string_lossy().to_string(),
                target: SkillDistributionTarget::Global,
                preset_id: "preset-opencode".to_string(),
                project_id: None,
                mode: SkillDistributionMode::Copy,
                overwrite: false,
            },
        )
        .expect("distribution should succeed");

        let target = global_root
            .path()
            .join(".opencode/skills")
            .join("demo-skill");
        assert_eq!(PathBuf::from(&result.target_path), target);
        assert!(target.exists());
        assert!(target.join("SKILL.md").exists());
    }

    #[test]
    fn creates_symlink_when_project_distribution_uses_symlink_mode() {
        let conn = setup_db();
        let source_root = TestDir::new("source-project");
        let project_root = TestDir::new("project-target");
        let skill_dir = create_skill_dir(source_root.path(), "demo-skill");

        let project = project_service::create_project(
            &conn,
            CreateProjectRequest {
                name: "Demo Project".to_string(),
                path: project_root.path().to_string_lossy().to_string(),
                skill_path: ".opencode/skills/".to_string(),
                tool_preset_id: Some("preset-opencode".to_string()),
                description: None,
                icon: None,
            },
        )
        .expect("create project");

        let result = distribution_service::distribute_skill(
            &conn,
            &DistributeSkillRequest {
                skill_id: skill_dir.to_string_lossy().to_string(),
                target: SkillDistributionTarget::Project,
                preset_id: "preset-opencode".to_string(),
                project_id: Some(project.id),
                mode: SkillDistributionMode::Symlink,
                overwrite: false,
            },
        )
        .expect("distribution should succeed");

        let target = PathBuf::from(result.target_path);
        let metadata = fs::symlink_metadata(&target).expect("read symlink metadata");
        assert!(metadata.file_type().is_symlink());
    }

    #[test]
    fn rejects_global_distribution_when_preset_global_path_is_missing() {
        let conn = setup_db();
        let source_root = TestDir::new("source-missing-global");
        let skill_dir = create_skill_dir(source_root.path(), "demo-skill");

        conn.execute(
            "UPDATE tool_presets SET global_path = '' WHERE id = 'preset-opencode'",
            [],
        )
        .expect("set empty global_path");

        let error = distribution_service::distribute_skill(
            &conn,
            &DistributeSkillRequest {
                skill_id: skill_dir.to_string_lossy().to_string(),
                target: SkillDistributionTarget::Global,
                preset_id: "preset-opencode".to_string(),
                project_id: None,
                mode: SkillDistributionMode::Copy,
                overwrite: false,
            },
        )
        .expect_err("distribution should fail");

        assert!(error.to_string().contains("cannot be empty"));
    }

    #[test]
    fn overwrite_existing_target_when_overwrite_flag_is_true() {
        let conn = setup_db();
        let source_root = TestDir::new("source-overwrite");
        let global_root = TestDir::new("global-overwrite");
        let skill_dir = create_skill_dir(source_root.path(), "demo-skill");
        let target_root = global_root.path().join(".opencode/skills/demo-skill");
        fs::create_dir_all(&target_root).expect("create existing target");
        fs::write(target_root.join("SKILL.md"), "# old content").expect("write old file");

        let preset = config_service::get_tool_presets(&conn)
            .expect("get presets")
            .into_iter()
            .find(|p| p.id == "preset-opencode")
            .expect("find preset");

        config_service::update_tool_preset(
            &conn,
            &crate::models::config::UpdateToolPresetRequest {
                id: "preset-opencode".to_string(),
                name: Some(preset.name),
                skill_path: Some(preset.skill_path),
                global_path: Some(
                    global_root
                        .path()
                        .join(".opencode/skills")
                        .to_string_lossy()
                        .to_string(),
                ),
            },
        )
        .expect("update preset");

        let result = distribution_service::distribute_skill(
            &conn,
            &DistributeSkillRequest {
                skill_id: skill_dir.to_string_lossy().to_string(),
                target: SkillDistributionTarget::Global,
                preset_id: "preset-opencode".to_string(),
                project_id: None,
                mode: SkillDistributionMode::Copy,
                overwrite: true,
            },
        )
        .expect("distribution with overwrite should succeed");

        assert!(PathBuf::from(&result.target_path).exists());
        let content = fs::read_to_string(PathBuf::from(&result.target_path).join("SKILL.md"))
            .expect("read new file");
        assert_eq!(content, "# test skill");
    }

    #[test]
    fn rejects_distribution_when_target_skill_already_exists() {
        let conn = setup_db();
        let source_root = TestDir::new("source-existing-target");
        let global_root = TestDir::new("existing-global-target");
        let skill_dir = create_skill_dir(source_root.path(), "demo-skill");
        let target_root = global_root.path().join(".opencode/skills/demo-skill");
        fs::create_dir_all(&target_root).expect("create existing target");

        let preset = config_service::get_tool_presets(&conn)
            .expect("get presets")
            .into_iter()
            .find(|p| p.id == "preset-opencode")
            .expect("find preset");

        config_service::update_tool_preset(
            &conn,
            &crate::models::config::UpdateToolPresetRequest {
                id: "preset-opencode".to_string(),
                name: Some(preset.name),
                skill_path: Some(preset.skill_path),
                global_path: Some(
                    global_root
                        .path()
                        .join(".opencode/skills")
                        .to_string_lossy()
                        .to_string(),
                ),
            },
        )
        .expect("update preset");

        let error = distribution_service::distribute_skill(
            &conn,
            &DistributeSkillRequest {
                skill_id: skill_dir.to_string_lossy().to_string(),
                target: SkillDistributionTarget::Global,
                preset_id: "preset-opencode".to_string(),
                project_id: None,
                mode: SkillDistributionMode::Copy,
                overwrite: false,
            },
        )
        .expect_err("distribution should fail");

        assert!(error.to_string().contains("already exists"));
    }
}
