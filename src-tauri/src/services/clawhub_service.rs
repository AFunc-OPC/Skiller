use rusqlite::Connection;
use std::process::Command;
use uuid::Uuid;
use chrono::Utc;
use std::io::Write;

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

struct TempClawhubConfig {
    path: String,
    registry_url: String,
}

impl TempClawhubConfig {
    fn create(registry_url: &str, token: &str) -> Result<Self, SkillerError> {
        let id = Uuid::new_v4().to_string();
        let temp_dir = std::env::temp_dir().join("skiller_clawhub");
        std::fs::create_dir_all(&temp_dir).map_err(|e| SkillerError::IoError(e))?;
        let config_path = temp_dir.join(format!("config-{}.json", id));
        let config = serde_json::json!({
            "registry": registry_url,
            "token": token
        });
        let mut file = std::fs::File::create(&config_path).map_err(|e| SkillerError::IoError(e))?;
        file.write_all(config.to_string().as_bytes()).map_err(|e| SkillerError::IoError(e))?;
        Ok(Self {
            path: config_path.to_string_lossy().to_string(),
            registry_url: registry_url.to_string(),
        })
    }

    fn apply_to_command(&self, cmd: &mut Command) {
        cmd.env("CLAWHUB_CONFIG_PATH", &self.path);
        cmd.env("CLAWHUB_REGISTRY", &self.registry_url);
    }
}

impl Drop for TempClawhubConfig {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.path);
    }
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
            let username = body
                .get("user").and_then(|u| u.get("handle"))
                .and_then(|v| v.as_str())
                .map(String::from)
                .or_else(|| body.get("username").and_then(|v| v.as_str()).map(String::from));
            Ok(ConnectionTestResult {
                success: true,
                message: "Connection successful".to_string(),
                username,
            })
        } else {
            let status = response.status();
            let error_body: serde_json::Value = response.json().await.unwrap_or(serde_json::json!({}));
            let msg = error_body.get("msg").and_then(|v| v.as_str()).unwrap_or("");
            Ok(ConnectionTestResult {
                success: false,
                message: if !msg.is_empty() {
                    format!("Authentication failed: {} (HTTP {})", msg, status)
                } else {
                    format!("Authentication failed: HTTP {}", status)
                },
                username: None,
            })
        }
    })
}

