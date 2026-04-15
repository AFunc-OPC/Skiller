use rusqlite::Connection;

pub fn add_project_metadata(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    if !column_exists(conn, "projects", "description")? {
        conn.execute("ALTER TABLE projects ADD COLUMN description TEXT", [])?;
    }

    if !column_exists(conn, "projects", "icon")? {
        conn.execute("ALTER TABLE projects ADD COLUMN icon TEXT", [])?;
    }

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
