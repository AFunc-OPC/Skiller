use rusqlite::Connection;
use uuid::Uuid;

pub fn add_global_skills_project(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    if !column_exists(conn, "projects", "is_builtin")? {
        conn.execute(
            "ALTER TABLE projects ADD COLUMN is_builtin INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    let initialized: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM config WHERE key = 'global_skills_project_initialized'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if initialized {
        return Ok(());
    }

    let home = dirs::home_dir()
        .ok_or_else(|| crate::error::SkillerError::DatabaseError(rusqlite::Error::InvalidQuery))?;
    let home_path = home.to_string_lossy();

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        r#"
        INSERT OR IGNORE INTO projects (id, name, path, skill_path, tool_preset_id, description, icon, is_builtin, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9)
        "#,
        rusqlite::params![
            id,
            "Global Skills",
            home_path.as_ref(),
            ".agents/skills/",
            None::<String>,
            "Built-in project for managing global skills. Most AI tools store their global skills in the user directory, making this project convenient for enabling or disabling global skills.",
            "global",
            now,
            now
        ],
    )?;

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO config (key, value, updated_at) VALUES ('global_skills_project_initialized', 'true', ?1)",
        rusqlite::params![now],
    )?;

    Ok(())
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
