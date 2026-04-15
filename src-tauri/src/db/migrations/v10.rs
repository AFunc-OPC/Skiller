use rusqlite::Connection;

pub fn add_builtin_tags(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    if !column_exists(conn, "tag_groups", "is_builtin")? {
        conn.execute(
            "ALTER TABLE tag_groups ADD COLUMN is_builtin INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    if !column_exists(conn, "tags", "is_builtin")? {
        conn.execute(
            "ALTER TABLE tags ADD COLUMN is_builtin INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    let initialized: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM config WHERE key = 'builtin_tags_initialized'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if initialized {
        return Ok(());
    }

    conn.execute_batch(
        r#"
        INSERT OR IGNORE INTO tags (id, name, group_id, parent_id, materialized_path, depth, is_builtin, created_at, updated_at) VALUES
            ('tag-build', '构建', 'group-build', NULL, '构建', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('tag-package', '打包', 'group-build', NULL, '打包', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('tag-deploy', '部署', 'group-build', NULL, '部署', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('tag-release', '发布', 'group-build', NULL, '发布', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            
            ('tag-git', 'Git', 'group-sync', NULL, 'Git', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('tag-sync', '同步', 'group-sync', NULL, '同步', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('tag-clone', '克隆', 'group-sync', NULL, '克隆', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('tag-branch', '分支', 'group-sync', NULL, '分支', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            
            ('tag-docs', '文档', 'group-quality', NULL, '文档', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('tag-test', '测试', 'group-quality', NULL, '测试', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('tag-lint', '代码规范', 'group-quality', NULL, '代码规范', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('tag-comment', '注释', 'group-quality', NULL, '注释', 0, 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z');
        "#,
    )?;

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO config (key, value, updated_at) VALUES ('builtin_tags_initialized', 'true', ?1)",
        rusqlite::params![now],
    )?;

    Ok(())
}

fn column_exists(
    conn: &Connection,
    table: &str,
    column: &str,
) -> Result<bool, crate::error::SkillerError> {
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
