use rusqlite::Connection;

pub fn change_repo_unique_constraint(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS repos_new (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            url TEXT NOT NULL,
            local_path TEXT,
            branch TEXT NOT NULL,
            last_sync TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        INSERT OR IGNORE INTO repos_new 
        SELECT id, name, url, local_path, branch, last_sync, created_at, updated_at 
        FROM repos;

        DROP TABLE repos;

        ALTER TABLE repos_new RENAME TO repos;
        "#,
    )?;

    Ok(())
}
