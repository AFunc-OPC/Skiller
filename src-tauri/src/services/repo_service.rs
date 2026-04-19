use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::commands::repo::ImportableSkill;
use crate::error::SkillerError;
use crate::models::repo::{CreateRepoRequest, Repo, UpdateRepoRequest};
use crate::models::skill::{CreateSkillRequest, SourceMetadata};
use crate::services::skill_service;
use crate::utils::markdown::parse_skill_markdown;

fn build_git_auth_config(
    auth_method: Option<&str>,
    username: Option<&str>,
    token: Option<&str>,
    ssh_key: Option<&str>,
) -> crate::utils::git::GitAuthConfig {
    crate::utils::git::GitAuthConfig {
        auth_method: auth_method.map(str::to_string),
        username: username.map(str::to_string),
        token: token.map(str::to_string),
        ssh_key: ssh_key.map(str::to_string),
    }
}

fn normalize_skill_relative_path(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.trim_matches('/').to_string())
        .filter(|value| !value.is_empty())
}

fn is_repo_checkout_usable(local_path: &Path) -> bool {
    local_path.exists() && local_path.is_dir() && local_path.join(".git").exists()
}

fn remove_path_if_exists(path: &Path) -> Result<(), SkillerError> {
    if !path.exists() {
        return Ok(());
    }

    if path.is_dir() {
        fs::remove_dir_all(path)?;
    } else {
        fs::remove_file(path)?;
    }

    Ok(())
}

fn recreate_repo_checkout(
    repo: &Repo,
    local_path: &Path,
    auth_config: &crate::utils::git::GitAuthConfig,
) -> Result<(), SkillerError> {
    remove_path_if_exists(local_path)?;

    if let Some(parent) = local_path.parent() {
        fs::create_dir_all(parent)?;
    }

    crate::utils::git::clone_repo_with_auth(
        &repo.url,
        Some(&repo.branch),
        local_path,
        auth_config,
        None,
    )
}

pub fn get_repos(conn: &Connection) -> Result<Vec<Repo>, SkillerError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, url, local_path, branch, last_sync, is_builtin, created_at, updated_at, description, skill_relative_path, auth_method, username, token, ssh_key FROM repos",
    )?;

    let repos = stmt.query_map([], |row| {
        Ok(Repo {
            id: row.get(0)?,
            name: row.get(1)?,
            url: row.get(2)?,
            local_path: row.get(3)?,
            branch: row.get(4)?,
            last_sync: row.get(5)?,
            is_builtin: row.get::<_, i32>(6)? != 0,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            description: row.get(9)?,
            skill_relative_path: row.get(10)?,
            auth_method: row.get(11)?,
            username: row.get(12)?,
            token: row.get(13)?,
            ssh_key: row.get(14)?,
        })
    })?;

    let mut result = Vec::new();
    for repo in repos {
        result.push(repo?);
    }

    Ok(result)
}

pub fn add_repo(conn: &Connection, request: CreateRepoRequest) -> Result<Repo, SkillerError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let local_path = get_repo_storage_path(&id);

    if let Some(parent) = local_path.parent() {
        fs::create_dir_all(parent)?;
    }

    println!(
        "Cloning repository {} to {}",
        request.url,
        local_path.display()
    );

    let auth_config = build_git_auth_config(
        request.auth_method.as_deref(),
        request.username.as_deref(),
        request.token.as_deref(),
        request.ssh_key.as_deref(),
    );

    crate::utils::git::clone_repo_with_auth(
        &request.url,
        Some(&request.branch),
        &local_path,
        &auth_config,
        None,
    )?;

    println!("Repository cloned successfully, saving to database");

    let description = request.description.clone();
    let skill_relative_path = normalize_skill_relative_path(request.skill_relative_path.as_deref());
    let auth_method = request
        .auth_method
        .clone()
        .unwrap_or_else(|| "ssh".to_string());
    let username = request.username.clone();
    let token = request.token.clone();
    let ssh_key = request.ssh_key.clone();

    conn.execute(
        "INSERT INTO repos (id, name, url, local_path, branch, last_sync, is_builtin, created_at, updated_at, description, skill_relative_path, auth_method, username, token, ssh_key) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        rusqlite::params![
            id,
            request.name,
            request.url,
            local_path.to_string_lossy(),
            request.branch,
            now,
            now,
            now,
            description,
            skill_relative_path,
            auth_method,
            username,
            token,
            ssh_key
        ],
    )?;

    let repo = get_repo_by_id(conn, &id)?;

    println!("Scanning skills in repository");
    let skills_count = scan_and_create_skills(conn, &repo)?;
    println!("Created {} skills", skills_count);

    Ok(repo)
}

