use rusqlite::Connection;

pub fn add_tool_preset_updated_at(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    if !column_exists(conn, "tool_presets", "updated_at")? {
        conn.execute("ALTER TABLE tool_presets ADD COLUMN updated_at TEXT", [])?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE tool_presets SET updated_at = ? WHERE updated_at IS NULL",
            [now],
        )?;
    }

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