fn test_cli_connection(source: &ClawhubSource) -> Result<ConnectionTestResult, SkillerError> {
    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let config = TempClawhubConfig::create(&source.registry_url, &source.token)?;
    let mut cmd = Command::new(cli_path);
    cmd.arg("whoami");
    config.apply_to_command(&mut cmd);

    let output = cmd.output().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            SkillerError::ClawhubCliError("clawhub CLI not found. Please install it first.".to_string())
        } else {
            SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e))
        }
    })?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let username = if !stdout.is_empty() {
            Some(stdout)
        } else {
            extract_username_from_spinner(&stderr)
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

fn extract_username_from_spinner(stderr: &str) -> Option<String> {
    for line in stderr.lines() {
        let stripped = strip_ansi(line);
        let trimmed = stripped.trim();
        if trimmed.starts_with('✔') || trimmed.starts_with('✓') {
            let handle: String = trimmed.chars().skip(1).collect::<String>().trim().to_string();
            if !handle.is_empty() {
                return Some(handle);
            }
        }
    }
    None
}

fn strip_ansi(s: &str) -> String {
    let re = regex::Regex::new(r"\x1b\[[0-9;]*m").unwrap();
    re.replace_all(s, "").to_string()
}

fn parse_skill_list_response(body: &str, mode: &str) -> Result<Vec<ClawhubSkill>, SkillerError> {
    match serde_json::from_str::<ClawhubExploreResponse>(body) {
        Ok(resp) => Ok(resp.skills),
        Err(_) => {
            let cli_resp: ClawhubCliExploreResponse = serde_json::from_str(body).map_err(|e| {
                match mode {
                    "api" => SkillerError::ClawhubApiError(format!("Parse error: {}", e)),
                    _ => SkillerError::ClawhubCliError(format!("Parse error: {}", e)),
                }
            })?;
            Ok(cli_resp.items.into_iter().map(|item| item.into_clawhub_skill()).collect())
        }
    }
}

fn parse_skill_overview_response(body: &str) -> Result<ClawhubSkillOverview, SkillerError> {
    let response: ClawhubApiSkillDetailResponse = serde_json::from_str(body)
        .map_err(|e| SkillerError::ClawhubApiError(format!("Parse error: {}", e)))?;

    let skill = response.skill;
    let version = response.latest_version.as_ref().map(|item| item.version.clone());
    let downloads = skill.stats.as_ref()
        .and_then(|s| s.get("installsAllTime"))
        .and_then(|v| v.as_i64());
    let rating = skill.stats.as_ref()
        .and_then(|s| s.get("stars"))
        .and_then(|v| v.as_f64());

    Ok(ClawhubSkillOverview {
        slug: skill.slug,
        name: skill.display_name,
        description: skill.summary.clone(),
        summary: skill.summary,
        version,
        downloads,
        rating,
        created_at: skill.created_at.map(|value| value.to_string()),
        updated_at: skill.updated_at.map(|value| value.to_string()),
        owner_handle: response.owner.as_ref().map(|owner| owner.handle.clone()),
        owner_name: response.owner.and_then(|owner| owner.display_name),
        metadata_os: response.metadata.as_ref().and_then(|metadata| metadata.os.clone()),
        metadata_systems: response.metadata.and_then(|metadata| metadata.systems),
    })
}

fn parse_skill_versions_response(body: &str) -> Result<Vec<ClawhubSkillVersionItem>, SkillerError> {
    let response: ClawhubApiVersionsResponse = serde_json::from_str(body)
        .map_err(|e| SkillerError::ClawhubApiError(format!("Parse error: {}", e)))?;

    Ok(response.versions.into_iter().map(|version| ClawhubSkillVersionItem {
        version: version.version,
        created_at: version.created_at.map(|value| value.to_string()),
        changelog: version.changelog,
        is_latest: version.tags.unwrap_or_default().iter().any(|tag| tag == "latest"),
    }).collect())
}

fn parse_skill_files_response(body: &str) -> Result<Vec<ClawhubSkillFileEntry>, SkillerError> {
    let response: ClawhubApiVersionDetailResponse = serde_json::from_str(body)
        .map_err(|e| SkillerError::ClawhubApiError(format!("Parse error: {}", e)))?;

    Ok(response.version.files.into_iter().map(|file| ClawhubSkillFileEntry {
        path: file.path,
        size: file.size,
        content_type: file.content_type,
    }).collect())
}

fn parse_cli_skill_detail_response(body: &str) -> Result<ClawhubSkillDetail, SkillerError> {
    let response: ClawhubApiSkillDetailResponse = serde_json::from_str(body)
        .map_err(|e| SkillerError::ClawhubCliError(format!("Parse error: {}", e)))?;

    let skill = response.skill;
    let version = response.latest_version.as_ref().map(|item| item.version.clone());
    let downloads = skill.stats.as_ref()
        .and_then(|stats| stats.get("installsAllTime"))
        .and_then(|value| value.as_i64());
    let rating = skill.stats.as_ref()
        .and_then(|stats| stats.get("stars"))
        .and_then(|value| value.as_f64());

    Ok(ClawhubSkillDetail {
        slug: skill.slug,
        name: skill.display_name,
        description: skill.summary,
        version,
        downloads,
        rating,
        created_at: skill.created_at.map(|value| value.to_string()),
        updated_at: skill.updated_at.map(|value| value.to_string()),
        skill_md_content: None,
    })
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
        let body = response.text().await.map_err(|e| SkillerError::ClawhubApiError(format!("Read body error: {}", e)))?;
        let skills = parse_skill_list_response(&body, "api")?;
        Ok(skills)
    })
}

