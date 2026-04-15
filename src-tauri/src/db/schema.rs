use rusqlite::Connection;

pub fn create_tables(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS skills (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            file_path TEXT NOT NULL,
            source TEXT NOT NULL,
            repo_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            group_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS tag_groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            is_builtin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS skill_tags (
            skill_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            PRIMARY KEY (skill_id, tag_id)
        );
        
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            skill_path TEXT NOT NULL,
            tool_preset_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS project_skills (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            method TEXT NOT NULL,
            target_path TEXT,
            distributed_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS repos (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            url TEXT NOT NULL,
            local_path TEXT,
            branch TEXT NOT NULL,
            last_sync TEXT,
            is_builtin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS tool_presets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            skill_path TEXT NOT NULL,
            global_path TEXT NOT NULL DEFAULT '',
            is_builtin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
        CREATE INDEX IF NOT EXISTS idx_skills_repo ON skills(repo_id);
        CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
        CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
        "#,
    )?;

    Ok(())
}
