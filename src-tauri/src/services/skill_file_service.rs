use rusqlite::Connection;

use crate::error::SkillerError;
use crate::services::tag_binding_service::{normalize_tag_bindings_for_skill, resolve_tag_id};

pub fn get_file_skill_tags(
    conn: &Connection,
    skill_path: &str,
) -> Result<Vec<String>, SkillerError> {
    let tags = normalize_tag_bindings_for_skill(conn, skill_path)?;

    if tags.is_empty() {
        if let Some(parent) = std::path::Path::new(skill_path).parent() {
            if let Some(name) = std::path::Path::new(skill_path)
                .file_name()
                .and_then(|n| n.to_str())
            {
                let alt_path = if name.starts_with(".disable.") {
                    let alt_name = name.strip_prefix(".disable.").unwrap_or(name);
                    parent.join(alt_name).to_string_lossy().to_string()
                } else {
                    let alt_name = format!(".disable.{}", name);
                    parent.join(alt_name).to_string_lossy().to_string()
                };

                if alt_path != skill_path {
                    return normalize_tag_bindings_for_skill(conn, &alt_path);
                }
            }
        }
    }

    Ok(tags)
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