fn explore_cli(source: &ClawhubSource, sort: &str, limit: Option<i32>) -> Result<Vec<ClawhubSkill>, SkillerError> {
    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let limit_val = limit.unwrap_or(25);
    let config = TempClawhubConfig::create(&source.registry_url, &source.token)?;
    let mut cmd = Command::new(cli_path);
    cmd.arg("explore").arg("--json").arg("--limit").arg(limit_val.to_string()).arg("--sort").arg(sort);
    config.apply_to_command(&mut cmd);
    let output = cmd.output().map_err(|e| SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e)))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(SkillerError::ClawhubCliError(format!("CLI error: {}", stderr.trim())));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let skills = parse_skill_list_response(&stdout, "cli")?;
    Ok(skills)
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
        let body = response.text().await.map_err(|e| SkillerError::ClawhubApiError(format!("Read body error: {}", e)))?;
        let search_resp: ClawhubSearchResponse = serde_json::from_str(&body)
            .map_err(|e| SkillerError::ClawhubApiError(format!("Parse error: {}", e)))?;
        Ok(search_resp.results.into_iter().map(|r| r.into_clawhub_skill()).collect())
    })
}

fn search_cli(source: &ClawhubSource, query: &str) -> Result<Vec<ClawhubSkill>, SkillerError> {
    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let config = TempClawhubConfig::create(&source.registry_url, &source.token)?;
    let mut cmd = Command::new(cli_path);
    cmd.arg("search").arg(query);
    config.apply_to_command(&mut cmd);
    let output = cmd.output().map_err(|e| SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e)))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(SkillerError::ClawhubCliError(format!("CLI error: {}", stderr.trim())));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_cli_search_output(&stdout)
}

fn parse_cli_search_output(output: &str) -> Result<Vec<ClawhubSkill>, SkillerError> {
    let mut skills = Vec::new();
    for line in output.lines() {
        let line = strip_ansi(line).trim().to_string();
        if line.is_empty() || line.starts_with('-') || line.to_lowercase().contains("searching") {
            continue;
        }
        let parts: Vec<&str> = line.splitn(2, "  ").collect();
        if parts.len() >= 2 {
            let slug = parts[0].trim();
            let rest = parts[1].trim();
            let name = rest.split("  ").next().unwrap_or("").trim().to_string();
            if !slug.is_empty() {
                skills.push(ClawhubSkill {
                    slug: slug.to_string(),
                    name: if name.is_empty() { slug.to_string() } else { name },
                    description: None,
                    version: None,
                    downloads: None,
                    rating: None,
                    created_at: None,
                    updated_at: None,
                });
            }
        }
    }
    Ok(skills)
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
        let body = response.text().await.map_err(|e| SkillerError::ClawhubApiError(format!("Read body error: {}", e)))?;
        let overview = parse_skill_overview_response(&body)?;

        Ok(ClawhubSkillDetail {
            slug: overview.slug,
            name: overview.name,
            description: overview.summary.or(overview.description),
            version: overview.version,
            downloads: overview.downloads,
            rating: overview.rating,
            created_at: overview.created_at,
            updated_at: overview.updated_at,
            skill_md_content: None,
        })
    })
}

fn inspect_cli(source: &ClawhubSource, slug: &str) -> Result<ClawhubSkillDetail, SkillerError> {
    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let config = TempClawhubConfig::create(&source.registry_url, &source.token)?;
    let mut cmd = Command::new(cli_path);
    cmd.arg("inspect").arg(slug).arg("--json");
    config.apply_to_command(&mut cmd);
    let output = cmd.output().map_err(|e| SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e)))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(SkillerError::ClawhubCliError(format!("CLI error: {}", stderr.trim())));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut detail = parse_cli_skill_detail_response(&stdout)?;

    let mut md_cmd = Command::new(cli_path);
    md_cmd.arg("inspect").arg(slug).arg("--file").arg("SKILL.md");
    config.apply_to_command(&mut md_cmd);
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