pub fn update_repo(conn: &Connection, request: UpdateRepoRequest) -> Result<Repo, SkillerError> {
    let now = chrono::Utc::now().to_rfc3339();

    let mut updates: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(name) = &request.name {
        updates.push("name = ?".to_string());
        params.push(Box::new(name.clone()));
    }

    if let Some(description) = &request.description {
        updates.push("description = ?".to_string());
        params.push(Box::new(description.clone()));
    }

    if let Some(skill_relative_path) = &request.skill_relative_path {
        updates.push("skill_relative_path = ?".to_string());
        params.push(Box::new(normalize_skill_relative_path(Some(
            skill_relative_path.as_str(),
        ))));
    }

    if let Some(branch) = &request.branch {
        updates.push("branch = ?".to_string());
        params.push(Box::new(branch.clone()));
    }

    if let Some(auth_method) = &request.auth_method {
        updates.push("auth_method = ?".to_string());
        params.push(Box::new(auth_method.clone()));
    }

    if let Some(username) = &request.username {
        updates.push("username = ?".to_string());
        params.push(Box::new(username.clone()));
    }

    if let Some(token) = &request.token {
        updates.push("token = ?".to_string());
        params.push(Box::new(token.clone()));
    }

    if let Some(ssh_key) = &request.ssh_key {
        updates.push("ssh_key = ?".to_string());
        params.push(Box::new(ssh_key.clone()));
    }

    if updates.is_empty() {
        return get_repo_by_id(conn, &request.id);
    }

    updates.push("updated_at = ?".to_string());
    params.push(Box::new(now));
    params.push(Box::new(request.id.clone()));

    let sql = format!("UPDATE repos SET {} WHERE id = ?", updates.join(", "));

    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    conn.execute(&sql, params_refs.as_slice())?;

    get_repo_by_id(conn, &request.id)
}

pub fn refresh_repo(conn: &Connection, id: &str) -> Result<(Repo, bool), SkillerError> {
    let repo = get_repo_by_id(conn, id)?;
    let now = chrono::Utc::now().to_rfc3339();

    let local_path = match &repo.local_path {
        Some(path) if !path.is_empty() => PathBuf::from(path),
        _ => {
            let generated_path = get_repo_storage_path(&repo.id);
            conn.execute(
                "UPDATE repos SET local_path = ?1 WHERE id = ?2",
                rusqlite::params![generated_path.to_string_lossy(), &repo.id],
            )?;
            generated_path
        }
    };

    println!("Pulling repository {}", repo.name);

    let auth_config = build_git_auth_config(
        repo.auth_method.as_deref(),
        repo.username.as_deref(),
        repo.token.as_deref(),
        repo.ssh_key.as_deref(),
    );

    let recovered_by_reclone = if is_repo_checkout_usable(&local_path) {
        crate::utils::git::pull_repo(&local_path, &repo.branch, &auth_config)?;
        false
    } else {
        recreate_repo_checkout(&repo, &local_path, &auth_config)?;
        true
    };

    println!("Pull successful, updating skills");

    delete_repo_skills(conn, id)?;

    let skills_count = scan_and_create_skills(conn, &repo)?;
    println!("Re-scanned {} skills", skills_count);

    conn.execute(
        "UPDATE repos SET last_sync = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![now, now, id],
    )?;

    let updated_repo = get_repo_by_id(conn, id)?;
    Ok((updated_repo, recovered_by_reclone))
}

pub fn delete_repo(conn: &Connection, id: &str) -> Result<(), SkillerError> {
    conn.execute("DELETE FROM repos WHERE id = ?1", rusqlite::params![id])?;
    Ok(())
}

