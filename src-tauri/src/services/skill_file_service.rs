use rusqlite::Connection;

use crate::error::SkillerError;
use crate::services::tag_binding_service::{normalize_tag_bindings_for_skill, resolve_tag_id};

pub fn get_file_skill_tags(
    conn: &Connection,
    skill_path: &str,
) -> Result<Vec<String>, SkillerError> {
    normalize_tag_bindings_for_skill(conn, skill_path)
}

pub fn update_file_skill_tags(
    conn: &Connection,
    skill_path: &str,
    tags: Vec<String>,
) -> Result<(), SkillerError> {
    conn.execute(
        "DELETE FROM skill_tags WHERE skill_id = ?1",
        rusqlite::params![skill_path],
    )?;

    for raw_tag in tags {
        let tag_id = resolve_tag_id(conn, &raw_tag)?;
        conn.execute(
            "INSERT INTO skill_tags (skill_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![skill_path, tag_id],
        )?;
    }

    Ok(())
}