pub fn list_versions(conn: &Connection, source_id: &str, slug: &str) -> Result<Vec<ClawhubSkillVersionItem>, SkillerError> {
    let source = get_source_by_id_with_token(conn, source_id)?;
    match source.connection_type.as_str() {
        "api" => list_versions_api(&source, slug),
        "cli" => list_versions_cli(&source, slug),
        _ => Err(SkillerError::ValidationError(format!("Unknown connection type: {}", source.connection_type))),
    }
}

fn list_versions_api(source: &ClawhubSource, slug: &str) -> Result<Vec<ClawhubSkillVersionItem>, SkillerError> {
    let runtime = tokio::runtime::Runtime::new().map_err(|e| SkillerError::ClawhubApiError(e.to_string()))?;
    runtime.block_on(async {
        let client = reqwest::Client::new();
        let url = format!("{}/api/v1/skills/{}/versions", source.registry_url.trim_end_matches('/'), slug);
        let mut request = client.get(&url);
        if !source.token.is_empty() {
            request = request.bearer_auth(&source.token);
        }
        let response = request.send().await.map_err(|e| SkillerError::ClawhubApiError(format!("Network error: {}", e)))?;
        if !response.status().is_success() {
            return Err(SkillerError::ClawhubApiError(format!("API error: HTTP {}", response.status())));
        }
        let body = response.text().await.map_err(|e| SkillerError::ClawhubApiError(format!("Read body error: {}", e)))?;
        parse_skill_versions_response(&body)
    })
}

fn list_versions_cli(source: &ClawhubSource, slug: &str) -> Result<Vec<ClawhubSkillVersionItem>, SkillerError> {
    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let config = TempClawhubConfig::create(&source.registry_url, &source.token)?;
    let mut cmd = Command::new(cli_path);
    cmd.arg("inspect").arg(slug).arg("--versions").arg("--json");
    config.apply_to_command(&mut cmd);
    let output = cmd.output().map_err(|e| SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e)))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(SkillerError::ClawhubCliError(format!("CLI error: {}", stderr.trim())));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_skill_versions_response(&stdout)
}

pub fn list_files(conn: &Connection, source_id: &str, slug: &str, version: Option<&str>) -> Result<Vec<ClawhubSkillFileEntry>, SkillerError> {
    let source = get_source_by_id_with_token(conn, source_id)?;
    match source.connection_type.as_str() {
        "api" => list_files_api(&source, slug, version),
        "cli" => list_files_cli(&source, slug, version),
        _ => Err(SkillerError::ValidationError(format!("Unknown connection type: {}", source.connection_type))),
    }
}

fn list_files_api(source: &ClawhubSource, slug: &str, version: Option<&str>) -> Result<Vec<ClawhubSkillFileEntry>, SkillerError> {
    let runtime = tokio::runtime::Runtime::new().map_err(|e| SkillerError::ClawhubApiError(e.to_string()))?;
    runtime.block_on(async {
        let client = reqwest::Client::new();
        let version_value = version.unwrap_or("latest");
        let url = format!("{}/api/v1/skills/{}/versions/{}", source.registry_url.trim_end_matches('/'), slug, version_value);
        let mut request = client.get(&url);
        if !source.token.is_empty() {
            request = request.bearer_auth(&source.token);
        }
        let response = request.send().await.map_err(|e| SkillerError::ClawhubApiError(format!("Network error: {}", e)))?;
        if !response.status().is_success() {
            return Err(SkillerError::ClawhubApiError(format!("API error: HTTP {}", response.status())));
        }
        let body = response.text().await.map_err(|e| SkillerError::ClawhubApiError(format!("Read body error: {}", e)))?;
        parse_skill_files_response(&body)
    })
}

