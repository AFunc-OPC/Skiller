use rusqlite::Connection;

pub fn add_builtin_repos(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    if !column_exists(conn, "repos", "is_builtin")? {
        conn.execute(
            "ALTER TABLE repos ADD COLUMN is_builtin INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    let initialized: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM config WHERE key = 'builtin_repos_initialized'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if initialized {
        return Ok(());
    }

    let built_in_repos = include_str!("../../../built-in-repos.json");
    let repos: Vec<BuiltInRepo> = serde_json::from_str(built_in_repos).map_err(|e| {
        crate::error::SkillerError::InvalidInput(format!("Failed to parse built-in repos: {}", e))
    })?;

    for repo in repos {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT OR IGNORE INTO repos (id, name, url, branch, description, skill_relative_path, auth_method, is_builtin, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9)",
            rusqlite::params![
                id,
                repo.name,
                repo.url,
                repo.branch,
                repo.description,
                repo.skill_relative_path,
                repo.auth_method,
                now,
                now,
            ],
        )?;
    }

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO config (key, value, updated_at) VALUES ('builtin_repos_initialized', 'true', ?1)",
        rusqlite::params![now],
    )?;

    Ok(())
}

#[derive(serde::Deserialize)]
struct BuiltInRepo {
    name: String,
    url: String,
    branch: String,
    description: Option<String>,
    skill_relative_path: Option<String>,
    auth_method: Option<String>,
}

fn column_exists(
    conn: &Connection,
    table: &str,
    column: &str,
) -> Result<bool, crate::error::SkillerError> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let mut rows = stmt.query([])?;

    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name == column {
            return Ok(true);
        }
    }

    Ok(false)
}
