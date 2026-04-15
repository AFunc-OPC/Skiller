use rusqlite::Connection;

pub fn rollback_tag_hierarchy(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    conn.execute_batch(
        r#"
        DROP INDEX IF EXISTS idx_tags_path;
        DROP INDEX IF EXISTS idx_tags_parent;
        
        CREATE TABLE tags_backup AS 
            SELECT id, name, group_id, created_at, updated_at 
            FROM tags;
        
        DROP TABLE tags;
        
        CREATE TABLE tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            group_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        INSERT INTO tags SELECT * FROM tags_backup;
        
        DROP TABLE tags_backup;
        
        CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
        "#,
    )?;

    Ok(())
}
