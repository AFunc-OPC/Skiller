use rusqlite::Connection;
use std::process::Command;
use uuid::Uuid;
use chrono::Utc;

use crate::error::SkillerError;
use crate::models::clawhub::*;

pub fn list_sources(conn: &Connection) -> Result<Vec<ClawhubSource>, SkillerError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, registry_url, token, connection_type, cli_path, is_enabled, sort_order, created_at, updated_at FROM clawhub_sources ORDER BY sort_order ASC"
    )?;

    let sources = stmt.query_map([], |row| {
        Ok(ClawhubSource {
            id: row.get(0)?,
            name: row.get(1)?,
            registry_url: row.get(2)?,
            token: row.get(3)?,
            connection_type: row.get(4)?,
            cli_path: row.get(5)?,
            is_enabled: row.get::<_, i32>(6)? != 0,
            sort_order: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;

    let mut result = Vec::new();
    for source in sources {
        result.push(source?);
    }
    Ok(result)
}

pub fn add_source(conn: &Connection, request: CreateClawhubSourceRequest) -> Result<ClawhubSource, SkillerError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let is_enabled = request.is_enabled.unwrap_or(true);
    let sort_order = request.sort_order.unwrap_or(0);

    conn.execute(
        "INSERT INTO clawhub_sources (id, name, registry_url, token, connection_type, cli_path, is_enabled, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id, request.name, request.registry_url, request.token,
            request.connection_type, request.cli_path, is_enabled as i32,
            sort_order, now, now
        ],
    )?;

    Ok(ClawhubSource {
        id,
        name: request.name,
        registry_url: request.registry_url,
        token: request.token,
        connection_type: request.connection_type,
        cli_path: request.cli_path,
        is_enabled,
        sort_order,
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn update_source(conn: &Connection, request: UpdateClawhubSourceRequest) -> Result<ClawhubSource, SkillerError> {
    let existing = get_source_by_id(conn, &request.id)?;
    let now = Utc::now().to_rfc3339();

    let name = request.name.unwrap_or(existing.name);
    let registry_url = request.registry_url.unwrap_or(existing.registry_url);
    let token = match &request.token {
        Some(t) if !t.is_empty() => {
            conn.execute(
                "UPDATE clawhub_sources SET token = ?1 WHERE id = ?2",
                rusqlite::params![t, request.id],
            )?;
            t.clone()
        }
        _ => existing.token,
    };
    let connection_type = request.connection_type.unwrap_or(existing.connection_type);
    let cli_path = request.cli_path.or(existing.cli_path);
    let is_enabled = request.is_enabled.unwrap_or(existing.is_enabled);
    let sort_order = request.sort_order.unwrap_or(existing.sort_order);

    conn.execute(
        "UPDATE clawhub_sources SET name = ?1, registry_url = ?2, connection_type = ?3, cli_path = ?4, is_enabled = ?5, sort_order = ?6, updated_at = ?7 WHERE id = ?8",
        rusqlite::params![name, registry_url, connection_type, cli_path, is_enabled as i32, sort_order, now, request.id],
    )?;

    Ok(ClawhubSource {
        id: request.id,
        name,
        registry_url,
        token,
        connection_type,
        cli_path,
        is_enabled,
        sort_order,
        created_at: existing.created_at,
        updated_at: now,
    })
}

pub fn delete_source(conn: &Connection, id: &str) -> Result<(), SkillerError> {
    let rows = conn.execute("DELETE FROM clawhub_sources WHERE id = ?1", rusqlite::params![id])?;
    if rows == 0 {
        return Err(SkillerError::ClawhubSourceNotFound(id.to_string()));
    }
    Ok(())
}

fn get_source_by_id(conn: &Connection, id: &str) -> Result<ClawhubSource, SkillerError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, registry_url, token, connection_type, cli_path, is_enabled, sort_order, created_at, updated_at FROM clawhub_sources WHERE id = ?1"
    )?;

    let source = stmt.query_row(rusqlite::params![id], |row| {
        Ok(ClawhubSource {
            id: row.get(0)?,
            name: row.get(1)?,
            registry_url: row.get(2)?,
            token: row.get(3)?,
            connection_type: row.get(4)?,
            cli_path: row.get(5)?,
            is_enabled: row.get::<_, i32>(6)? != 0,
            sort_order: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }).map_err(|_| SkillerError::ClawhubSourceNotFound(id.to_string()))?;

    Ok(source)
}

fn get_source_by_id_with_token(conn: &Connection, id: &str) -> Result<ClawhubSource, SkillerError> {
    get_source_by_id(conn, id)
}

pub fn test_connection(conn: &Connection, source_id: &str) -> Result<ConnectionTestResult, SkillerError> {
    let source = get_source_by_id_with_token(conn, source_id)?;

    match source.connection_type.as_str() {
        "api" => test_api_connection(&source),
        "cli" => test_cli_connection(&source),
        _ => Err(SkillerError::ValidationError(format!("Unknown connection type: {}", source.connection_type))),
    }
}

fn test_api_connection(source: &ClawhubSource) -> Result<ConnectionTestResult, SkillerError> {
    let runtime = tokio::runtime::Runtime::new().map_err(|e| SkillerError::ClawhubApiError(e.to_string()))?;
    runtime.block_on(async {
        let client = reqwest::Client::new();
        let url = format!("{}/api/v1/whoami", source.registry_url.trim_end_matches('/'));
        let mut request = client.get(&url);
        if !source.token.is_empty() {
            request = request.bearer_auth(&source.token);
        }
        let response = request.send().await.map_err(|e| SkillerError::ClawhubApiError(format!("Network error: {}", e)))?;
        if response.status().is_success() {
            let body: serde_json::Value = response.json().await.unwrap_or(serde_json::json!({}));
            let username = body.get("username").and_then(|v| v.as_str()).map(String::from);
            Ok(ConnectionTestResult {
                success: true,
                message: "Connection successful".to_string(),
                username,
            })
        } else {
            Ok(ConnectionTestResult {
                success: false,
                message: format!("Authentication failed: HTTP {}", response.status()),
                username: None,
            })
        }
    })
}

fn test_cli_connection(source: &ClawhubSource) -> Result<ConnectionTestResult, SkillerError> {
    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let mut cmd = Command::new(cli_path);
    cmd.arg("whoami");
    if !source.registry_url.is_empty() {
        cmd.env("CLAWHUB_REGISTRY", &source.registry_url);
    }
    if !source.token.is_empty() {
        cmd.env("CLAWHUB_TOKEN", &source.token);
    }

    let output = cmd.output().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            SkillerError::ClawhubCliError("clawhub CLI not found. Please install it first.".to_string())
        } else {
            SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e))
        }
    })?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let trimmed = stdout.trim();
        let username = if !trimmed.is_empty() {
            Some(trimmed.to_string())
        } else {
            None
        };
        Ok(ConnectionTestResult {
            success: true,
            message: "Connection successful".to_string(),
            username,
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Ok(ConnectionTestResult {
            success: false,
            message: format!("CLI error: {}", stderr.trim()),
            username: None,
        })
    }
}

