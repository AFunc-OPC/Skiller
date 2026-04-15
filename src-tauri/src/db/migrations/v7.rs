use rusqlite::Connection;

pub fn add_repo_metadata(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    conn.execute_batch(
        r#"
        ALTER TABLE repos ADD COLUMN description TEXT;
        ALTER TABLE repos ADD COLUMN skill_relative_path TEXT;
        ALTER TABLE repos ADD COLUMN auth_method TEXT DEFAULT 'ssh';
        ALTER TABLE repos ADD COLUMN username TEXT;
        ALTER TABLE repos ADD COLUMN token TEXT;
        ALTER TABLE repos ADD COLUMN ssh_key TEXT;
        "#,
    )?;

    Ok(())
}
