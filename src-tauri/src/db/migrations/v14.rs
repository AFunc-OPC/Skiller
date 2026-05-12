use rusqlite::Connection;

pub fn add_clawhub_sources_table(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    if !table_exists(conn, "clawhub_sources")? {
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS clawhub_sources (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                registry_url TEXT NOT NULL,
                token TEXT NOT NULL,
                connection_type TEXT NOT NULL DEFAULT 'api',
                cli_path TEXT,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            "#,
        )?;
    }

    Ok(())
}

fn table_exists(conn: &Connection, table: &str) -> Result<bool, crate::error::SkillerError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
        [table],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}