pub fn explore(conn: &Connection, source_id: &str, sort: &str, limit: Option<i32>) -> Result<Vec<ClawhubSkill>, SkillerError> {
    let source = get_source_by_id_with_token(conn, source_id)?;
    match source.connection_type.as_str() {
        "api" => explore_api(&source, sort, limit),
        "cli" => explore_cli(&source, sort, limit),
        _ => Err(SkillerError::ValidationError(format!("Unknown connection type: {}", source.connection_type))),
    }
}

fn explore_api(source: &ClawhubSource, sort: &str, limit: Option<i32>) -> Result<Vec<ClawhubSkill>, SkillerError> {
    let runtime = tokio::runtime::Runtime::new().map_err(|e| SkillerError::ClawhubApiError(e.to_string()))?;
    runtime.block_on(async {
        let client = reqwest::Client::new();
        let limit_val = limit.unwrap_or(25);
        let url = format!("{}/api/v1/skills?sort={}&limit={}", source.registry_url.trim_end_matches('/'), sort, limit_val);
        let mut request = client.get(&url);
        if !source.token.is_empty() {
            request = request.bearer_auth(&source.token);
        }
        let response = request.send().await.map_err(|e| SkillerError::ClawhubApiError(format!("Network error: {}", e)))?;
        if !response.status().is_success() {
            return Err(SkillerError::ClawhubApiError(format!("API error: HTTP {}", response.status())));
        }
        let resp: ClawhubExploreResponse = response.json().await.map_err(|e| SkillerError::ClawhubApiError(format!("Parse error: {}", e)))?;
        Ok(resp.skills)
    })
}

