use rusqlite::Connection;

use crate::error::SkillerError;

pub fn normalize_tag_bindings_for_skill(
    conn: &Connection,
    skill_id: &str,
) -> Result<Vec<String>, SkillerError> {
    let mut stmt = conn.prepare("SELECT tag_id FROM skill_tags WHERE skill_id = ?1")?;
    let rows = stmt.query_map(rusqlite::params![skill_id], |row| row.get::<_, String>(0))?;

    let mut normalized = Vec::new();
    for row in rows {
        let raw_value = row?;
        let resolved_id = resolve_tag_id(conn, &raw_value)?;
        normalized.push(resolved_id);
    }

    normalized.sort();
    normalized.dedup();

    conn.execute(
        "DELETE FROM skill_tags WHERE skill_id = ?1",
        rusqlite::params![skill_id],
    )?;

    for tag_id in &normalized {
        conn.execute(
            "INSERT INTO skill_tags (skill_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![skill_id, tag_id],
        )?;
    }

    Ok(normalized)
}

pub fn resolve_tag_id(conn: &Connection, raw_value: &str) -> Result<String, SkillerError> {
    let by_id = conn.query_row(
        "SELECT id FROM tags WHERE id = ?1",
        rusqlite::params![raw_value],
        |row| row.get::<_, String>(0),
    );

    if let Ok(tag_id) = by_id {
        return Ok(tag_id);
    }

    let by_name = conn.query_row(
        "SELECT id FROM tags WHERE name = ?1 ORDER BY created_at ASC LIMIT 1",
        rusqlite::params![raw_value],
        |row| row.get::<_, String>(0),
    );

    if let Ok(tag_id) = by_name {
        return Ok(tag_id);
    }

    Ok(raw_value.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                group_id TEXT NOT NULL,
                parent_id TEXT,
                materialized_path TEXT,
                depth INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE skill_tags (
                skill_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                PRIMARY KEY (skill_id, tag_id)
            );
            "#,
        )
        .unwrap();
        conn
    }

    #[test]
    fn normalizes_legacy_tag_name_rows_to_ids() {
        let conn = setup_conn();
        let skill_id = "/tmp/demo-skill";

        conn.execute(
            "INSERT INTO tags (id, name, group_id, parent_id, materialized_path, depth, created_at, updated_at) VALUES ('tag-1', 'legacy-tag', 'group-1', NULL, 'legacy-tag', 0, 'now', 'now')",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO skill_tags (skill_id, tag_id) VALUES (?1, 'legacy-tag')",
            rusqlite::params![skill_id],
        )
        .unwrap();

        let tags = normalize_tag_bindings_for_skill(&conn, skill_id).unwrap();

        assert_eq!(tags, vec!["tag-1".to_string()]);

        let stored: String = conn
            .query_row(
                "SELECT tag_id FROM skill_tags WHERE skill_id = ?1",
                rusqlite::params![skill_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(stored, "tag-1");
    }
}