fn get_repo_storage_path(repo_id: &str) -> PathBuf {
    let home = dirs::home_dir().expect("Unable to get home directory");
    home.join(".skiller").join("repos").join(repo_id)
}

fn delete_repo_skills(conn: &Connection, repo_id: &str) -> Result<(), SkillerError> {
    let skills = skill_service::get_skills_by_repo_id(conn, repo_id)?;

    for skill in skills {
        skill_service::delete_skill(conn, &skill.id)?;
    }

    Ok(())
}

fn get_repo_by_id(conn: &Connection, id: &str) -> Result<Repo, SkillerError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, url, local_path, branch, last_sync, is_builtin, created_at, updated_at, description, skill_relative_path, auth_method, username, token, ssh_key FROM repos WHERE id = ?1"
    )?;

    stmt.query_row(rusqlite::params![id], |row| {
        Ok(Repo {
            id: row.get(0)?,
            name: row.get(1)?,
            url: row.get(2)?,
            local_path: row.get(3)?,
            branch: row.get(4)?,
            last_sync: row.get(5)?,
            is_builtin: row.get::<_, i32>(6)? != 0,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            description: row.get(9)?,
            skill_relative_path: row.get(10)?,
            auth_method: row.get(11)?,
            username: row.get(12)?,
            token: row.get(13)?,
            ssh_key: row.get(14)?,
        })
    })
    .map_err(|_| SkillerError::RepoNotFound(id.to_string()))
}

fn scan_and_create_skills(conn: &Connection, repo: &Repo) -> Result<usize, SkillerError> {
    let local_path = match &repo.local_path {
        Some(path) => PathBuf::from(path),
        None => return Ok(0),
    };

    let skill_relative_path = repo
        .skill_relative_path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    let scan_base_path = if let Some(relative_path) = skill_relative_path {
        local_path.join(relative_path)
    } else {
        local_path.clone()
    };

    if !scan_base_path.exists() {
        eprintln!(
            "Warning: Skill directory does not exist: {}",
            scan_base_path.display()
        );
        return Ok(0);
    }

    if !scan_base_path.is_dir() {
        eprintln!(
            "Warning: Skill path is not a directory: {}",
            scan_base_path.display()
        );
        return Ok(0);
    }

    let mut skills_created = 0;
    let mut found_skill_dirs: Vec<PathBuf> = Vec::new();

    find_all_skill_directories(&scan_base_path, &mut found_skill_dirs, 0);

    for skill_dir in found_skill_dirs {
        let skill_name = skill_dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let skill_md = skill_dir.join("SKILL.md");

        if !skill_md.exists() {
            continue;
        }

        match parse_skill_markdown(&skill_md) {
            Ok((name, description)) => {
                let final_name = name.unwrap_or_else(|| skill_name.clone());

                let sanitized_name = final_name
                    .trim()
                    .lines()
                    .next()
                    .unwrap_or(&skill_name)
                    .to_string();

                let final_name = if sanitized_name.is_empty() {
                    skill_name.clone()
                } else {
                    sanitized_name
                };

                match skill_service::create_skill(
                    conn,
                    CreateSkillRequest {
                        name: final_name,
                        description,
                        file_path: skill_md.to_string_lossy().to_string(),
                        source: "repository".to_string(),
                        source_metadata: Some(SourceMetadata::Repository {
                            repo_id: repo.id.clone(),
                        }),
                        repo_id: Some(repo.id.clone()),
                        tags: vec![],
                    },
                ) {
                    Ok(_) => {
                        skills_created += 1;
                    }
                    Err(e) => {
                        eprintln!("Warning: Failed to create skill {}: {}", skill_name, e);
                    }
                }
            }
            Err(e) => {
                eprintln!("Warning: Failed to parse {}: {}", skill_md.display(), e);
            }
        }
    }

    Ok(skills_created)
}

const MAX_SCAN_DEPTH: usize = 5;