fn explore_cli(source: &ClawhubSource, sort: &str, limit: Option<i32>) -> Result<Vec<ClawhubSkill>, SkillerError> {
    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let limit_val = limit.unwrap_or(25);
    let mut cmd = Command::new(cli_path);
    cmd.arg("explore").arg("--json").arg("--limit").arg(limit_val.to_string()).arg("--sort").arg(sort);
    if !source.registry_url.is_empty() {
        cmd.env("CLAWHUB_REGISTRY", &source.registry_url);
    }
    if !source.token.is_empty() {
        cmd.env("CLAWHUB_TOKEN", &source.token);
    }
    let output = cmd.output().map_err(|e| SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e)))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(SkillerError::ClawhubCliError(format!("CLI error: {}", stderr.trim())));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let resp: ClawhubExploreResponse = serde_json::from_str(&stdout).map_err(|e| SkillerError::ClawhubCliError(format!("Parse error: {}", e)))?;
    Ok(resp.skills)
}

pub fn search(conn: &Connection, source_id: &str, query: &str) -> Result<Vec<ClawhubSkill>, SkillerError> {
    let source = get_source_by_id_with_token(conn, source_id)?;
    match source.connection_type.as_str() {
        "api" => search_api(&source, query),
        "cli" => search_cli(&source, query),
        _ => Err(SkillerError::ValidationError(format!("Unknown connection type: {}", source.connection_type))),
    }
}

fn search_api(source: &ClawhubSource, query: &str) -> Result<Vec<ClawhubSkill>, SkillerError> {
    let runtime = tokio::runtime::Runtime::new().map_err(|e| SkillerError::ClawhubApiError(e.to_string()))?;
    runtime.block_on(async {
        let client = reqwest::Client::new();
        let url = format!("{}/api/v1/search?q={}", source.registry_url.trim_end_matches('/'), urlencoding::encode(query));
        let mut request = client.get(&url);
        if !source.token.is_empty() {
            request = request.bearer_auth(&source.token);
        }
        let response = request.send().await.map_err(|e| SkillerError::ClawhubApiError(format!("Network error: {}", e)))?;
        if !response.status().is_success() {
            return Err(SkillerError::ClawhubApiError(format!("API error: HTTP {}", response.status())));
        }
        let resp: ClawhubExploreResponse = response.json().await.map_err(|e| SkillerError::ClawhubApiError(format!("Parse error: {}", e)))?;
        Ok(resp.skills)
    })
}

fn search_cli(source: &ClawhubSource, query: &str) -> Result<Vec<ClawhubSkill>, SkillerError> {
    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let mut cmd = Command::new(cli_path);
    cmd.arg("search").arg(query).arg("--json");
    if !source.registry_url.is_empty() {
        cmd.env("CLAWHUB_REGISTRY", &source.registry_url);
    }
    if !source.token.is_empty() {
        cmd.env("CLAWHUB_TOKEN", &source.token);
    }
    let output = cmd.output().map_err(|e| SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e)))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(SkillerError::ClawhubCliError(format!("CLI error: {}", stderr.trim())));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let resp: ClawhubExploreResponse = serde_json::from_str(&stdout).map_err(|e| SkillerError::ClawhubCliError(format!("Parse error: {}", e)))?;
    Ok(resp.skills)
}

pub fn inspect(conn: &Connection, source_id: &str, slug: &str) -> Result<ClawhubSkillDetail, SkillerError> {
    let source = get_source_by_id_with_token(conn, source_id)?;
    match source.connection_type.as_str() {
        "api" => inspect_api(&source, slug),
        "cli" => inspect_cli(&source, slug),
        _ => Err(SkillerError::ValidationError(format!("Unknown connection type: {}", source.connection_type))),
    }
}

fn inspect_api(source: &ClawhubSource, slug: &str) -> Result<ClawhubSkillDetail, SkillerError> {
    let runtime = tokio::runtime::Runtime::new().map_err(|e| SkillerError::ClawhubApiError(e.to_string()))?;
    runtime.block_on(async {
        let client = reqwest::Client::new();
        let url = format!("{}/api/v1/skills/{}", source.registry_url.trim_end_matches('/'), slug);
        let mut request = client.get(&url);
        if !source.token.is_empty() {
            request = request.bearer_auth(&source.token);
        }
        let response = request.send().await.map_err(|e| SkillerError::ClawhubApiError(format!("Network error: {}", e)))?;
        if !response.status().is_success() {
            return Err(SkillerError::ClawhubApiError(format!("API error: HTTP {}", response.status())));
        }
        let mut detail: ClawhubSkillDetail = response.json().await.map_err(|e| SkillerError::ClawhubApiError(format!("Parse error: {}", e)))?;

        let md_url = format!("{}/api/v1/skills/{}/files/SKILL.md", source.registry_url.trim_end_matches('/'), slug);
        let mut md_request = client.get(&md_url);
        if !source.token.is_empty() {
            md_request = md_request.bearer_auth(&source.token);
        }
        if let Ok(md_response) = md_request.send().await {
            if md_response.status().is_success() {
                if let Ok(content) = md_response.text().await {
                    detail.skill_md_content = Some(content);
                }
            }
        }
        Ok(detail)
    })
}