fn list_files_cli(source: &ClawhubSource, slug: &str, version: Option<&str>) -> Result<Vec<ClawhubSkillFileEntry>, SkillerError> {
    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let config = TempClawhubConfig::create(&source.registry_url, &source.token)?;
    let mut cmd = Command::new(cli_path);
    cmd.arg("inspect").arg(slug);
    if let Some(version_value) = version {
        cmd.arg("--version").arg(version_value);
    }
    cmd.arg("--files").arg("--json");
    config.apply_to_command(&mut cmd);
    let output = cmd.output().map_err(|e| SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e)))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(SkillerError::ClawhubCliError(format!("CLI error: {}", stderr.trim())));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_skill_files_response(&stdout)
}

pub fn read_file(conn: &Connection, source_id: &str, slug: &str, path: &str, version: Option<&str>) -> Result<ClawhubSkillFileContent, SkillerError> {
    let source = get_source_by_id_with_token(conn, source_id)?;
    match source.connection_type.as_str() {
        "api" => read_file_api(&source, slug, path, version),
        "cli" => read_file_cli(&source, slug, path, version),
        _ => Err(SkillerError::ValidationError(format!("Unknown connection type: {}", source.connection_type))),
    }
}

fn read_file_api(source: &ClawhubSource, slug: &str, path: &str, version: Option<&str>) -> Result<ClawhubSkillFileContent, SkillerError> {
    let runtime = tokio::runtime::Runtime::new().map_err(|e| SkillerError::ClawhubApiError(e.to_string()))?;
    runtime.block_on(async {
        let client = reqwest::Client::new();
        let mut url = reqwest::Url::parse(&format!("{}/api/v1/skills/{}/file", source.registry_url.trim_end_matches('/'), slug))
            .map_err(|e| SkillerError::ClawhubApiError(format!("Invalid URL: {}", e)))?;
        {
            let mut pairs = url.query_pairs_mut();
            pairs.append_pair("path", path);
            if let Some(version_value) = version {
                pairs.append_pair("version", version_value);
            }
        }
        let mut request = client.get(url);
        if !source.token.is_empty() {
            request = request.bearer_auth(&source.token);
        }
        let response = request.send().await.map_err(|e| SkillerError::ClawhubApiError(format!("Network error: {}", e)))?;
        if !response.status().is_success() {
            return Err(SkillerError::ClawhubApiError(format!("API error: HTTP {}", response.status())));
        }
        let content = response.text().await.map_err(|e| SkillerError::ClawhubApiError(format!("Read body error: {}", e)))?;
        Ok(ClawhubSkillFileContent {
            path: path.to_string(),
            content: Some(content),
            is_markdown: path.ends_with(".md"),
        })
    })
}

fn read_file_cli(source: &ClawhubSource, slug: &str, path: &str, version: Option<&str>) -> Result<ClawhubSkillFileContent, SkillerError> {
    let cli_path = source.cli_path.as_deref().unwrap_or("clawhub");
    let config = TempClawhubConfig::create(&source.registry_url, &source.token)?;
    let mut cmd = Command::new(cli_path);
    cmd.arg("inspect").arg(slug);
    if let Some(version_value) = version {
        cmd.arg("--version").arg(version_value);
    }
    cmd.arg("--file").arg(path);
    config.apply_to_command(&mut cmd);
    let output = cmd.output().map_err(|e| SkillerError::ClawhubCliError(format!("Failed to execute CLI: {}", e)))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(SkillerError::ClawhubCliError(format!("CLI error: {}", stderr.trim())));
    }
    Ok(ClawhubSkillFileContent {
        path: path.to_string(),
        content: Some(String::from_utf8_lossy(&output.stdout).to_string()),
        is_markdown: path.ends_with(".md"),
    })
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
    let config = TempClawhubConfig::create(&source.registry_url, &source.token)?;
    let mut cmd = Command::new(cli_path);
    cmd.arg("install").arg(slug).arg("--dir").arg(target_dir.to_string_lossy().as_ref());
    config.apply_to_command(&mut cmd);

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

