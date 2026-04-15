use rusqlite::Connection;

pub fn enhance_tool_presets(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    if !column_exists(conn, "tool_presets", "global_path")? {
        conn.execute(
            "ALTER TABLE tool_presets ADD COLUMN global_path TEXT NOT NULL DEFAULT ''",
            [],
        )?;
    }

    conn.execute(
        "UPDATE tool_presets SET global_path = '~/' || skill_path WHERE global_path = '' OR global_path IS NULL",
        [],
    )?;

    Ok(())
}

fn column_exists(
    conn: &Connection,
    table: &str,
    column: &str,
) -> Result<bool, crate::error::SkillerError> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))?;
    let mut rows = stmt.query([])?;

    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name == column {
            return Ok(true);
        }
    }

    Ok(false)
}