fn inspect_cli(source: &ClawhubSource, slug: &str) -> Result<ClawhubSkillDetail, SkillerError> {
    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let mut cmd = Command::new(cli_path);
    cmd.arg("inspect").arg(slug).arg("--json");
    if !source.registry_url.is_empty() {
        cmd.env("CLAWHUB_REGISTRY", &source.registry_url);
    }
    if !source.token.is_empty() {
        cmd.env("CLAWHUB_TOKEN", &source.token);
    }
    let output = cmd.output().map_err(|e| SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e)))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(SkillerError::ClawhubCliError(format!("CLI error: {}", stderr.trim())));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut detail: ClawhubSkillDetail = serde_json::from_str(&stdout).map_err(|e| SkillerError::ClawhubCliError(format!("Parse error: {}", e)))?;

    let mut md_cmd = Command::new(cli_path);
    md_cmd.arg("inspect").arg(slug).arg("--file").arg("SKILL.md");
    if !source.registry_url.is_empty() {
        md_cmd.env("CLAWHUB_REGISTRY", &source.registry_url);
    }
    if !source.token.is_empty() {
        md_cmd.env("CLAWHUB_TOKEN", &source.token);
    }
    if let Ok(md_output) = md_cmd.output() {
        if md_output.status.success() {
            let md_content = String::from_utf8_lossy(&md_output.stdout).to_string();
            if !md_content.is_empty() {
                detail.skill_md_content = Some(md_content);
            }
        }
    }

    Ok(detail)
}

pub fn check_duplicates(conn: &Connection, slugs: &[String]) -> Result<Vec<DuplicateCheckResult>, SkillerError> {
    let mut results = Vec::new();
    for slug in slugs {
        let exists = conn.query_row(
            "SELECT id, name FROM skills WHERE file_path LIKE ?1 OR name = ?1",
            rusqlite::params![format!("%{}%", slug)],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        ).ok();

        match exists {
            Some((id, name)) => {
                results.push(DuplicateCheckResult {
                    slug: slug.clone(),
                    exists: true,
                    existing_skill_id: Some(id),
                    existing_skill_name: Some(name),
                });
            }
            None => {
                results.push(DuplicateCheckResult {
                    slug: slug.clone(),
                    exists: false,
                    existing_skill_id: None,
                    existing_skill_name: None,
                });
            }
        }
    }
    Ok(results)
}

pub fn import_skills(
    conn: &Connection,
    source_id: &str,
    slugs: &[String],
    overwrite: bool,
    app_data_dir: &str,
) -> Result<Vec<ImportSkillResult>, SkillerError> {
    let source = get_source_by_id_with_token(conn, source_id)?;
    let mut results = Vec::new();

    for slug in slugs {
        let result = import_single_skill(conn, &source, slug, overwrite, app_data_dir);
        results.push(result);
    }

    Ok(results)
}

