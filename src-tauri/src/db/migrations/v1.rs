use rusqlite::Connection;

pub fn seed_initial_data(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    conn.execute_batch(
        r#"
        INSERT OR IGNORE INTO tag_groups (id, name, is_builtin, created_at) VALUES
            ('group-build', '构建与分发', 1, '2026-04-01T00:00:00Z'),
            ('group-sync', '同步与仓库', 1, '2026-04-01T00:00:00Z'),
            ('group-quality', '文档与质量', 1, '2026-04-01T00:00:00Z');
        
        INSERT OR IGNORE INTO config (key, value, updated_at) VALUES
            ('skill_center_path', './skill-center', '2026-04-01T00:00:00Z'),
            ('global_skill_path', '', '2026-04-01T00:00:00Z'),
            ('max_skill_size', '1048576', '2026-04-01T00:00:00Z'),
            ('auto_refresh_repos', 'false', '2026-04-01T00:00:00Z');
        "#,
    )?;

    let initialized: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM config WHERE key = 'builtin_presets_initialized'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if initialized {
        return Ok(());
    }

    conn.execute_batch(
        r#"
        INSERT OR IGNORE INTO tool_presets (id, name, skill_path, global_path, is_builtin, created_at, updated_at) VALUES
            ('preset-cursor', 'Cursor', '.cursor/rules/', '~/.cursor/rules/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-claude', 'Claude Code', '.claude/commands/', '~/.claude/commands/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-opencode', 'OpenCode', '.opencode/skills/', '~/.opencode/skills/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-gemini', 'Gemini CLI', '.gemini/skills/', '~/.gemini/skills/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-codex', 'Codex', '.codex/skills/', '~/.codex/skills/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-roo', 'Roo Code', '.roo/skills/', '~/.roo/skills/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-trae', 'Trae', '.trae/skills/', '~/.trae/skills/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-qoder', 'Qoder', '.qoder/skills/', '~/.qoder/skills/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-copilot', 'GitHub Copilot', '.github/copilot/', '~/.github/copilot/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-openclaw', 'OpenClaw', '.openclaw/skills/', '~/.openclaw/skills/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-aider', 'Aider', '.aider/skills/', '~/.aider/skills/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-continue', 'Continue', '.continue/skills/', '~/.continue/skills/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-npx', 'Npx Skills', '.agents/skills/', '~/.agents/skills/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),
            ('preset-community', 'Community Standard', '.skills/', '~/.skills/', 1, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z');
        "#,
    )?;

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO config (key, value, updated_at) VALUES ('builtin_presets_initialized', 'true', ?1)",
        rusqlite::params![now],
    )?;

    Ok(())
}
