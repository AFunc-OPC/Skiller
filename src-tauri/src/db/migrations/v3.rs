use rusqlite::Connection;

pub fn fix_unique_constraint(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    let tags_new_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='tags_new'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if tags_new_exists {
        conn.execute("DROP TABLE tags_new", [])?;
    }

    let has_unique_constraint: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='index' AND tbl_name='tags' AND sql LIKE '%UNIQUE%'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !has_unique_constraint {
        return Ok(());
    }

    conn.execute_batch(
        r#"
        CREATE TABLE tags_new (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            group_id TEXT NOT NULL,
            parent_id TEXT,
            materialized_path TEXT,
            depth INTEGER DEFAULT 0,
            is_builtin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (parent_id) REFERENCES tags_new(id)
        );
        
        INSERT INTO tags_new SELECT id, name, group_id, parent_id, materialized_path, depth, COALESCE((SELECT 1 FROM pragma_table_info('tags') WHERE name='is_builtin'), 0) as is_builtin, created_at, updated_at FROM tags;
        
        DROP TABLE tags;
        
        ALTER TABLE tags_new RENAME TO tags;
        
        CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
        CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_id);
        CREATE INDEX IF NOT EXISTS idx_tags_path ON tags(materialized_path);
        "#,
    )?;

    Ok(())
}