fn import_single_skill(
    conn: &Connection,
    source: &ClawhubSource,
    slug: &str,
    overwrite: bool,
    app_data_dir: &str,
) -> ImportSkillResult {
    let duplicates = match check_duplicates(conn, &[slug.to_string()]) {
        Ok(d) => d,
        Err(e) => {
            return ImportSkillResult {
                slug: slug.to_string(),
                success: false,
                error: Some(e.to_string()),
                skill_id: None,
                already_exists: false,
            }
        }
    };

    if !duplicates.is_empty() && duplicates[0].exists && !overwrite {
        return ImportSkillResult {
            slug: slug.to_string(),
            success: false,
            error: None,
            skill_id: duplicates[0].existing_skill_id.clone(),
            already_exists: true,
        };
    }

    let skill_dir = std::path::Path::new(app_data_dir).join("skills").join(slug);
    if skill_dir.exists() && !overwrite {
        return ImportSkillResult {
            slug: slug.to_string(),
            success: false,
            error: Some("Skill directory already exists".to_string()),
            skill_id: None,
            already_exists: true,
        };
    }

    let download_result = match source.connection_type.as_str() {
        "api" => download_skill_api(source, slug, &skill_dir),
        "cli" => install_skill_cli(source, slug, &skill_dir),
        _ => Err(SkillerError::ValidationError(format!("Unknown connection type: {}", source.connection_type))),
    };

    match download_result {
        Ok(skill_name) => {
            let skill_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            let file_path = skill_dir.to_string_lossy().to_string();
            let source_metadata = serde_json::json!({
                "type": "clawhub",
                "source_id": source.id,
                "slug": slug
            }).to_string();

            if overwrite {
                if let Ok(existing_id) = conn.query_row(
                    "SELECT id FROM skills WHERE name = ?1 OR file_path LIKE ?2",
                    rusqlite::params![slug, format!("%{}%", slug)],
                    |row| row.get::<_, String>(0),
                ) {
                    conn.execute(
                        "UPDATE skills SET name = ?1, file_path = ?2, source_metadata = ?3, updated_at = ?4 WHERE id = ?5",
                        rusqlite::params![skill_name, file_path, source_metadata, now, existing_id],
                    ).ok();
                    return ImportSkillResult {
                        slug: slug.to_string(),
                        success: true,
                        error: None,
                        skill_id: Some(existing_id),
                        already_exists: true,
                    };
                }
            }

            match conn.execute(
                "INSERT INTO skills (id, name, description, file_path, source, source_metadata, repo_id, tags, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                rusqlite::params![skill_id, skill_name, Option::<String>::None, file_path, "clawhub", source_metadata, Option::<String>::None, "[]", "available", now, now],
            ) {
                Ok(_) => ImportSkillResult {
                    slug: slug.to_string(),
                    success: true,
                    error: None,
                    skill_id: Some(skill_id),
                    already_exists: false,
                },
                Err(e) => ImportSkillResult {
                    slug: slug.to_string(),
                    success: false,
                    error: Some(e.to_string()),
                    skill_id: None,
                    already_exists: false,
                },
            }
        }
        Err(e) => ImportSkillResult {
            slug: slug.to_string(),
            success: false,
            error: Some(e.to_string()),
            skill_id: None,
            already_exists: false,
        },
    }
}

fn download_skill_api(source: &ClawhubSource, slug: &str, target_dir: &std::path::Path) -> Result<String, SkillerError> {
    if let Some(parent) = target_dir.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if target_dir.exists() {
        std::fs::remove_dir_all(target_dir)?;
    }
    std::fs::create_dir_all(target_dir)?;

    let runtime = tokio::runtime::Runtime::new().map_err(|e| SkillerError::ClawhubApiError(e.to_string()))?;
    runtime.block_on(async {
        let client = reqwest::Client::new();
        let url = format!("{}/api/v1/download/{}", source.registry_url.trim_end_matches('/'), slug);
        let mut request = client.get(&url);
        if !source.token.is_empty() {
            request = request.bearer_auth(&source.token);
        }
        let response = request.send().await.map_err(|e| SkillerError::ClawhubApiError(format!("Download error: {}", e)))?;
        if !response.status().is_success() {
            return Err(SkillerError::ClawhubApiError(format!("Download failed: HTTP {}", response.status())));
        }

        let bytes = response.bytes().await.map_err(|e| SkillerError::ClawhubApiError(format!("Read error: {}", e)))?;
        let zip_path = target_dir.with_extension("zip");
        std::fs::write(&zip_path, &bytes)?;
        let zip_file = std::fs::File::open(&zip_path)?;
        let mut archive = zip::ZipArchive::new(zip_file).map_err(|e| SkillerError::IoError(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
        archive.extract(target_dir).map_err(|e| SkillerError::IoError(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
        let _ = std::fs::remove_file(&zip_path);

        let skill_name = target_dir
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| slug.to_string());

        Ok(skill_name)
    })
}

fn install_skill_cli(source: &ClawhubSource, slug: &str, target_dir: &std::path::Path) -> Result<String, SkillerError> {
    if target_dir.exists() {
        std::fs::remove_dir_all(target_dir)?;
    }
    std::fs::create_dir_all(target_dir)?;

    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let mut cmd = Command::new(cli_path);
    cmd.arg("install").arg(slug).arg("--dir").arg(target_dir.to_string_lossy().as_ref());
    if !source.registry_url.is_empty() {
        cmd.env("CLAWHUB_REGISTRY", &source.registry_url);
    }
    if !source.token.is_empty() {
        cmd.env("CLAWHUB_TOKEN", &source.token);
    }

    let output = cmd.output().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            SkillerError::ClawhubCliError("clawhub CLI not found".to_string())
        } else {
            SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e))
        }
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(SkillerError::ClawhubCliError(format!("Install failed: {}", stderr.trim())));
    }

    Ok(slug.to_string())
}