fn find_all_skill_directories(base: &Path, results: &mut Vec<PathBuf>, depth: usize) {
    if depth > MAX_SCAN_DEPTH {
        return;
    }

    let skip_dirs = [
        "node_modules",
        ".git",
        "target",
        "dist",
        "build",
        ".next",
        ".nuxt",
        "vendor",
        "__pycache__",
        ".venv",
        "venv",
        "Cargo.lock",
    ];

    if let Ok(entries) = fs::read_dir(base) {
        for entry in entries.flatten() {
            let path = entry.path();

            if path.is_file() {
                continue;
            }

            let dir_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

            if skip_dirs.contains(&dir_name) {
                continue;
            }

            if path.join("SKILL.md").exists() {
                results.push(path.clone());
                continue;
            }

            find_all_skill_directories(&path, results, depth + 1);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::create_test_connection;
    use crate::services::skill_service;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_temp_dir(prefix: &str) -> PathBuf {
        let unique_id = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before unix epoch")
            .as_nanos();

        let dir = std::env::temp_dir().join(format!("skiller-{prefix}-{unique_id}"));
        fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    fn create_repo(local_path: &Path, skill_relative_path: Option<&str>) -> Repo {
        Repo {
            id: "repo-1".to_string(),
            name: "Test Repo".to_string(),
            url: "https://example.com/repo.git".to_string(),
            local_path: Some(local_path.to_string_lossy().to_string()),
            branch: "main".to_string(),
            last_sync: None,
            is_builtin: false,
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
            description: None,
            skill_relative_path: skill_relative_path.map(str::to_string),
            auth_method: None,
            username: None,
            token: None,
            ssh_key: None,
        }
    }

    fn insert_repo(conn: &Connection, repo: &Repo) {
        conn.execute(
            "INSERT INTO repos (id, name, url, local_path, branch, last_sync, is_builtin, created_at, updated_at, description, skill_relative_path, auth_method, username, token, ssh_key)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            rusqlite::params![
                repo.id,
                repo.name,
                repo.url,
                repo.local_path,
                repo.branch,
                repo.last_sync,
                repo.is_builtin,
                repo.created_at,
                repo.updated_at,
                repo.description,
                repo.skill_relative_path,
                repo.auth_method,
                repo.username,
                repo.token,
                repo.ssh_key,
            ],
        )
        .expect("insert repo");
    }

    #[test]
    fn scan_and_create_skills_finds_skills_in_both_root_and_skills_directory() {
        let conn = create_test_connection().expect("create test db");
        let repo_dir = unique_temp_dir("repo-scan-skills");
        let root_skill_dir = repo_dir.join("root-skill");
        let nested_skill_dir = repo_dir.join("skills").join("nested-skill");

        fs::create_dir_all(&root_skill_dir).expect("create root skill dir");
        fs::create_dir_all(&nested_skill_dir).expect("create nested skill dir");
        fs::write(
            root_skill_dir.join("SKILL.md"),
            "---\nname: Root Skill\n---\n",
        )
        .expect("write root skill");
        fs::write(
            nested_skill_dir.join("SKILL.md"),
            "---\nname: Nested Skill\n---\n",
        )
        .expect("write nested skill");

        let repo = create_repo(&repo_dir, None);
        insert_repo(&conn, &repo);

        let created = scan_and_create_skills(&conn, &repo).expect("scan repo skills");
        let skills =
            skill_service::get_skills_by_repo_id(&conn, &repo.id).expect("load repo skills");

        assert_eq!(created, 2);
        assert_eq!(skills.len(), 2);

        let skill_names: Vec<&str> = skills.iter().map(|s| s.name.as_str()).collect();
        assert!(skill_names.contains(&"Root Skill"));
        assert!(skill_names.contains(&"Nested Skill"));

        fs::remove_dir_all(&repo_dir).expect("cleanup temp dir");
    }

    #[test]
    fn scan_and_create_skills_finds_skills_in_claude_skills_directory() {
        let conn = create_test_connection().expect("create test db");
        let repo_dir = unique_temp_dir("repo-claude-skills");
        let skill_dir = repo_dir.join(".claude").join("skills").join("my-skill");

        fs::create_dir_all(&skill_dir).expect("create skill dir");
        fs::write(skill_dir.join("SKILL.md"), "---\nname: Claude Skill\n---\n")
            .expect("write skill");

        let repo = create_repo(&repo_dir, None);
        insert_repo(&conn, &repo);

        let created = scan_and_create_skills(&conn, &repo).expect("scan repo skills");
        let skills =
            skill_service::get_skills_by_repo_id(&conn, &repo.id).expect("load repo skills");

        assert_eq!(created, 1);
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "Claude Skill");

        fs::remove_dir_all(&repo_dir).expect("cleanup temp dir");
    }

    #[test]
    fn scan_and_create_skills_finds_skills_in_opencode_skills_directory() {
        let conn = create_test_connection().expect("create test db");
        let repo_dir = unique_temp_dir("repo-opencode-skills");
        let skill_dir = repo_dir.join(".opencode").join("skills").join("my-skill");

        fs::create_dir_all(&skill_dir).expect("create skill dir");
        fs::write(
            skill_dir.join("SKILL.md"),
            "---\nname: OpenCode Skill\n---\n",
        )
        .expect("write skill");

        let repo = create_repo(&repo_dir, None);
        insert_repo(&conn, &repo);

        let created = scan_and_create_skills(&conn, &repo).expect("scan repo skills");
        let skills =
            skill_service::get_skills_by_repo_id(&conn, &repo.id).expect("load repo skills");

        assert_eq!(created, 1);
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "OpenCode Skill");

        fs::remove_dir_all(&repo_dir).expect("cleanup temp dir");
    }

    #[test]
    fn scan_and_create_skills_finds_multiple_skills_in_various_locations() {
        let conn = create_test_connection().expect("create test db");
        let repo_dir = unique_temp_dir("repo-multi-skills");

        let skill1_dir = repo_dir.join("skills").join("skill1");
        let skill2_dir = repo_dir.join(".claude").join("skills").join("skill2");
        let skill3_dir = repo_dir.join(".opencode").join("skills").join("skill3");

        fs::create_dir_all(&skill1_dir).expect("create skill1 dir");
        fs::create_dir_all(&skill2_dir).expect("create skill2 dir");
        fs::create_dir_all(&skill3_dir).expect("create skill3 dir");

        fs::write(skill1_dir.join("SKILL.md"), "---\nname: Skill One\n---\n")
            .expect("write skill1");
        fs::write(skill2_dir.join("SKILL.md"), "---\nname: Skill Two\n---\n")
            .expect("write skill2");
        fs::write(skill3_dir.join("SKILL.md"), "---\nname: Skill Three\n---\n")
            .expect("write skill3");

        let repo = create_repo(&repo_dir, None);
        insert_repo(&conn, &repo);

        let created = scan_and_create_skills(&conn, &repo).expect("scan repo skills");
        let skills =
            skill_service::get_skills_by_repo_id(&conn, &repo.id).expect("load repo skills");

        assert_eq!(created, 3);
        assert_eq!(skills.len(), 3);

        let skill_names: Vec<&str> = skills.iter().map(|s| s.name.as_str()).collect();
        assert!(skill_names.contains(&"Skill One"));
        assert!(skill_names.contains(&"Skill Two"));
        assert!(skill_names.contains(&"Skill Three"));

        fs::remove_dir_all(&repo_dir).expect("cleanup temp dir");
    }

    #[test]
    fn scan_and_create_skills_skips_node_modules_and_hidden_dirs() {
        let conn = create_test_connection().expect("create test db");
        let repo_dir = unique_temp_dir("repo-skip-dirs");

        let node_modules_skill = repo_dir.join("node_modules").join("fake-skill");
        let skill_dir = repo_dir.join("skills").join("real-skill");

        fs::create_dir_all(&node_modules_skill).expect("create node_modules skill");
        fs::create_dir_all(&skill_dir).expect("create real skill");

        fs::write(
            node_modules_skill.join("SKILL.md"),
            "---\nname: Fake Skill\n---\n",
        )
        .expect("write fake skill");
        fs::write(skill_dir.join("SKILL.md"), "---\nname: Real Skill\n---\n")
            .expect("write real skill");

        let repo = create_repo(&repo_dir, None);
        insert_repo(&conn, &repo);

        let created = scan_and_create_skills(&conn, &repo).expect("scan repo skills");
        let skills =
            skill_service::get_skills_by_repo_id(&conn, &repo.id).expect("load repo skills");

        assert_eq!(created, 1);
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "Real Skill");

        fs::remove_dir_all(&repo_dir).expect("cleanup temp dir");
    }

    #[test]
    fn scan_and_create_skills_respects_skill_relative_path_config() {
        let conn = create_test_connection().expect("create test db");
        let repo_dir = unique_temp_dir("repo-relative-path");

        let skill1_dir = repo_dir.join("packages").join("skill1");
        let skill2_dir = repo_dir.join("skills").join("skill2");

        fs::create_dir_all(&skill1_dir).expect("create skill1 dir");
        fs::create_dir_all(&skill2_dir).expect("create skill2 dir");

        fs::write(
            skill1_dir.join("SKILL.md"),
            "---\nname: Package Skill\n---\n",
        )
        .expect("write skill1");
        fs::write(
            skill2_dir.join("SKILL.md"),
            "---\nname: Skills Dir Skill\n---\n",
        )
        .expect("write skill2");

        let repo = create_repo(&repo_dir, Some("packages"));
        insert_repo(&conn, &repo);

        let created = scan_and_create_skills(&conn, &repo).expect("scan repo skills");
        let skills =
            skill_service::get_skills_by_repo_id(&conn, &repo.id).expect("load repo skills");

        assert_eq!(created, 1);
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "Package Skill");

        fs::remove_dir_all(&repo_dir).expect("cleanup temp dir");
    }

    #[test]
    fn repo_checkout_is_not_usable_when_directory_is_missing() {
        let repo_dir = std::env::temp_dir().join(format!(
            "skiller-missing-repo-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock before unix epoch")
                .as_nanos()
        ));

        assert!(!is_repo_checkout_usable(&repo_dir));
    }

    #[test]
    fn repo_checkout_is_not_usable_without_git_metadata() {
        let repo_dir = unique_temp_dir("repo-no-git-metadata");

        assert!(!is_repo_checkout_usable(&repo_dir));

        fs::remove_dir_all(&repo_dir).expect("cleanup temp dir");
    }

    #[test]
    fn repo_checkout_is_usable_with_git_metadata_directory() {
        let repo_dir = unique_temp_dir("repo-with-git-metadata");
        fs::create_dir_all(repo_dir.join(".git")).expect("create git dir");

        assert!(is_repo_checkout_usable(&repo_dir));

        fs::remove_dir_all(&repo_dir).expect("cleanup temp dir");
    }
}

