use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::Connection;

use crate::error::SkillerError;
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
        return Err(SkillerError::ValidationError(
            "Target skill already exists".to_string(),
        ));
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
            },
        )
        .expect_err("distribution should fail");

        assert!(error.to_string().contains("cannot be empty"));
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
            },
        )
        .expect_err("distribution should fail");

        assert!(error.to_string().contains("already exists"));
    }
}