#[cfg(test)]
mod tests {
    use super::{parse_cli_skill_detail_response, parse_skill_list_response, parse_skill_overview_response, parse_skill_versions_response, parse_skill_files_response, parse_cli_search_output};

    #[test]
    fn parses_api_skill_wrapper_with_metadata() {
        let body = r#"{
            "skills": [
                {
                    "slug": "api-skill",
                    "name": "API Skill",
                    "description": "demo",
                    "version": "1.0.0",
                    "downloads": 101,
                    "rating": 4.8,
                    "created_at": "2026-05-10T00:00:00Z",
                    "updated_at": "2026-05-13T00:00:00Z"
                }
            ]
        }"#;

        let skills = parse_skill_list_response(body, "api").expect("should parse api response");

        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].downloads, Some(101));
        assert_eq!(skills[0].rating, Some(4.8));
        assert_eq!(skills[0].updated_at.as_deref(), Some("2026-05-13T00:00:00Z"));
    }

    #[test]
    fn parses_cli_item_wrapper_with_metadata() {
        let body = r#"{
            "items": [
                {
                    "slug": "cli-skill",
                    "displayName": "CLI Skill",
                    "summary": "demo",
                    "stats": {
                        "installsAllTime": 202,
                        "stars": 4.9
                    },
                    "latestVersion": {
                        "version": "2.0.0"
                    },
                    "createdAt": 1747094400,
                    "updatedAt": 1747353600
                }
            ]
        }"#;

        let skills = parse_skill_list_response(body, "cli").expect("should parse cli response");

        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].downloads, Some(202));
        assert_eq!(skills[0].rating, Some(4.9));
        assert_eq!(skills[0].version.as_deref(), Some("2.0.0"));
        assert_eq!(skills[0].updated_at.as_deref(), Some("1747353600"));
    }

    #[test]
    fn parses_documented_skill_detail_wrapper_into_overview() {
        let body = r#"{
            "skill": {
                "slug": "demo-skill",
                "displayName": "Demo Skill",
                "summary": "Skill description",
                "stats": {
                    "installsAllTime": 42,
                    "stars": 4.7
                },
                "createdAt": 1746871200,
                "updatedAt": 1747139696
            },
            "latestVersion": {
                "version": "1.2.3",
                "createdAt": 1747139696,
                "changelog": "Latest"
            },
            "metadata": {
                "os": ["macos"],
                "systems": ["aarch64-darwin"]
            },
            "owner": {
                "handle": "openclaw",
                "displayName": "OpenClaw",
                "image": null
            }
        }"#;

        let overview = parse_skill_overview_response(body).expect("should parse documented overview response");

        assert_eq!(overview.slug, "demo-skill");
        assert_eq!(overview.name, "Demo Skill");
        assert_eq!(overview.version.as_deref(), Some("1.2.3"));
        assert_eq!(overview.downloads, Some(42));
        assert_eq!(overview.rating, Some(4.7));
        assert_eq!(overview.owner_handle.as_deref(), Some("openclaw"));
    }

    #[test]
    fn parses_cli_inspect_wrapper_into_skill_detail() {
        let body = r#"{
            "skill": {
                "slug": "demo-skill",
                "displayName": "Demo Skill",
                "summary": "Skill description",
                "stats": {
                    "installsAllTime": 42,
                    "stars": 4.7
                },
                "createdAt": 1746871200,
                "updatedAt": 1747139696
            },
            "latestVersion": {
                "version": "1.2.3"
            }
        }"#;

        let detail = parse_cli_skill_detail_response(body).expect("wrapper payload should parse into detail");

        assert_eq!(detail.slug, "demo-skill");
        assert_eq!(detail.name, "Demo Skill");
        assert_eq!(detail.description.as_deref(), Some("Skill description"));
        assert_eq!(detail.version.as_deref(), Some("1.2.3"));
        assert_eq!(detail.downloads, Some(42));
        assert_eq!(detail.rating, Some(4.7));
        assert_eq!(detail.created_at.as_deref(), Some("1746871200"));
        assert_eq!(detail.updated_at.as_deref(), Some("1747139696"));
        assert!(detail.skill_md_content.is_none());
    }

    #[test]
    fn parses_versions_response_into_version_items() {
        let body = r#"{
            "versions": [
                {
                    "version": "1.2.3",
                    "createdAt": 1747139696,
                    "changelog": "Latest",
                    "tags": ["latest"]
                },
                {
                    "version": "1.2.2",
                    "createdAt": 1746871200,
                    "changelog": "Previous",
                    "tags": []
                }
            ]
        }"#;

        let versions = parse_skill_versions_response(body).expect("should parse versions response");

        assert_eq!(versions.len(), 2);
        assert_eq!(versions[0].version, "1.2.3");
        assert!(versions[0].is_latest);
        assert!(!versions[1].is_latest);
    }

    #[test]
    fn parses_version_detail_files_into_file_entries() {
        let body = r#"{
            "version": {
                "version": "1.2.3",
                "files": [
                    {
                        "path": "SKILL.md",
                        "size": 1200,
                        "contentType": "text/markdown"
                    },
                    {
                        "path": "notes.txt",
                        "size": 50,
                        "contentType": "text/plain"
                    }
                ]
            }
        }"#;

        let files = parse_skill_files_response(body).expect("should parse files response");

        assert_eq!(files.len(), 2);
        assert_eq!(files[0].path, "SKILL.md");
        assert_eq!(files[1].content_type.as_deref(), Some("text/plain"));
    }

    #[test]
    fn parses_api_search_response_with_results_field() {
        use crate::models::clawhub::ClawhubSearchResponse;

        let body = r#"{
            "results": [
                {
                    "slug": "test-skill",
                    "displayName": "Test Skill",
                    "summary": "A test skill",
                    "score": 4.23,
                    "updatedAt": 1778485852489
                },
                {
                    "slug": "another-skill",
                    "displayName": "Another",
                    "summary": "Another skill",
                    "score": 3.10
                }
            ]
        }"#;

        let resp: ClawhubSearchResponse = serde_json::from_str(body).expect("should parse search response");
        let skills: Vec<crate::models::clawhub::ClawhubSkill> = resp.results.into_iter().map(|r| r.into_clawhub_skill()).collect();

        assert_eq!(skills.len(), 2);
        assert_eq!(skills[0].slug, "test-skill");
        assert_eq!(skills[0].name, "Test Skill");
        assert_eq!(skills[0].description.as_deref(), Some("A test skill"));
        assert_eq!(skills[0].updated_at.as_deref(), Some("1778485852489"));
        assert_eq!(skills[1].slug, "another-skill");
        assert!(skills[1].updated_at.is_none());
    }

    #[test]
    fn parses_cli_search_text_output() {
        let output = "- Searching\ntest  Test  (4.232)\nbot-status-api-test  Test  (3.102)\nken-test  test  (2.944)\n";

        let skills = parse_cli_search_output(output).expect("should parse cli search output");

        assert_eq!(skills.len(), 3);
        assert_eq!(skills[0].slug, "test");
        assert_eq!(skills[0].name, "Test");
        assert_eq!(skills[1].slug, "bot-status-api-test");
        assert_eq!(skills[2].slug, "ken-test");
    }

    #[test]
    fn parses_cli_search_with_ansi_codes() {
        let output = "\u{1b}[32m- Searching\u{1b}[0m\n\u{1b}[1mtest\u{1b}[0m  Test  (4.232)\n";

        let skills = parse_cli_search_output(output).expect("should parse ansi output");

        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].slug, "test");
    }
}