pub fn repair_repo(conn: &Connection, id: &str) -> Result<Repo, SkillerError> {
    let repo = get_repo_by_id(conn, id)?;
    let local_path = get_repo_storage_path(&repo.id);

    let auth_config = build_git_auth_config(
        repo.auth_method.as_deref(),
        repo.username.as_deref(),
        repo.token.as_deref(),
        repo.ssh_key.as_deref(),
    );

    recreate_repo_checkout(&repo, &local_path, &auth_config)?;

    conn.execute(
        "UPDATE repos SET local_path = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![
            local_path.to_string_lossy(),
            chrono::Utc::now().to_rfc3339(),
            id
        ],
    )?;

    delete_repo_skills(conn, id)?;
    scan_and_create_skills(conn, &repo)?;

    get_repo_by_id(conn, id)
}

pub fn list_importable_skills(
    conn: &Connection,
    repo_id: &str,
) -> Result<Vec<ImportableSkill>, SkillerError> {
    let skills = skill_service::get_skills_by_repo_id(conn, repo_id)?;

    let importable_skills = skills
        .into_iter()
        .map(|skill| {
            let skill_dir = std::path::Path::new(&skill.file_path)
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or(skill.file_path.clone());

            ImportableSkill {
                name: skill.name,
                path: skill_dir,
                description: skill.description,
            }
        })
        .collect();

    Ok(importable_skills)
}

pub fn get_repo_skill_count(conn: &Connection, repo_id: &str) -> Result<usize, SkillerError> {
    skill_service::get_skill_count_by_repo_id(conn, repo_id)
}
