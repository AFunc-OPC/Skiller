use rusqlite::Connection;

pub fn migrate_tag_hierarchy(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    let parent_id_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('tags') WHERE name='parent_id'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !parent_id_exists {
        conn.execute_batch(
            r#"
            ALTER TABLE tags ADD COLUMN parent_id TEXT REFERENCES tags(id);
            ALTER TABLE tags ADD COLUMN materialized_path TEXT;
            ALTER TABLE tags ADD COLUMN depth INTEGER DEFAULT 0;
            
            CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_id);
            CREATE INDEX IF NOT EXISTS idx_tags_path ON tags(materialized_path);
            "#,
        )?;
    }

    conn.execute_batch(
        r#"
        UPDATE tags SET 
            materialized_path = name,
            depth = 0
        WHERE materialized_path IS NULL OR depth IS NULL;
        "#,
    )?;

    Ok(())
}
