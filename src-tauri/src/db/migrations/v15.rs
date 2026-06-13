use rusqlite::Connection;

use crate::error::SkillerError;

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, SkillerError> {
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

pub fn add_repo_source_type(conn: &Connection) -> Result<(), SkillerError> {
    if !column_exists(conn, "repos", "source_type")? {
        conn.execute(
            "ALTER TABLE repos ADD COLUMN source_type TEXT NOT NULL DEFAULT 'remote'",
            [],
        )?;
    }

    Ok(())
}
