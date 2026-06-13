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

pub fn add_tag_sort_pin_columns(conn: &Connection) -> Result<(), SkillerError> {
    if !column_exists(conn, "tags", "sort_order")? {
        conn.execute(
            "ALTER TABLE tags ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    if !column_exists(conn, "tags", "is_pinned")? {
        conn.execute(
            "ALTER TABLE tags ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    if !column_exists(conn, "tags", "pinned_at")? {
        conn.execute("ALTER TABLE tags ADD COLUMN pinned_at TEXT", [])?;
    }

    Ok(())
}
